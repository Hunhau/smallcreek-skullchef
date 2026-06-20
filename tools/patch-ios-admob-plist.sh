#!/usr/bin/env bash
# Patch ios/App/App/Info.plist for Google AdMob (GADApplicationIdentifier + ATT).
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/ios/App/App/Info.plist"
CONFIG="$ROOT/admob.config.json"
TRACKING_MSG="Skullchef uses this identifier to deliver ads and support the free game."

if [[ ! -f "$PLIST" ]]; then
  echo "WARN: $PLIST not found — run npx cap add ios first"
  exit 0
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "WARN: admob.config.json missing — copy admob.config.example.json"
  exit 0
fi

APP_ID="$(node -e "const c=require(process.argv[1]); process.stdout.write((c.ios&&c.ios.appId)||'');" "$CONFIG")"
if [[ -z "$APP_ID" ]]; then
  echo "WARN: admob.config.json missing ios.appId"
  exit 0
fi

/usr/libexec/PlistBuddy -c "Add :GADApplicationIdentifier string $APP_ID" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :GADApplicationIdentifier $APP_ID" "$PLIST"

/usr/libexec/PlistBuddy -c "Add :NSUserTrackingUsageDescription string $TRACKING_MSG" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :NSUserTrackingUsageDescription $TRACKING_MSG" "$PLIST"

# Minimal SKAdNetwork entry (AdMob plugin docs); Google recommends full list for better fill.
if ! /usr/libexec/PlistBuddy -c "Print :SKAdNetworkItems" "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Add :SKAdNetworkItems array" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :SKAdNetworkItems:0 dict" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :SKAdNetworkItems:0:SKAdNetworkIdentifier string cstr6suwn9.skadnetwork" "$PLIST"
fi

echo "==> AdMob Info.plist patched (App ID: ${APP_ID:0:20}...)"
