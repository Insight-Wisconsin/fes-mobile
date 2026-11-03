# FESMobile setup script (Windows PowerShell).
#
# Verifies the tools that must be installed by hand, then installs the npm
# dependencies for the Expo app.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1

$Missing = 0

function Write-Ok   { param($m) Write-Host "  [ok]      $m" -ForegroundColor Green }
function Write-Note { param($m) Write-Host "  [note]    $m" -ForegroundColor Yellow }
function Write-Head { param($m) Write-Host ''; Write-Host $m -ForegroundColor White }
function Write-Fail {
    param($m)
    Write-Host "  [MISSING] $m" -ForegroundColor Red
    $script:Missing = $script:Missing + 1
}

# ---------- locate the repo root -----------------------------------------
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host 'FESMobile setup'
Write-Host "repo: $RepoRoot"

# ---------- 1. required tools --------------------------------------------
Write-Head 'Checking required tools'

# --- Node.js ---
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $nodeVersion = (& node -v)
    # React Native 0.86 requires ^20.19.4 || ^22.13.0 || ^24.3.0 || >=25.
    # Compared here in PowerShell: passing JS to `node -e` loses embedded quotes.
    $parts = ($nodeVersion -replace '^v', '').Split('.')
    $maj = [int]($parts[0] -replace '\D.*$', '')
    $min = [int]($parts[1] -replace '\D.*$', '')
    $pat = [int]($parts[2] -replace '\D.*$', '')
    $nodeOk = ($maj -eq 20 -and ($min -gt 19 -or ($min -eq 19 -and $pat -ge 4))) -or
              ($maj -eq 22 -and $min -ge 13) -or
              ($maj -eq 24 -and $min -ge 3) -or
              ($maj -ge 25)
    if ($nodeOk) {
        Write-Ok "Node.js $nodeVersion"
    } else {
        Write-Fail "Node.js $nodeVersion is too old or an unsupported odd-numbered release."
        Write-Host '            Need 20.19.4+, 22.13+, 24.3+ or 25+. Download the LTS build:'
        Write-Host '            https://nodejs.org/en/download'
    }
} else {
    Write-Fail 'Node.js is not installed.'
    Write-Host '            Download the LTS build: https://nodejs.org/en/download'
}

# --- npm ---
# Prefer the .cmd shims: npm.ps1 / npx.ps1 drop the first character of
# positional arguments in some PowerShell setups ("ci" arrives as "i").
$NpmExe = $null
foreach ($candidate in @('npm.cmd', 'npm')) {
    $found = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($found) { $NpmExe = $found.Source; break }
}
$NpxExe = $null
foreach ($candidate in @('npx.cmd', 'npx')) {
    $found = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($found) { $NpxExe = $found.Source; break }
}

if ($NpmExe) {
    Write-Ok "npm $(& $NpmExe -v)"
} else {
    Write-Fail 'npm is not installed (it normally ships with Node.js).'
    Write-Host '            Reinstall Node.js from https://nodejs.org/en/download'
}

# --- git ---
if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Ok "$(& git --version)"
} else {
    Write-Fail 'Git is not installed.'
    Write-Host '            Download it: https://git-scm.com/downloads'
}

# ---------- 2. iPhone builds ---------------------------------------------
Write-Head 'iPhone builds'
Write-Note 'Building the FES app onto an iPhone needs Xcode, which only runs on macOS.'
Write-Host '            You install it once from a Mac teammate (or the cloud, later),'
Write-Host '            then develop from this PC. See the steps at the end.'

# ---------- 3. stop if anything required is missing -----------------------
if ($Missing -gt 0) {
    Write-Host ''
    Write-Host "==> Setup stopped: $Missing required tool(s) missing." -ForegroundColor Red
    Write-Host 'Install the program(s) listed above, reopen your terminal, then run this script again.'
    exit 1
}

# ---------- 4. install dependencies --------------------------------------
if (-not (Test-Path 'package.json')) {
    Write-Host ''
    Write-Host "==> No package.json found in $RepoRoot" -ForegroundColor Red
    Write-Host 'Run this script from inside a clone of the FESMobile repository.'
    exit 1
}

Write-Head 'Installing npm dependencies'

$installed = $false
if (Test-Path 'package-lock.json') {
    # npm ci is reproducible, but fails if the lockfile drifts from package.json.
    & $NpmExe ci
    if ($LASTEXITCODE -eq 0) { $installed = $true }
    else { Write-Host 'npm ci failed, falling back to npm install...' -ForegroundColor Yellow }
}

if (-not $installed) {
    & $NpmExe install
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host '==> npm install failed.' -ForegroundColor Red
        exit 1
    }
}

# ---------- 5. verify ------------------------------------------------------
Write-Head 'Verifying the project'
if ($NpxExe) {
    & $NpxExe expo-doctor
    if ($LASTEXITCODE -ne 0) { Write-Note 'expo-doctor reported issues (see above).' }
}

# ---------- 6. next steps --------------------------------------------------
@'

==> Setup complete. You can edit and run the app from this PC.

The FES app gets onto your iPhone once (iPhone needs iOS 16.4 or newer):

  - Now:   plug your iPhone into a Mac teammate's Mac. They run:
             rm -rf ios
             npm run ios:device
  - Later: once the team's paid/UW Apple account is set up, run from here:
             npm run ios:register     (once per iPhone)
             npm run ios:build

After that, develop entirely from this PC:

  npm start                then scan the QR code with the iPhone Camera app

  - Windows Firewall: when asked about Node.js, allow it on Private networks.
  - If the iPhone can't reach this PC (common on campus Wi-Fi):
      npm run start:tunnel

UI-only preview without Bluetooth, using the Expo Go app:
  npx expo login       (once; sign in to Expo Go with the same account)
  npm run start:go
'@ | Write-Host
