"""
env_loader.py
=============
Safe, multi-path environment variable loader for HyperQDS.
Locates and loads `.env` regardless of whether the FastAPI backend is launched from:
- Project root (e.g., Hackheritage4/)
- Repository directory (e.g., HackHeritage-/)
- Direct python -m uvicorn backend.main:app
- Automated test runners / CI

Provides safe diagnostic checks without exposing secret credentials.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

# Prevent OpenBLAS / SciPy thread allocation abort crashes on Windows
for _blas_var in ("OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "OMP_NUM_THREADS", "NUMEXPR_NUM_THREADS", "VECLIB_MAXIMUM_THREADS"):
    os.environ.setdefault(_blas_var, "1")

logger = logging.getLogger(__name__)

_LOADED_ENV_PATH: Optional[Path] = None


def find_env_file() -> Optional[Path]:
    """Search candidate directories for the real .env file."""
    base_dir = Path(__file__).resolve().parent  # backend/
    candidates = [
        base_dir.parent / ".env",                  # HackHeritage-/.env
        base_dir.parent.parent / ".env",           # Hackheritage4/.env
        Path.cwd() / ".env",                       # Current working directory .env
        Path.cwd() / "HackHeritage-" / ".env",     # CWD/HackHeritage-/.env
    ]

    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    return None


def _parse_env_line(line: str) -> Optional[tuple[str, str]]:
    """Parse a single key=value line with quote stripping and comment stripping."""
    clean = line.strip()
    if not clean or clean.startswith("#"):
        return None

    if "=" not in clean:
        return None

    key, val = clean.split("=", 1)
    key = key.strip()
    val = val.strip()

    # Strip surrounding single or double quotes
    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
        val = val[1:-1]
    else:
        # Strip inline comments for unquoted values
        if " #" in val:
            val = val.split(" #", 1)[0].strip()

    return key, val


def load_environment(override: bool = False) -> Optional[Path]:
    """Load .env file into os.environ with fallback manual parser if dotenv is unavailable."""
    global _LOADED_ENV_PATH

    env_path = find_env_file()
    if not env_path:
        logger.warning("No .env file found in candidate locations.")
        return None

    # 1. Try python-dotenv first
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=str(env_path), override=override)
        _LOADED_ENV_PATH = env_path
        logger.info("Loaded environment variables from %s via python-dotenv.", env_path)
    except Exception as exc:
        logger.debug("python-dotenv failed (%s), falling back to native parser.", exc)

    # 2. Native fallback parser to guarantee values are populated in os.environ
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                pair = _parse_env_line(line)
                if pair:
                    k, v = pair
                    if override or k not in os.environ:
                        os.environ[k] = v
        _LOADED_ENV_PATH = env_path
    except Exception as exc:
        logger.error("Failed to read .env file at %s: %s", env_path, exc)

    # Normalize localhost redirect URIs for plain HTTP development
    is_ssl = os.environ.get("ENABLE_SSL", "").lower() in ("true", "1") or os.environ.get("HTTPS", "").lower() in ("true", "1")
    if not is_ssl:
        for uri_key in ("GOOGLE_REDIRECT_URI", "GITHUB_REDIRECT_URI", "MICROSOFT_REDIRECT_URI"):
            val = os.environ.get(uri_key, "")
            if val.startswith("https://localhost:") or val.startswith("https://127.0.0.1:"):
                os.environ[uri_key] = "http://" + val[8:]
                logger.warning("Normalized %s from https:// to http:// for plain HTTP development.", uri_key)
            elif val.startswith("https://localhost/") or val.startswith("https://127.0.0.1/"):
                os.environ[uri_key] = "http://" + val[8:]
                logger.warning("Normalized %s from https:// to http:// for plain HTTP development.", uri_key)

    # Safe startup diagnostics (NEVER log secret values)
    google_configured = bool(os.environ.get("GOOGLE_CLIENT_ID", "").strip())
    github_configured = bool(os.environ.get("GITHUB_CLIENT_ID", "").strip())
    microsoft_configured = bool(os.environ.get("MICROSOFT_CLIENT_ID", "").strip())

    logger.info(
        "OAuth Configuration Status: Google=%s, GitHub=%s, Microsoft=%s",
        google_configured,
        github_configured,
        microsoft_configured,
    )

    return _LOADED_ENV_PATH


# Execute load immediately when module is imported
load_environment()
