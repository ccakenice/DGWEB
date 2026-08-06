# DGWEB Project Deploy Script (v3 - reads local config)
# Place this file in project root (alongside index.html)
# Requires: deploy-config.json in same directory

param(
    [string]$ConfigPath = ""
)

# ---------- load config ----------
if (-not $ConfigPath) { $ConfigPath = Join-Path $PSScriptRoot "deploy-config.json" }
if (-not (Test-Path $ConfigPath)) {
    Write-Host "Config not found: $ConfigPath" -ForegroundColor Red
    exit 1
}
$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json

$srcFile      = Join-Path $PSScriptRoot $cfg.sourceFile
$backupDir    = $cfg.backupDir
$githubToken  = $cfg.githubToken
$githubOwner  = $cfg.githubOwner
$githubRepo   = $cfg.githubRepo
$repoPath     = $cfg.repoPath  # e.g. "index.html" or "docs/index.html"

# ---------- validation ----------
if (-not (Test-Path $srcFile)) {
    Write-Host "Source not found: $srcFile" -ForegroundColor Red
    exit 1
}
if (-not $githubToken -or -not $githubOwner -or -not $githubRepo) {
    Write-Host "Missing GitHub config in $ConfigPath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }

# ---------- 1. backup ----------
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$bkName = "${cfg.sourceFile}_v${ts}"
$bkPath = Join-Path $backupDir $bkName
Copy-Item $srcFile $bkPath -Force
Write-Host "[backup] saved: $bkPath" -ForegroundColor Green

# keep latest 30
Get-ChildItem $backupDir -Filter "${cfg.sourceFile}_v*.html" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 30 |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "[clean] $($_.Name)" -ForegroundColor DarkGray }

# ---------- 2. upload to GitHub ----------
$bytes = [IO.File]::ReadAllBytes($srcFile)
$b64   = [Convert]::ToBase64String($bytes)
$headers = @{
    "Authorization" = "token $githubToken"
    "Accept"        = "application/vnd.github+json"
    "User-Agent"    = "dgweb-deploy"
}
$apiUrl = "https://api.github.com/repos/$githubOwner/$githubRepo/contents/$repoPath"

# get existing sha
$sha = $null
try {
    $resp = Invoke-RestMethod -Uri $apiUrl -Headers $headers -TimeoutSec 25
    $sha = $resp.sha
    Write-Host "[github] existing sha: $($sha.Substring(0,10))..." -ForegroundColor Cyan
} catch {
    Write-Host "[github] no existing file, will create new" -ForegroundColor Yellow
}

# upload
$bodyObj = @{ message = "chore: update site ${ts}"; content = $b64 }
if ($sha) { $bodyObj.sha = $sha }
$body = $bodyObj | ConvertTo-Json -Compress
try {
    $resp2 = Invoke-RestMethod -Uri $apiUrl -Method Put -Headers $headers -Body $body -ContentType "application/json" -TimeoutSec 30
    Write-Host "[deploy] upload OK, Pages auto-rebuild triggered" -ForegroundColor Green
    Write-Host "[deploy] commit: $($resp2.commit.html_url)" -ForegroundColor Cyan
} catch {
    Write-Host "[deploy] upload failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Done. Backup: $bkName" -ForegroundColor Green