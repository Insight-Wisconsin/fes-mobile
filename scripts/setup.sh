#!/usr/bin/env bash
#
# FESMobile setup script (macOS / Linux / Git Bash on Windows).
#
# Verifies the tools that must be installed by hand, then installs the npm
# dependencies. On a Mac it also checks the iPhone build toolchain (Xcode,
# CocoaPods) and creates your personal .env.local.
#
# Usage:  bash scripts/setup.sh
#
set -uo pipefail

MISSING=0
IS_MAC=0
[ "$(uname -s 2>/dev/null)" = "Darwin" ] && IS_MAC=1

# ---------- pretty output -------------------------------------------------
if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; BOLD=""; RESET=""
fi

ok()    { printf "  %s[ok]%s   %s\n"   "$GREEN"  "$RESET" "$1"; }
fail()  { printf "  %s[MISSING]%s %s\n" "$RED"   "$RESET" "$1"; MISSING=$((MISSING + 1)); }
warn()  { printf "  %s[note]%s %s\n"   "$YELLOW" "$RESET" "$1"; }
head2() { printf "\n%s%s%s\n" "$BOLD" "$1" "$RESET"; }

# ---------- locate the repo root -----------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT" || exit 1

printf "%sFESMobile setup%s\n" "$BOLD" "$RESET"
printf "repo: %s\n" "$REPO_ROOT"

# ---------- 1. required tools --------------------------------------------
head2 "Checking required tools"

# --- Node.js ---
if command -v node > /dev/null 2>&1; then
  NODE_VERSION="$(node -v)"
  # React Native 0.86 requires ^20.19.4 || ^22.13.0 || ^24.3.0 || >=25
  if node -e 'const v=process.versions.node.split(".").map(Number);
const ok=(v[0]===20&&(v[1]>19||(v[1]===19&&v[2]>=4)))||(v[0]===22&&v[1]>=13)||(v[0]===24&&v[1]>=3)||v[0]>=25;
process.exit(ok?0:1);' 2>/dev/null; then
    ok "Node.js $NODE_VERSION"
  else
    fail "Node.js $NODE_VERSION is too old or an unsupported odd-numbered release."
    printf "           Need 20.19.4+, 22.13+, 24.3+ or 25+. Download the LTS build:\n"
    printf "           https://nodejs.org/en/download\n"
  fi
else
  fail "Node.js is not installed."
  printf "           Download the LTS build: https://nodejs.org/en/download\n"
fi

# --- npm ---
if command -v npm > /dev/null 2>&1; then
  ok "npm $(npm -v)"
else
  fail "npm is not installed (it normally ships with Node.js)."
  printf "           Reinstall Node.js from https://nodejs.org/en/download\n"
fi

# --- git ---
if command -v git > /dev/null 2>&1; then
  ok "$(git --version)"
else
  fail "Git is not installed."
  printf "           Download it: https://git-scm.com/downloads\n"
fi

# ---------- 2. iPhone build toolchain (macOS only) -------------------------
if [ "$IS_MAC" -eq 1 ]; then
  head2 "Checking the iPhone build toolchain"

  # --- Xcode ---
  # `xcodebuild -version` fails when only the Command Line Tools are selected,
  # or when the Xcode license has not been accepted yet.
  # Expo SDK 57 requires Xcode 26.4+ (https://expo.fyi/expo-sdk-xcode-compatibility).
  # Bump this together with the Expo SDK.
  MIN_XCODE="26.4"
  XCODE_APP="${XCODE_APP:-/Applications/Xcode.app}"
  if XCODE_OUT="$(xcodebuild -version 2>&1)"; then
    XCODE_VER="$(printf '%s' "$XCODE_OUT" | head -1 | sed -n 's/^Xcode \([0-9][0-9.]*\).*/\1/p')"
    if ! command -v node > /dev/null 2>&1; then
      ok "Xcode ${XCODE_VER:-installed} (version not checked: Node.js missing)"
    elif [ -n "$XCODE_VER" ] && node -e '
const [a, b] = process.argv.slice(1).map((s) => s.split(".").map(Number));
for (let i = 0; i < 3; i++) { const x = a[i] || 0, y = b[i] || 0; if (x !== y) process.exit(x > y ? 0 : 1); }
' "$XCODE_VER" "$MIN_XCODE" 2>/dev/null; then
      ok "Xcode $XCODE_VER"
    else
      fail "Xcode ${XCODE_VER:-(unknown version)} is too old. This Expo SDK needs Xcode $MIN_XCODE or newer."
      printf "           Update it from the Mac App Store (macOS may need updating first).\n"
    fi
  elif printf '%s' "$XCODE_OUT" | grep -qi "license"; then
    fail "The Xcode license has not been accepted."
    printf "           Run:  sudo xcodebuild -license accept\n"
  elif [ -d "$XCODE_APP" ]; then
    fail "Xcode is installed but not selected (only the Command Line Tools are active)."
    printf "           Run:  sudo xcode-select -s %s/Contents/Developer\n" "$XCODE_APP"
  else
    fail "Xcode is not installed."
    printf "           Install it from the Mac App Store, open it once, then rerun:\n"
    printf "           https://apps.apple.com/app/xcode/id497799835\n"
  fi

  # --- CocoaPods ---
  if command -v pod > /dev/null 2>&1; then
    ok "CocoaPods $(pod --version 2>/dev/null)"
  else
    fail "CocoaPods is not installed (it installs the iOS native libraries)."
    if command -v brew > /dev/null 2>&1; then
      printf "           Run:  brew install cocoapods\n"
    else
      printf "           Install Homebrew from https://brew.sh, then run:  brew install cocoapods\n"
    fi
  fi

  # --- Watchman (optional) ---
  if command -v watchman > /dev/null 2>&1; then
    ok "watchman $(watchman --version 2>/dev/null)"
  else
    warn "watchman not found. Optional; speeds up file watching.  brew install watchman"
  fi
fi

# ---------- 3. stop if anything required is missing -----------------------
if [ "$MISSING" -gt 0 ]; then
  printf "\n%s==> Setup stopped: %s required tool(s) missing.%s\n" "$RED" "$MISSING" "$RESET"
  printf "Install the program(s) listed above, reopen your terminal, then run this script again.\n"
  exit 1
fi

# ---------- 4. install dependencies --------------------------------------
if [ ! -f "package.json" ]; then
  printf "\n%s==> No package.json found in %s%s\n" "$RED" "$REPO_ROOT" "$RESET"
  printf "Run this script from inside a clone of the FESMobile repository.\n"
  exit 1
fi

head2 "Installing npm dependencies"

if [ -f package-lock.json ]; then
  # npm ci is reproducible, but fails if the lockfile drifts from package.json.
  npm ci || {
    printf "\n%snpm ci failed, falling back to npm install...%s\n" "$YELLOW" "$RESET"
    npm install || { printf "\n%s==> npm install failed.%s\n" "$RED" "$RESET"; exit 1; }
  }
else
  npm install || { printf "\n%s==> npm install failed.%s\n" "$RED" "$RESET"; exit 1; }
fi

# ---------- 5. verify ------------------------------------------------------
head2 "Verifying the project"
npx expo-doctor || warn "expo-doctor reported issues (see above)."

# ---------- 6. personal iOS bundle ID (macOS only) -------------------------
if [ "$IS_MAC" -eq 1 ]; then
  head2 "Your personal iOS settings (.env.local)"
  if [ -f .env.local ] && grep -q "^FES_IOS_BUNDLE_ID=" .env.local; then
    ok "already set: $(grep '^FES_IOS_BUNDLE_ID=' .env.local | head -1)"
  else
    # Free Apple IDs can't share a bundle ID, so each Mac gets its own.
    SUFFIX="$(whoami | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9-]/-/g' -e 's/^-*//' -e 's/-*$//')"
    [ -z "$SUFFIX" ] && SUFFIX="dev"
    BUNDLE_ID="com.insightwisconsin.fes.$SUFFIX"
    {
      printf "# Created by scripts/setup.sh -- personal, never committed (see .env.example).\n"
      printf "FES_IOS_BUNDLE_ID=%s\n" "$BUNDLE_ID"
    } >> .env.local
    ok "created .env.local with FES_IOS_BUNDLE_ID=$BUNDLE_ID"
  fi
fi

# ---------- 7. next steps --------------------------------------------------
if [ "$IS_MAC" -eq 1 ]; then
  cat <<'EOF'

==> Setup complete. Put the FES app on your iPhone (needs iOS 16.4 or newer):

  1. Xcode > Settings > Accounts > "+" > add your Apple ID (a free one works).
  2. Plug your iPhone into this Mac with a cable. Unlock it and tap "Trust".
  3. Run:   npm run ios:device      (pick your iPhone; first build ~5-15 min)
  4. On the iPhone, if iOS refuses to open FES:
       - Settings > Privacy & Security > Developer Mode > On (then restart)
       - Free Apple ID: Settings > General > VPN & Device Management > trust yourself
  5. When FES asks for "Local Network" access, tap Allow.

Every day after that:   npm start   then open FES on your iPhone.
Rebuild only after native changes -- or every 7 days on a free Apple ID:
run  rm -rf ios  then step 3.

Another iPhone (like a Windows teammate's)? Plug it in, run  rm -rf ios  then step 3.
EOF
else
  cat <<'EOF'

==> Setup complete. You can edit and run the app from this computer.

Building the FES app onto an iPhone needs Xcode, which only runs on macOS.
So the FES app gets onto your iPhone once (iOS 16.4 or newer), in one of two ways:

  - Now:   plug your iPhone into a Mac teammate's Mac. They run:
             rm -rf ios
             npm run ios:device
  - Later: once the team's paid/UW Apple account is set up, run from here:
             npm run ios:register     (once per iPhone)
             npm run ios:build

After that, develop entirely from this computer:

  npm start                then scan the QR code with the iPhone Camera app

  - Windows Firewall: when asked about Node.js, allow it on Private networks.
  - If the iPhone can't reach this computer (common on campus Wi-Fi):
      npm run start:tunnel

UI-only preview without Bluetooth, using the Expo Go app:   npm run start:go
EOF
fi
