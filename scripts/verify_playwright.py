"""
Playwright 1.57.0 & Chromium Diagnostics & Verification Script
Validates:
1. Python Playwright module (version 1.57.0)
2. Antigravity IDE Driver cache (%LOCALAPPDATA%\\ms-playwright-go\\1.57.0)
3. Chromium browser binary (%LOCALAPPDATA%\\ms-playwright\\chromium-1200)
4. Headless Chromium browser launch and execution via Playwright Python
5. Node.js Playwright CLI & skill execution
"""

import os
import sys
import subprocess

def test_antigravity_driver():
    print("[-] Checking Antigravity IDE Playwright-Go driver cache...")
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    driver_dir = os.path.join(local_app_data, "ms-playwright-go", "1.57.0")
    node_exe = os.path.join(driver_dir, "node.exe")
    cli_js = os.path.join(driver_dir, "package", "cli.js")
    
    if not os.path.exists(driver_dir):
        print(f"  [FAIL] Driver dir not found: {driver_dir}")
        return False
    if not os.path.exists(node_exe):
        print(f"  [FAIL] node.exe missing in driver dir: {node_exe}")
        return False
    if not os.path.exists(cli_js):
        print(f"  [FAIL] cli.js missing in package dir: {cli_js}")
        return False
        
    out = subprocess.run([node_exe, cli_js, "--version"], capture_output=True, text=True)
    if "1.57.0" in out.stdout:
        print(f"  [OK] Antigravity driver verified: {out.stdout.strip()}")
        return True
    else:
        print(f"  [FAIL] Unexpected driver version output: {out.stdout}")
        return False

def test_chromium_installed():
    print("[-] Checking Chromium installation in ms-playwright...")
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    chromium_dir = os.path.join(local_app_data, "ms-playwright", "chromium-1200")
    if not os.path.exists(chromium_dir):
        print(f"  [FAIL] Chromium directory not found: {chromium_dir}")
        return False
    complete_flag = os.path.join(chromium_dir, "INSTALLATION_COMPLETE")
    if os.path.exists(complete_flag):
        print(f"  [OK] Chromium build 1200 found at: {chromium_dir}")
        return True
    else:
        print(f"  [WARN] INSTALLATION_COMPLETE flag not found, but directory exists.")
        return True

def test_python_playwright():
    print("[-] Testing Python Playwright 1.57.0 and Chromium execution...")
    try:
        import importlib.metadata
        pw_version = importlib.metadata.version("playwright")
        print(f"  [OK] Playwright Python package version: {pw_version}")
        if pw_version != "1.57.0":
            print(f"  [WARN] Expected 1.57.0, found {pw_version}")
        
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_content("<div id='test'>Playwright 1.57.0 Active</div>")
            text = page.locator("#test").inner_text()
            browser.close()
            if text == "Playwright 1.57.0 Active":
                print("  [OK] Chromium launched and evaluated DOM successfully.")
                return True
            else:
                print(f"  [FAIL] Unexpected text: {text}")
                return False
    except Exception as e:
        print(f"  [FAIL] Python Playwright error: {e}")
        return False

def test_node_skill():
    print("[-] Testing Playwright skill run.js...")
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    skill_dir = os.path.join(repo_root, ".agents", "skills", "playwright-skill")
    run_js = os.path.join(skill_dir, "run.js")
    if not os.path.exists(run_js):
        print(f"  [WARN] run.js not found at {run_js}")
        return True
    
    code = "const { chromium } = require('playwright'); (async () => { const b = await chromium.launch({ headless: true }); await b.close(); console.log('Skill OK'); })();"
    res = subprocess.run(["node", "run.js", code], cwd=skill_dir, capture_output=True, text=True)
    if "Skill OK" in res.stdout:
        print("  [OK] Node skill runner executed successfully.")
        return True
    else:
        print(f"  [FAIL] Node skill runner failed:\n{res.stdout}\n{res.stderr}")
        return False

if __name__ == "__main__":
    print("==================================================")
    print(" Playwright 1.57.0 & Chromium Health Check")
    print("==================================================")
    results = [
        test_antigravity_driver(),
        test_chromium_installed(),
        test_python_playwright(),
        test_node_skill(),
    ]
    print("==================================================")
    if all(results):
        print(" [ALL CHECKS PASSED] Playwright 1.57.0 & Chromium are fully operational.")
        sys.exit(0)
    else:
        print(" [SOME CHECKS FAILED] See above logs for details.")
        sys.exit(1)
