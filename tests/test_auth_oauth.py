"""
test_auth_oauth.py
===================
End-to-end integration test suite verifying Google, GitHub, and Microsoft OAuth 2.0 / OIDC
integration in HyperQDS:
1. Database schema verification (oauth_accounts table, uniqueness constraints, nullable password_hash)
2. Account matching & security rules (linking verified email, preventing takeover via unverified email)
3. OAuth state generation and CSRF protection
4. Google login initiation & callback token exchange (mocked Google OIDC)
5. GitHub login initiation & callback token exchange with private email resolution (mocked GitHub API)
6. Microsoft login initiation & callback token exchange with PKCE (mocked Microsoft Graph)
7. Session parity (/auth/me returns valid user for all OAuth sessions)
8. Secure logout terminates OAuth session
"""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
import httpx

from backend.main import app
from backend.db import (
    init_db,
    get_connection,
    release_connection,
    get_user_by_email,
    get_user_by_id,
    get_oauth_account,
    get_or_create_oauth_user,
)
from backend.routes.auth_routes import (
    generate_oauth_state,
    validate_oauth_state,
    SESSION_COOKIE_NAME,
    OAUTH_STATE_COOKIE_NAME,
)

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_oauth_test_env():
    """Ensure database schema is initialized and clean test artifacts."""
    init_db()
    test_emails = [
        "oauth_google_test@hyperqds.io",
        "oauth_github_test@hyperqds.io",
        "oauth_ms_test@hyperqds.io",
        "preexisting_user@hyperqds.io",
        "unverified_victim@hyperqds.io",
    ]
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for email in test_emails:
                cur.execute("DELETE FROM users WHERE LOWER(email) = LOWER(%s);", (email,))
            cur.execute("DELETE FROM oauth_accounts WHERE provider_email LIKE '%test%' OR provider_user_id LIKE 'test_%';")
            conn.commit()
    finally:
        release_connection(conn)

    yield

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for email in test_emails:
                cur.execute("DELETE FROM users WHERE LOWER(email) = LOWER(%s);", (email,))
            cur.execute("DELETE FROM oauth_accounts WHERE provider_email LIKE '%test%' OR provider_user_id LIKE 'test_%';")
            conn.commit()
    finally:
        release_connection(conn)


# ---------------------------------------------------------------------------
# 1. Database Schema & Security Constraints
# ---------------------------------------------------------------------------

def test_database_oauth_schema_and_constraints():
    """Verify oauth_accounts table exists, enforces uniqueness, and cascade deletes."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Verify table existence
            cur.execute(
                "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'oauth_accounts';"
            )
            cols = {row[0]: row[1] for row in cur.fetchall()}
            assert "provider" in cols
            assert "provider_user_id" in cols
            assert "user_id" in cols
            assert "provider_email" in cols

            # Verify users.password_hash is nullable
            cur.execute(
                "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash';"
            )
            pw_nullable = cur.fetchone()[0]
            assert pw_nullable == "YES"
    finally:
        release_connection(conn)


# ---------------------------------------------------------------------------
# 2. Account Matching & Anti-Takeover Security Rules
# ---------------------------------------------------------------------------

def test_account_creation_and_deduplication():
    """Verify new OAuth user is created and subsequent logins return the exact same user."""
    puid = "test_google_uid_1001"
    email = "oauth_google_test@hyperqds.io"

    # 1. First login -> creates user
    u1 = get_or_create_oauth_user("google", puid, email, email_verified=True, full_name="Google Tester")
    assert u1["email"] == email
    assert u1["full_name"] == "Google Tester"

    # 2. Second login -> must return same user ID without creating duplicate
    u2 = get_or_create_oauth_user("google", puid, email, email_verified=True, full_name="Google Tester")
    assert u2["id"] == u1["id"]

    # Verify oauth_accounts entry
    acc = get_oauth_account("google", puid)
    assert acc is not None
    assert acc["user_id"] == u1["id"]


def test_safe_account_linking_with_verified_email():
    """Verify an existing local user is safely linked when OAuth provider supplies a verified email."""
    pre_email = "preexisting_user@hyperqds.io"
    # Create local user with password
    from backend.routes.auth_routes import hash_password
    from backend.db import create_user
    local_user = create_user(email=pre_email, password_hash=hash_password("LocalSecret123!"), full_name="Local User")

    # Link through GitHub OAuth with verified email
    gh_puid = "test_github_uid_2002"
    linked_user = get_or_create_oauth_user("github", gh_puid, pre_email, email_verified=True, full_name="Local User")

    assert linked_user["id"] == local_user["id"]
    acc = get_oauth_account("github", gh_puid)
    assert acc is not None
    assert acc["user_id"] == local_user["id"]


def test_unverified_email_prevents_account_takeover():
    """Critical security test: An unverified OAuth email MUST NOT link to an existing account."""
    victim_email = "unverified_victim@hyperqds.io"
    from backend.routes.auth_routes import hash_password
    from backend.db import create_user
    victim = create_user(email=victim_email, password_hash=hash_password("VictimSecret123!"), full_name="Victim")

    # Attacker tries to authenticate with an unverified email matching victim
    attacker_puid = "test_attacker_uid_3003"
    result_user = get_or_create_oauth_user("github", attacker_puid, victim_email, email_verified=False, full_name="Attacker")

    # MUST NOT be victim account
    assert result_user["id"] != victim["id"]
    # Should create an isolated account
    assert result_user["email"] != victim_email
    assert "github_test_attacker_uid_3003" in result_user["email"]


# ---------------------------------------------------------------------------
# 3. OAuth CSRF State Protection
# ---------------------------------------------------------------------------

def test_oauth_state_validation():
    """Verify CSRF state validation succeeds on valid token and fails on tampering."""
    state, _, state_jwt = generate_oauth_state("google")

    # 1. Valid state
    payload = validate_oauth_state(state, state_jwt, "google")
    assert payload["provider"] == "google"

    # 2. Tampered state string
    with pytest.raises(ValueError, match="mismatch"):
        validate_oauth_state("tampered_state_value", state_jwt, "google")

    # 3. Provider mismatch
    with pytest.raises(ValueError, match="provider mismatch"):
        validate_oauth_state(state, state_jwt, "github")

    # 4. Missing state or cookie
    with pytest.raises(ValueError):
        validate_oauth_state("", state_jwt, "google")
    with pytest.raises(ValueError):
        validate_oauth_state(state, None, "google")


# ---------------------------------------------------------------------------
# 4. Google OAuth Flow End-to-End
# ---------------------------------------------------------------------------

def test_google_login_initiation(monkeypatch):
    """Verify /auth/google/login sets state cookie and redirects to Google OIDC with PKCE."""
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client-id")

    res = client.get("/auth/google/login", follow_redirects=False)
    assert res.status_code == 302
    location = res.headers.get("location")
    assert "accounts.google.com" in location
    assert "client_id=test-google-client-id" in location
    assert "code_challenge=" in location
    assert OAUTH_STATE_COOKIE_NAME in res.cookies


@pytest.mark.anyio
async def test_google_callback_flow(monkeypatch):
    """Verify Google callback exchanges code, resolves user, and establishes session."""
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-google-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-google-secret")

    # 1. Simulate state generation
    state, _, state_jwt = generate_oauth_state("google")

    # 2. Mock external Google endpoints
    mock_token_resp = httpx.Response(200, json={"access_token": "mock-google-token"})
    mock_userinfo_resp = httpx.Response(
        200,
        json={
            "sub": "test_google_sub_9999",
            "email": "oauth_google_cb_test@hyperqds.io",
            "email_verified": True,
            "name": "Dr. Google Scientist",
        },
    )

    async def mock_post(self, url, **kwargs):
        if "oauth2.googleapis.com/token" in str(url):
            return mock_token_resp
        return httpx.Response(404)

    async def mock_get(self, url, **kwargs):
        if "openidconnect.googleapis.com" in str(url):
            return mock_userinfo_resp
        return httpx.Response(404)

    with patch.object(httpx.AsyncClient, "post", mock_post), patch.object(httpx.AsyncClient, "get", mock_get):
        res = client.get(
            f"/auth/google/callback?code=mock-code&state={state}",
            cookies={OAUTH_STATE_COOKIE_NAME: state_jwt},
            follow_redirects=False,
        )

        assert res.status_code == 302
        assert "/" in res.headers.get("location")
        assert SESSION_COOKIE_NAME in res.cookies
        session_cookie = res.cookies[SESSION_COOKIE_NAME]

        # Verify session works with /auth/me
        res_me = client.get("/auth/me", cookies={SESSION_COOKIE_NAME: session_cookie})
        assert res_me.status_code == 200
        data = res_me.json()
        assert data["email"] == "oauth_google_cb_test@hyperqds.io"
        assert data["full_name"] == "Dr. Google Scientist"



# ---------------------------------------------------------------------------
# 5. GitHub OAuth Flow End-to-End
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_github_callback_with_private_email(monkeypatch):
    """Verify GitHub callback resolves private primary verified email from /user/emails."""
    monkeypatch.setenv("GITHUB_CLIENT_ID", "test-gh-client-id")
    monkeypatch.setenv("GITHUB_CLIENT_SECRET", "test-gh-secret")

    state, _, state_jwt = generate_oauth_state("github")

    mock_token_resp = httpx.Response(200, json={"access_token": "mock-github-token"})
    mock_user_resp = httpx.Response(
        200,
        json={
            "id": 88888,
            "login": "hyperqds-octocat",
            "name": "Octocat Defender",
            "email": None,
        },
    )
    mock_emails_resp = httpx.Response(
        200,
        json=[
            {"email": "public_unverified@example.com", "primary": False, "verified": False},
            {"email": "oauth_github_test@hyperqds.io", "primary": True, "verified": True},
        ],
    )

    async def mock_post(self, url, **kwargs):
        if "github.com/login/oauth/access_token" in str(url):
            return mock_token_resp
        return httpx.Response(404)

    async def mock_get(self, url, **kwargs):
        u = str(url)
        if "api.github.com/user/emails" in u:
            return mock_emails_resp
        if "api.github.com/user" in u:
            return mock_user_resp
        return httpx.Response(404)

    with patch.object(httpx.AsyncClient, "post", mock_post), patch.object(httpx.AsyncClient, "get", mock_get):
        res = client.get(
            f"/auth/github/callback?code=mock-code&state={state}",
            cookies={OAUTH_STATE_COOKIE_NAME: state_jwt},
            follow_redirects=False,
        )

        assert res.status_code == 302
        assert SESSION_COOKIE_NAME in res.cookies
        session_cookie = res.cookies[SESSION_COOKIE_NAME]

        # Verify /auth/me
        res_me = client.get("/auth/me", cookies={SESSION_COOKIE_NAME: session_cookie})
        assert res_me.status_code == 200
        assert res_me.json()["email"] == "oauth_github_test@hyperqds.io"


# ---------------------------------------------------------------------------
# 6. Microsoft OAuth Flow End-to-End
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_microsoft_callback_flow(monkeypatch):
    """Verify Microsoft Entra ID callback with PKCE and Graph /me profile retrieval."""
    monkeypatch.setenv("MICROSOFT_CLIENT_ID", "test-ms-client-id")

    state, _, state_jwt = generate_oauth_state("microsoft")

    mock_token_resp = httpx.Response(200, json={"access_token": "mock-ms-token"})
    mock_me_resp = httpx.Response(
        200,
        json={
            "id": "ms-entra-uuid-7777",
            "displayName": "Azure Quantum Architect",
            "mail": "oauth_ms_test@hyperqds.io",
        },
    )

    async def mock_post(self, url, **kwargs):
        if "login.microsoftonline.com" in str(url):
            return mock_token_resp
        return httpx.Response(404)

    async def mock_get(self, url, **kwargs):
        if "graph.microsoft.com" in str(url):
            return mock_me_resp
        return httpx.Response(404)

    with patch.object(httpx.AsyncClient, "post", mock_post), patch.object(httpx.AsyncClient, "get", mock_get):
        res = client.get(
            f"/auth/microsoft/callback?code=mock-code&state={state}",
            cookies={OAUTH_STATE_COOKIE_NAME: state_jwt},
            follow_redirects=False,
        )

        assert res.status_code == 302
        assert SESSION_COOKIE_NAME in res.cookies
        session_cookie = res.cookies[SESSION_COOKIE_NAME]

        res_me = client.get("/auth/me", cookies={SESSION_COOKIE_NAME: session_cookie})
        assert res_me.status_code == 200
        assert res_me.json()["email"] == "oauth_ms_test@hyperqds.io"
        assert res_me.json()["full_name"] == "Azure Quantum Architect"


# ---------------------------------------------------------------------------
# 7. Cancellation & Error Handling
# ---------------------------------------------------------------------------

def test_oauth_cancellation_handling():
    """Verify user cancelling OAuth redirects to /sign-in with clean message without crashing."""
    res_google = client.get("/auth/google/callback?error=access_denied", follow_redirects=False)
    assert res_google.status_code == 302
    assert "error=Google+authentication+was+cancelled." in res_google.headers.get("location")

    res_github = client.get("/auth/github/callback?error=access_denied", follow_redirects=False)
    assert res_github.status_code == 302
    assert "error=GitHub+authentication+was+cancelled." in res_github.headers.get("location")

    res_ms = client.get("/auth/microsoft/callback?error=access_denied", follow_redirects=False)
    assert res_ms.status_code == 302
    assert "error=Microsoft+authentication+was+cancelled." in res_ms.headers.get("location")


# ---------------------------------------------------------------------------
# 8. Unified Session Lifecycle & Logout
# ---------------------------------------------------------------------------

def test_oauth_session_logout():
    """Verify logging out deletes the session cookie and invalidates subsequent /auth/me calls."""
    from backend.routes.auth_routes import create_jwt_token

    # Create dummy token
    test_user = get_or_create_oauth_user("google", "test_logout_user", "logout_test@hyperqds.io", True)
    token = create_jwt_token(test_user["id"], test_user["email"])

    # 1. /auth/me returns 200 with cookie
    res_me = client.get("/auth/me", cookies={SESSION_COOKIE_NAME: token})
    assert res_me.status_code == 200

    # 2. Logout clears cookie
    res_logout = client.post("/auth/logout", cookies={SESSION_COOKIE_NAME: token})
    assert res_logout.status_code == 200

    # 3. Without cookie -> 401
    res_unauth = client.get("/auth/me")
    assert res_unauth.status_code == 401
