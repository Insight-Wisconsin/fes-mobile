#!/usr/bin/env bash
#
# Builds the FES app and installs it on an iPhone (macOS only).
#
# Reuses the existing ios/ folder so rebuilds are incremental, and handles the
# two cases that used to need a manual `rm -rf ios`:
#   - Expo only generates ios/ when it is missing, so after a config change
#     (app.json, app.config.js, package.json, .env/.env.local) ios/ is
#     regenerated here.
#   - `expo run:ios` only lets Xcode create provisioning profiles and register
#     new iPhones while ios/ has no signing team saved, and it saves one on the
#     first build. Clearing it lets every build do that, so a new iPhone or an
#     expired free Apple ID install just works.
#
# Usage:  npm run ios:device                      pick the iPhone from a list
#         npm run ios:device -- <iPhone name|ID>  skip the list
#
# No `set -u`: macOS ships bash 3.2, which treats an empty "$@" as unbound.
set -eo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

STAMP_FILE=".expo/ios-device-inputs"

config_stamp() {
  for f in app.json app.config.js package.json .env .env.local; do
    if [ -f "$f" ]; then
      printf '%s\n' "$f"
      cat "$f"
    fi
  done | cksum
}

CURRENT_STAMP="$(config_stamp)"
if [ -d ios ] && [ "$(cat "$STAMP_FILE" 2>/dev/null)" != "$CURRENT_STAMP" ]; then
  echo "ios/ doesn't match the current config: regenerating it (full rebuild)."
  rm -rf ./ios
fi
mkdir -p .expo
printf '%s\n' "$CURRENT_STAMP" > "$STAMP_FILE"

for pbxproj in ios/*.xcodeproj/project.pbxproj; do
  [ -f "$pbxproj" ] || continue
  # -i.bak works with both the macOS and the GNU version of sed.
  sed -i.bak '/DEVELOPMENT_TEAM = /d' "$pbxproj"
  rm -f "$pbxproj.bak"
done

exec npx expo run:ios --device "$@"
