"""
start.py
========
Unified launcher for the Quantum-Inspired Cyber Threat Detection Framework.
Orchestrates:
  1. FastAPI backend (port 8000)
  2. React + Vite dashboard (port 5173)

Features:
  - Pre-flight port availability & cleanup
  - Dependency & node_modules validation (auto npm install if needed)
  - Automatic .env setup from .env.example
  - Real-time health check polling (/health)
  - Automatic browser launch once services are ready
  - Graceful teardown of all child processes on Ctrl+C or exit
"""

from __future__ import annotations

import os
import sys
import time
import shutil
import signal
import socket
import urllib.request
import webbrowser
import subprocess
from pathlib import Path

# Set BLAS/OpenBLAS thread limits to avoid Windows thread memory allocation aborts
for _var in ("OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "OMP_NUM_THREADS", "NUMEXPR_NUM_THREADS", "VECLIB_MAXIMUM_THREADS"):
    os.environ[_var] = "1"

# ANSI colors for beautiful terminal output
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Windows color support
if sys.platform == "win32":
    try:
        os.system("color")
    except Exception:
        pass


def log_info(msg: str) -> None:
    print(f"{CYAN}[INFO]{RESET} {msg}")


def log_success(msg: str) -> None:
    print(f"{GREEN}[OK]{RESET}   {msg}")


def log_warning(msg: str) -> None:
    print(f"{YELLOW}[WARN]{RESET} {msg}")


def log_error(msg: str) -> None:
    print(f"{RED}[ERR]{RESET}  {msg}")


def get_project_root() -> Path:
    """Resolve the project root containing backend/ and dashboard/."""
    current = Path(__file__).resolve().parent
    if (current / "backend" / "main.py").exists() and (current / "dashboard").exists():
        return current
    if (current / "HackHeritage-" / "backend" / "main.py").exists():
        return current / "HackHeritage-"
    return current


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def kill_process_on_port(port: int) -> None:
    """Find and kill any process listening on the given port on Windows/Unix."""
    if sys.platform == "win32":
        try:
            cmd = f"netstat -ano | findstr :{port}"
            output = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
            pids = set()
            for line in output.strip().splitlines():
                parts = line.strip().split()
                if len(parts) >= 5 and "LISTENING" in line:
                    pids.add(parts[-1])
            for pid in pids:
                if pid and pid != "0":
                    log_warning(f"Terminating conflicting process on port {port} (PID {pid})...")
                    subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, capture_output=True)
        except Exception:
            pass
    else:
        try:
            cmd = f"lsof -ti :{port}"
            output = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
            for pid in output.strip().splitlines():
                if pid:
                    subprocess.run(["kill", "-9", pid], capture_output=True)
        except Exception:
            pass


def ensure_env_file(project_root: Path) -> None:
    env_file = project_root / ".env"
    env_example = project_root / ".env.example"
    if not env_file.exists() and env_example.exists():
        log_info("Creating .env file from .env.example...")
        shutil.copy(env_example, env_file)
        log_success(".env created successfully.")


def ensure_frontend_deps(dashboard_dir: Path) -> None:
    node_modules = dashboard_dir / "node_modules"
    if not node_modules.exists():
        log_warning("Dashboard node_modules not found. Running 'npm install'...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        res = subprocess.run([npm_cmd, "install"], cwd=str(dashboard_dir), shell=(sys.platform == "win32"))
        if res.returncode != 0:
            log_error("npm install failed. Please check your Node/npm setup.")
            sys.exit(1)
        log_success("npm install completed successfully.")


def poll_http(url: str, timeout_seconds: int = 40) -> bool:
    """Poll an HTTP endpoint until it returns a 200 response."""
    start_time = time.time()
    while time.time() - start_time < timeout_seconds:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "QDS-Launcher"})
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False


def main() -> None:
    project_root = get_project_root()
    dashboard_dir = project_root / "dashboard"

    print("\n" + "=" * 70)
    print(f"{BOLD}{CYAN}  Quantum-Inspired Cyber Threat Detection Framework (QDS){RESET}")
    print(f"  Unified Launcher | Root: {project_root}")
    print("=" * 70 + "\n")

    # 1. Environment & Pre-flight
    ensure_env_file(project_root)
    ensure_frontend_deps(dashboard_dir)

    # Load environment variables into launcher process
    env_file = project_root / ".env"
    if env_file.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(str(env_file))
        except Exception:
            pass

    # Database Pre-flight Verification
    try:
        if str(project_root) not in sys.path:
            sys.path.insert(0, str(project_root))
        from backend.db import check_db_connection, init_db
        init_db()
        db_info = check_db_connection()
        if db_info.get("status") == "connected":
            log_success(
                f"PostgreSQL database '{db_info.get('database')}' linked on "
                f"{db_info.get('host')}:{db_info.get('port')} "
                f"({db_info.get('latency_ms')}ms latency | {db_info.get('counts', {}).get('audit_records', 0)} audit records, "
                f"{db_info.get('counts', {}).get('users', 0)} users)."
            )
        else:
            log_warning(f"PostgreSQL check note: {db_info.get('error')}. Running with fallback mode.")
    except Exception as exc:
        log_warning(f"Database pre-flight check warning: {exc}")

    # 2. Check and clean ports
    for port in (8000, 5173):
        if is_port_in_use(port):
            log_warning(f"Port {port} is already in use. Cleaning up stale process...")
            kill_process_on_port(port)
            time.sleep(1)

    # 3. Start Backend
    log_info("Launching FastAPI Backend (port 8000)...")
    backend_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        os.environ.get("BACKEND_HOST", "0.0.0.0"),
        "--port",
        os.environ.get("BACKEND_PORT", "8000"),
        "--reload",
    ]
    if env_file.exists():
        backend_cmd.extend(["--env-file", str(env_file)])

    backend_env = os.environ.copy()
    backend_process = subprocess.Popen(
        backend_cmd,
        cwd=str(project_root),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=backend_env,
    )

    # 4. Start Frontend
    use_preview = "--preview" in sys.argv or "--prod" in sys.argv
    mode_name = "Preview (Production Build)" if use_preview else "Vite Dev"
    log_info(f"Launching React + Vite Dashboard ({mode_name} on port 5173)...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_cmd = [npm_cmd, "run", "preview" if use_preview else "dev"]

    frontend_process = subprocess.Popen(
        frontend_cmd,
        cwd=str(dashboard_dir),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=(sys.platform == "win32"),
    )

    # Helper cleanup handler
    def cleanup_and_exit(signum=None, frame=None):
        print(f"\n{YELLOW}[SHUTDOWN]{RESET} Stopping QDS services...")
        try:
            if sys.platform == "win32":
                if backend_process.pid:
                    subprocess.run(f"taskkill /F /T /PID {backend_process.pid}", shell=True, capture_output=True)
                if frontend_process.pid:
                    subprocess.run(f"taskkill /F /T /PID {frontend_process.pid}", shell=True, capture_output=True)
                # Final safety check on ports
                kill_process_on_port(8000)
                kill_process_on_port(5173)
            else:
                backend_process.terminate()
                frontend_process.terminate()
        except Exception:
            pass
        log_success("All services stopped. Goodbye!")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup_and_exit)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, cleanup_and_exit)

    # 5. Wait for Backend Health
    log_info("Waiting for Backend health check at http://127.0.0.1:8000/health ...")
    backend_ready = poll_http("http://127.0.0.1:8000/health", timeout_seconds=45)

    if not backend_ready:
        log_error("Backend failed to start or did not become healthy within 45s.")
        stderr = backend_process.stderr.read().decode("utf-8", errors="ignore") if backend_process.stderr else ""
        if stderr:
            print(f"{RED}{stderr}{RESET}")
        cleanup_and_exit()

    log_success("Backend is healthy and listening on port 8000.")

    # 6. Wait for Frontend
    log_info("Waiting for Dashboard at http://localhost:5173 ...")
    frontend_ready = False
    for _ in range(15):
        if is_port_in_use(5173):
            frontend_ready = True
            break
        time.sleep(1)

    if frontend_ready:
        log_success("React Dashboard is running on port 5173.")
    else:
        log_warning("Dashboard port 5173 check timed out, but Vite may still be warming up.")

    # 7. Success Banner & URL Summary
    dashboard_url = "http://localhost:5173"
    docs_url = "http://127.0.0.1:8000/docs"
    health_url = "http://127.0.0.1:8000/health"

    print("\n" + "=" * 70)
    print(f"{GREEN}{BOLD}  >>> ALL SERVICES ARE UP AND RUNNING! <<<{RESET}")
    print("=" * 70)
    print(f"  * {BOLD}React Dashboard:{RESET}    {CYAN}{dashboard_url}{RESET}")
    print(f"  * {BOLD}FastAPI Docs:{RESET}       {CYAN}{docs_url}{RESET}")
    print(f"  * {BOLD}Health Probe:{RESET}       {CYAN}{health_url}{RESET}")
    print("=" * 70)
    print(f"  {YELLOW}Press Ctrl+C at any time to shut down all services.{RESET}\n")

    # 8. Open default browser
    try:
        webbrowser.open(dashboard_url)
        log_info("Opened dashboard in default browser.")
    except Exception:
        pass

    # 9. Supervise loop
    try:
        while True:
            # Check if backend unexpectedly died
            if backend_process.poll() is not None:
                log_error("Backend process terminated unexpectedly!")
                stderr = backend_process.stderr.read().decode("utf-8", errors="ignore") if backend_process.stderr else ""
                if stderr:
                    print(f"{RED}{stderr}{RESET}")
                break

            # Check if frontend unexpectedly died
            if frontend_process.poll() is not None:
                log_error("Frontend process terminated unexpectedly!")
                stderr = frontend_process.stderr.read().decode("utf-8", errors="ignore") if frontend_process.stderr else ""
                if stderr:
                    print(f"{RED}{stderr}{RESET}")
                break

            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup_and_exit()


if __name__ == "__main__":
    main()
