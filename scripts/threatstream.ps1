<#
.SYNOPSIS
Starts the ThreatStream backend, frontend, and durable scan worker.

.DESCRIPTION
Run this script from any directory. It resolves the repository relative to the
script, opens each server in its own interactive PowerShell window, and does not
print or rewrite environment configuration or stop existing processes.

.PARAMETER NoBrowser
Do not open the local frontend URL after starting the servers.

.EXAMPLE
.\scripts\threatstream.ps1

.EXAMPLE
.\scripts\threatstream.ps1 -NoBrowser
#>
[CmdletBinding()]
param(
    [switch]$NoBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repository = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $repository 'backend'

if (-not (Test-Path -LiteralPath (Join-Path $repository 'package.json'))) {
    throw "ThreatStream package.json was not found at $repository"
}
if (-not (Test-Path -LiteralPath (Join-Path $backend 'app'))) {
    throw "ThreatStream backend was not found at $backend"
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'npm.cmd was not found on PATH.'
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw 'python was not found on PATH.'
}

function ConvertTo-PowerShellLiteral([string]$Value) {
    return "'" + $Value.Replace("'", "''") + "'"
}

$backendLiteral = ConvertTo-PowerShellLiteral $backend
$repositoryLiteral = ConvertTo-PowerShellLiteral $repository
$activate = Join-Path $backend '.venv\Scripts\Activate.ps1'
$activateLiteral = ConvertTo-PowerShellLiteral $activate

$backendCommand = "Set-Location -LiteralPath $backendLiteral; if (Test-Path -LiteralPath $activateLiteral) { & $activateLiteral }; python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
$frontendCommand = "Set-Location -LiteralPath $repositoryLiteral; npm run dev -- --host 127.0.0.1 --port 5173"
$workerCommand = "Set-Location -LiteralPath $backendLiteral; if (Test-Path -LiteralPath $activateLiteral) { & $activateLiteral }; python -m app.workers.scan_worker"

Start-Process -FilePath 'powershell.exe' -WorkingDirectory $backend -ArgumentList @('-NoExit', '-NoProfile', '-Command', $backendCommand)
Start-Process -FilePath 'powershell.exe' -WorkingDirectory $repository -ArgumentList @('-NoExit', '-NoProfile', '-Command', $frontendCommand)
$existingWorker = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*python -m app.workers.scan_worker*' }
if ($existingWorker) {
    Write-Warning 'A ThreatStream scan worker already appears to be running; no duplicate worker was started.'
} else {
    Start-Process -FilePath 'powershell.exe' -WorkingDirectory $backend -ArgumentList @('-NoExit', '-NoProfile', '-Command', $workerCommand)
}

if (-not $NoBrowser) {
    Start-Process 'http://127.0.0.1:5173'
}
