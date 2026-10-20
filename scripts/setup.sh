#!/usr/bin/env bash
#
# FESMobile setup script (macOS / Linux / Git Bash on Windows).
#
# Verifies the tools that must be installed by hand, then installs the npm
# dependencies for the Expo app in FES-app/FES.
#
# Usage:  bash scripts/setup.sh
#
set -uo pipefail

APP_DIR="FES-app/FES"
MISSING=0

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

# ---------- 2. optional tools --------------------------------------------
head2 "Optional (only needed for native development builds)"

if command -v watchman > /dev/null 2>&1; then
  ok "watchman $(watchman --version 2>/dev/null)"
else
  warn "watchman not found. Optional; speeds up file watching on macOS."
fi

if [ -n "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ]; then
  ok "Android SDK detected"
else
  warn "Android SDK not detected. Only needed for 'npm run android'."
  printf "         Install Android Studio: https://developer.android.com/studio\n"
fi

if [ "$(uname -s 2>/dev/null)" = "Darwin" ]; then
  if command -v xcodebuild > /dev/null 2>&1; then
    ok "Xcode command line tools"
  else
    warn "Xcode not found. Only needed for 'npm run ios'."
    printf "         Install Xcode from the Mac App Store.\n"
  fi
fi

# ---------- 3. stop if anything required is missing -----------------------
if [ "$MISSING" -gt 0 ]; then
  printf "\n%s==> Setup stopped: %s required tool(s) missing.%s\n" "$RED" "$MISSING" "$RESET"
  printf "Install the program(s) listed above, reopen your terminal, then run this script again.\n"
  exit 1
fi

# ---------- 4. install dependencies --------------------------------------
if [ ! -d "$APP_DIR" ]; then
  printf "\n%s==> Could not find %s%s\n" "$RED" "$APP_DIR" "$RESET"
  printf "Run this script from inside a clone of the FESMobile repository.\n"
  exit 1
fi

head2 "Installing npm dependencies in $APP_DIR"
cd "$APP_DIR" || exit 1

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

# ---------- 6. Expo account ----------------------------------------------
head2 "Checking your Expo account"
EXPO_USER="$(npx expo whoami 2>/dev/null | tail -1)"
if [ -n "$EXPO_USER" ] && [ "${EXPO_USER#*Not logged in}" = "$EXPO_USER" ]; then
  ok "signed in to Expo as $EXPO_USER"
else
  warn "You are NOT signed in to Expo."
  printf "         The project will not open in Expo Go until you sign in. Run:\n"
  printf "           %snpx expo login%s\n" "$BOLD" "$RESET"
  printf "         No account yet? Create one free: https://expo.dev/signup\n"
fi

# ---------- 7. next steps --------------------------------------------------
cat <<'EOF'

==> Setup complete.

One more thing to install BY HAND, on your phone:

  Expo Go
    iOS      https://apps.apple.com/app/expo-go/id982107779
    Android  https://play.google.com/store/apps/details?id=host.exp.exponent

Then start the app:

  cd FES-app/FES
  npx expo login     # sign in first -- Expo Go needs this
  npm start

Scan the QR code with Expo Go (Android) or the Camera app (iOS).
Sign in to Expo Go on your phone with the SAME account you used above.
Your computer and your phone must be on the same Wi-Fi network.
If the QR code will not connect, use:  npm run start:tunnel

Note: Bluetooth / the ESP32 stimulator does not work in Expo Go.
That needs a development build -- see the README.
EOF
