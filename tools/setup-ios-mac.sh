#!/usr/bin/env bash
# Skullchef — one-shot iOS / Capacitor setup (run on Mac only).
# Usage:
#   cd "/path/to/SmallCreek Game"
#   chmod +x tools/setup-ios-mac.sh
#   ./tools/setup-ios-mac.sh

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Skullchef iOS setup"
echo "    Project: $ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install LTS from https://nodejs.org"
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "ERROR: Xcode not found. Install from Mac App Store, then run: xcode-select --install"
  exit 1
fi

echo "==> Node $(node -v) | npm $(npm -v)"

# Patch BUILD_TARGET for store builds (web GitHub Pages stays 'web' in repo until you sync).
INDEX="$ROOT/index.html"
if grep -q "BUILD_TARGET_OVERRIDE = 'web'" "$INDEX"; then
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s/BUILD_TARGET_OVERRIDE = 'web'/BUILD_TARGET_OVERRIDE = 'auto'/" "$INDEX"
  else
    sed -i "s/BUILD_TARGET_OVERRIDE = 'web'/BUILD_TARGET_OVERRIDE = 'auto'/" "$INDEX"
  fi
  echo "==> Patched BUILD_TARGET_OVERRIDE -> auto in index.html (Mac store build)"
fi

if [[ ! -f "$ROOT/admob.config.json" && -f "$ROOT/admob.config.example.json" ]]; then
  cp "$ROOT/admob.config.example.json" "$ROOT/admob.config.json"
  echo "==> Created admob.config.json from example (edit with your AdMob IDs before App Store)"
fi

echo "==> Installing npm dependencies..."
npm install @capacitor/core @capacitor/cli @capacitor/ios \
  @capacitor/splash-screen @capacitor/status-bar \
  @capacitor-community/admob

if [[ ! -d "$ROOT/ios" ]]; then
  echo "==> Adding iOS platform..."
  npx cap add ios
else
  echo "==> ios/ already exists, skipping cap add ios"
fi

echo "==> Building www/ for Capacitor..."
bash "$ROOT/tools/sync-www.sh"

echo "==> Syncing web assets into native project..."
npx cap sync ios

if [[ -x "$ROOT/tools/patch-ios-admob-plist.sh" ]]; then
  bash "$ROOT/tools/patch-ios-admob-plist.sh"
elif [[ -f "$ROOT/tools/patch-ios-admob-plist.sh" ]]; then
  chmod +x "$ROOT/tools/patch-ios-admob-plist.sh"
  bash "$ROOT/tools/patch-ios-admob-plist.sh"
fi

echo ""
echo "Done. Next steps:"
echo "  1. npx cap open ios"
echo "  2. Xcode -> Signing & Capabilities -> Team = your Apple Developer account"
echo "  3. Bundle ID: com.smallcreek.skullchefapp"
echo "  4. AdMob: edit admob.config.json → real IDs before App Store (see docs/ADMOB_SETUP.md)"
echo "  5. Connect iPhone -> Run (Play) — test rewarded ad via side menu 🎁"
echo "  6. Product -> Archive -> Distribute to App Store Connect"
echo ""
echo "App Store Connect: https://appstoreconnect.apple.com"
echo "Privacy URL: https://hunhau.github.io/smallcreek-skullchef/privacy.html"
