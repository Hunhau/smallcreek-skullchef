#!/usr/bin/env bash
# Run on Mac BEFORE Product → Archive. Exits non-zero if store build is misconfigured.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ERR=0

fail() { echo "ERROR: $1"; ERR=1; }
ok()   { echo "OK: $1"; }

CONFIG="$ROOT/admob.config.json"
INDEX="$ROOT/index.html"
PLIST="$ROOT/ios/App/App/Info.plist"

if [ ! -f "$CONFIG" ]; then
  fail "admob.config.json missing"
else
  node -e "
const c=require('$CONFIG');
const testIds=['3940256099942544'];
const id=(c.ios&&c.ios.appId)||'';
const unit=(c.ios&&c.ios.rewardedAdUnitId)||'';
if(c.isTesting!==false) { console.error('isTesting must be false'); process.exit(1); }
if(!id||!unit) { console.error('ios appId/rewardedAdUnitId required'); process.exit(1); }
if(testIds.some(t=>id.includes(t)||unit.includes(t))) { console.error('Google TEST ids detected'); process.exit(1); }
" && ok "admob.config.json (production)" || fail "admob.config.json not ready for production"
fi

if grep -q "PRODUCTION_BUILD = false" "$INDEX" 2>/dev/null; then
  fail "index.html has PRODUCTION_BUILD = false"
else
  ok "PRODUCTION_BUILD"
fi

if grep -q "BUILD_TARGET_OVERRIDE = 'web'" "$INDEX" 2>/dev/null; then
  fail "index.html BUILD_TARGET_OVERRIDE is 'web'"
else
  ok "BUILD_TARGET"
fi

PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"
CAP="$ROOT/capacitor.config.json"
if [ -f "$PBX" ]; then
  if grep -q 'com.smallcreek.skullchefapp' "$PBX" 2>/dev/null; then
    fail "Bundle ID is skullchefapp — must be com.smallcreek.skullchef (App Store Connect)"
  elif grep -q 'PRODUCT_BUNDLE_IDENTIFIER = com.smallcreek.skullchef;' "$PBX"; then
    ok "Bundle ID com.smallcreek.skullchef"
  else
    fail "Xcode Bundle ID is not com.smallcreek.skullchef"
  fi
fi
if [ -f "$CAP" ]; then
  grep -q '"appId": "com.smallcreek.skullchef"' "$CAP" && ok "capacitor.config.json appId" \
    || fail "capacitor.config.json appId must be com.smallcreek.skullchef"
fi

if [ -f "$PLIST" ]; then
  if /usr/libexec/PlistBuddy -c "Print :GADApplicationIdentifier" "$PLIST" >/dev/null 2>&1; then
    ok "Info.plist GADApplicationIdentifier"
  else
    fail "Info.plist missing GADApplicationIdentifier — run tools/patch-ios-admob-plist.sh"
  fi
else
  fail "ios/App/App/Info.plist not found — run tools/setup-ios-mac.sh"
fi

if [ ! -f "$ROOT/www/admob.config.json" ]; then
  fail "www/admob.config.json missing — run tools/sync-www.sh"
else
  ok "www/admob.config.json present"
fi

if [ ! -f "$ROOT/www/audio/stir1.mp3" ]; then
  fail "www/audio/stir1.mp3 missing — sync-www.sh must copy audio/ (game SFX); ambient alone is not enough"
else
  ok "www/audio/ game SFX present"
fi

WWW_INDEX="$ROOT/www/index.html"
if [ -f "$WWW_INDEX" ]; then
  if grep -q 'const BUILD_V = "build-49"' "$WWW_INDEX" 2>/dev/null; then
    ok "www/index.html BUILD_V build-49 (store-ready code)"
  elif grep -q 'const BUILD_V = "build-' "$WWW_INDEX" 2>/dev/null; then
    BV="$(grep -o 'const BUILD_V = "build-[0-9]*"' "$WWW_INDEX" | head -1)"
    fail "www/index.html is $BV — re-run sync-www.sh; Archive must include build-49+"
  else
    fail "www/index.html missing BUILD_V"
  fi
fi

if [ -f "$PBX" ]; then
  if grep -q 'CURRENT_PROJECT_VERSION = 51;' "$PBX" 2>/dev/null; then
    echo "WARN: Xcode Build is still 51 — bump to 52 before Archive (51 archive had old build-47 code)"
  fi
fi

if [ "$ERR" -ne 0 ]; then
  echo ""
  echo "Fix the errors above before Archive."
  exit 1
fi
echo ""
echo "All checks passed. Safe to: sync-www.sh → cap sync ios → Archive"
