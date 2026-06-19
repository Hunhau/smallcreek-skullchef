#!/usr/bin/env python3
"""Headless browser test: feed milestone chew + eat sound."""
from __future__ import annotations

import json
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("FAIL: playwright not installed (pip install playwright && playwright install chromium)")
    sys.exit(2)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def start_server(port: int):
    httpd = ThreadingHTTPServer(("127.0.0.1", port), QuietHandler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main() -> int:
    import os

    os.chdir(ROOT)
    port = 18765
    httpd = start_server(port)
    url = f"http://127.0.0.1:{port}/index.html"
    results: dict = {"url": url, "checks": {}}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="networkidle", timeout=60000)
        page.wait_for_function("() => typeof game !== 'undefined' && game.init", timeout=30000)
        page.evaluate("""() => {
            localStorage.__sc_creator = '1';
            if (typeof creator !== 'undefined') creator._dev = true;
            sound.unlock();
            sound.muted = false;
            sound.volume = 1;
        }""")

        # Trigger feed FX and wait until chew loop starts (~1.1s after throw)
        page.evaluate("() => game.devTestSummonFx(0, 'feed')")
        page.wait_for_function("() => !!game._chefMouthChewActive", timeout=15000)

        # Poll mouth overlay visibility through full eat duration (~2s chew + margin)
        samples = []
        for _ in range(35):
            s = page.evaluate("""() => {
                const chef = document.getElementById('asset-chef');
                const mouth = document.getElementById('asset-chef-mouth');
                const chefVisible = chef && chef.offsetWidth > 0 && getComputedStyle(chef).display !== 'none';
                const chefSrc = chef ? chef.src : '';
                const mouthDisplay = mouth ? getComputedStyle(mouth).display : 'missing';
                const chewActive = !!game._chefMouthChewActive;
                const visual = game._chefMouthVisual;
                const eatPlaying = !!(sound._eatAudio && !sound._eatAudio.paused && !sound._eatAudio.ended);
                return { chefVisible, chefSrc, mouthDisplay, chewActive, visual, eatPlaying };
            }""")
            samples.append(s)
            time.sleep(0.1)

        toggles = 0
        prev_open = None
        for s in samples:
            is_open = s["mouthDisplay"] == "block"
            if prev_open is not None and is_open != prev_open:
                toggles += 1
            prev_open = is_open

        chef_always_visible = all(s["chefVisible"] for s in samples)
        chef_never_swapped = all("chef.png" in s["chefSrc"] for s in samples if s["chefSrc"])
        mouth_toggled = toggles >= 4
        chew_ran = any(s["chewActive"] for s in samples)
        eat_played = any(s["eatPlaying"] for s in samples)

        results["checks"] = {
            "chef_always_visible": chef_always_visible,
            "chef_never_swapped_to_open_sprite": chef_never_swapped,
            "mouth_overlay_toggles_4plus": mouth_toggled,
            "toggle_count": toggles,
            "chew_active_seen": chew_ran,
            "eat_sound_played": eat_played,
        }
        results["samples"] = samples

        browser.close()

    httpd.shutdown()
    print(json.dumps(results, indent=2))
    ok = (
        chef_always_visible
        and chef_never_swapped
        and mouth_toggled
        and chew_ran
    )
    if not eat_played:
        print("WARN: eat sound not detected (may need user gesture in some browsers)")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
