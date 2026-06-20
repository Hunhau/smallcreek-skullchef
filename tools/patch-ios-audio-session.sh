#!/usr/bin/env bash
# Enable game SFX in WKWebView on iPhone (playback category + mixWithOthers for AdMob).
set -euROOT="$(cd "$(dirname "$0")/.." && pwd)"
DELEGATE="$ROOT/ios/App/App/AppDelegate.swift"

if [[ ! -f "$DELEGATE" ]]; then
  echo "WARN: $DELEGATE not found — run npx cap add ios first"
  exit 0
fi

python3 - "$DELEGATE" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

if "configureAudioSession()" in text:
    print("==> AppDelegate audio session already patched")
    sys.exit(0)

if "import AVFoundation" not in text:
    text = text.replace("import Capacitor\n", "import Capacitor\nimport AVFoundation\n", 1)

marker = "    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {"
if marker not in text:
    print("ERROR: didFinishLaunchingWithOptions not found in AppDelegate.swift")
    sys.exit(1)

text = text.replace(
    marker,
    marker + "\n        configureAudioSession()",
    1,
)

active_marker = "    func applicationDidBecomeActive(_ application: UIApplication) {"
if active_marker in text and "configureAudioSession()" not in text.split(active_marker, 1)[1].split("}", 1)[0]:
    text = text.replace(
        active_marker,
        active_marker + "\n        configureAudioSession()",
        1,
    )

helper = """
    private func configureAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            print("AVAudioSession configure error: \\(error)")
        }
    }
"""

if "@UIApplicationMain" in text:
    text = text.replace("\n}\n", helper + "\n}\n", 1)
else:
    text = text.rstrip() + helper + "\n"

path.write_text(text, encoding="utf-8")
print("==> AppDelegate.swift patched for AVAudioSession playback")
PY
