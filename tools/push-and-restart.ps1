\
param(
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

function Info($m) { Write-Host "==> $m" -ForegroundColor Cyan }

try {
  Info "Git push..."
  git push -u origin $Branch --tags

  Info "Killing node processes (if any)..."
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

  Info "Removing node_modules..."
  Remove-Item -Recurse -Force ".\node_modules" -ErrorAction SilentlyContinue

  Info "npm install..."
  npm i

  Info "npm run build..."
  npm run build

  Info "Starting app..."
  npm start
}
catch {
  Write-Error "❌ Failed: $($_.Exception.Message)"
  exit 1
}
