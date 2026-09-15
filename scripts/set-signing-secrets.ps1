# Set Tauri updater signing secrets for GitHub Actions
#
# Prerequisites: GitHub CLI (`gh`) authenticated with repo admin access.
# Run from repo root:
#   pwsh scripts/set-signing-secrets.ps1
#
# This reads src-tauri/updater.key (gitignored) and does not print it.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$keyPath = Join-Path $root "src-tauri\updater.key"

if (-not (Test-Path $keyPath)) {
  throw "Missing $keyPath — generate with: pnpm tauri signer generate -w src-tauri/updater.key -f --ci -p `"your-password`""
}

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  throw "GitHub CLI (gh) not found. Install from https://cli.github.com/ then run: gh auth login"
}

Push-Location $root
try {
  $password = Read-Host "TAURI_SIGNING_PRIVATE_KEY_PASSWORD (same as used when generating the key)"
  Get-Content -Raw $keyPath | gh secret set TAURI_SIGNING_PRIVATE_KEY --repo devnguyen0111/DN-Assistants
  if ($password) {
    $password | gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo devnguyen0111/DN-Assistants
  } else {
    Write-Host "Skipping password secret (empty). Delete TAURI_SIGNING_PRIVATE_KEY_PASSWORD in GitHub if it still exists."
  }
  Write-Host "Secrets updated. Re-run the Release workflow or move tag v0.1.1 to HEAD and push."
}
finally {
  Pop-Location
}
