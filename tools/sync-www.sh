#!/usr/bin/env bash
# Copy web game files into www/ for Capacitor (webDir cannot be ".").
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WWW="$ROOT/www"
rm -rf "$WWW"
mkdir -p "$WWW"

copy() {
  if [ -e "$1" ]; then
    cp -R "$1" "$WWW/"
  fi
}

copy "$ROOT/index.html"
copy "$ROOT/sw.js"
copy "$ROOT/manifest.webmanifest"
copy "$ROOT/privacy.html"
copy "$ROOT/app-ads.txt"
copy "$ROOT/version.json"
copy "$ROOT/live.json"
copy "$ROOT/css"
copy "$ROOT/js"
copy "$ROOT/assets"
copy "$ROOT/audio"
copy "$ROOT/leaderboard"
copy "$ROOT/admob.config.json"

echo "www/ ready ($(du -sh "$WWW" | cut -f1))"
