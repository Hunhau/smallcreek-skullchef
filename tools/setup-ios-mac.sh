#!/usr/bin/env bash
# Skullchef — one-shot iOS / Capacitor setup (run on Mac only).
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Scripts may arrive with Windows CRLF from the transfer ZIP — bash rejects those.
for _sh in "$ROOT"/tools/*.sh; do
  [ -f "$_sh" ] && sed -i '' 's/\r$//' "$_sh" 2>/dev/null || true
done

echo "==> Skullchef iOS setup"
echo "    Project: $ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install LTS from https://nodejs.org"
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "ERROR: Xcode not found. Install from Mac App Store and open it once."
  exit 1
fi

echo "==> Node $(node -v) | npm $(npm -v)"

INDEX="$ROOT/index.html"
if grep -q "BUILD_TARGET_OVERRIDE = 'web'" "$INDEX"; then
  sed -i '' "s/BUILD_TARGET_OVERRIDE = 'web'/BUILD_TARGET_OVERRIDE = 'auto'/" "$INDEX"
  echo "==> Patched BUILD_TARGET_OVERRIDE -> auto in index.html"
fi

if [ ! -f "$ROOT/admob.config.json" ] && [ -f "$ROOT/admob.config.example.json" ]; then
  cp "$ROOT/admob.config.example.json" "$ROOT/admob.config.json"
  echo "==> Created admob.config.json from example"
fi

echo "==> Installing npm dependencies..."
npm install @capacitor/core @capacitor/cli @capacitor/ios \
  @capacitor/splash-screen @capacitor/status-bar \
  @capacitor-community/admob

if [ ! -d "$ROOT/ios" ]; then
  echo "==> Adding iOS platform..."
  npx cap add ios
else
  echo "==> ios/ already exists, skipping cap add ios"
fi

echo "==> Building www/ for Capacitor..."
bash "$ROOT/tools/sync-www.sh"

echo "==> Syncing web assets into native project..."
npx cap sync ios

ICON_SRC="$ROOT/ios-app-icon/AppIcon.appiconset"
ICON_DST="$ROOT/ios/App/App/Assets.xcassets/AppIcon.appiconset"
if [ -d "$ICON_SRC" ] && [ -f "$ICON_SRC/icon-1024.png" ] && [ -d "$ICON_DST" ]; then
  cp -f "$ICON_SRC"/* "$ICON_DST"/
  rm -f "$ICON_DST"/AppIcon-512@2x.png 2>/dev/null || true
  echo "==> App icon installed (AppIcon.appiconset)"
fi

if [ -f "$ROOT/tools/patch-ios-admob-plist.sh" ]; then
  bash "$ROOT/tools/patch-ios-admob-plist.sh"
fi

if [ -f "$ROOT/tools/patch-ios-audio-session.sh" ]; then
  bash "$ROOT/tools/patch-ios-audio-session.sh"
fi

echo ""
echo "Done. Next steps:"
echo "  1. Open ios/App/App.xcworkspace in Xcode"
echo "  2. Signing -> Team = your Apple Developer account"
echo "  3. Bundle ID: com.smallcreek.skullchef"
echo "  4. Product -> Archive -> Upload to App Store Connect"
