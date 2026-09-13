# QDS Threat Detection Framework - PowerShell Launcher
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$env:OPENBLAS_NUM_THREADS = "1"
$env:MKL_NUM_THREADS = "1"
$env:OMP_NUM_THREADS = "1"
$env:NUMEXPR_NUM_THREADS = "1"
$env:VECLIB_MAXIMUM_THREADS = "1"

if (Get-Command python -ErrorAction SilentlyContinue) {
    python "$ScriptDir\start.py" @args
} else {
    Write-Error "Python was not found in PATH. Please install Python 3.11+."
}
