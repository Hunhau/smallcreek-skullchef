#!/usr/bin/env bash
# Archive Skullchef iOS for App Store (run on Mac via SSH).
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS="$ROOT/ios/App"
PB="$IOS/App.xcodeproj/project.pbxproj"
ARCHIVE="$ROOT/build/Skullchef.xcarchive"
LOG="$ROOT/build/archive.log"
TEAM="${DEVELOPMENT_TEAM:-Q6W9WL6QJC}"

mkdir -p "$ROOT/build"

if [[ ! -f "$PB" ]]; then
  echo "ERROR: missing $PB — run tools/setup-ios-mac.sh first"
  exit 1
fi

# Fix empty DEVELOPMENT_TEAM from fresh Capacitor project.
if grep -q 'DEVELOPMENT_TEAM = "";' "$PB" 2>/dev/null; then
  sed -i '' "s/DEVELOPMENT_TEAM = \"\";/DEVELOPMENT_TEAM = $TEAM;/g" "$PB"
  echo "==> Patched DEVELOPMENT_TEAM in project.pbxproj"
fi

cd "$IOS"
if [[ ! -d Pods ]]; then
  echo "==> pod install..."
  pod install
fi

echo "==> Archiving (team $TEAM)..."
xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  archive -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="$TEAM" 2>&1 | tee "$LOG"

if [[ -d "$ARCHIVE" ]]; then
  echo "==> ARCHIVE OK: $ARCHIVE"
  exit 0
fi

echo "==> ARCHIVE FAILED — last errors:"
grep -i 'error:' "$LOG" | tail -15 || tail -30 "$LOG"
exit 1
