#!/usr/bin/env python3
import os, plistlib
base = os.path.expanduser("~/Library/Developer/Xcode/Archives/2026-06-20")
for d in sorted(os.listdir(base)):
    if not d.endswith(".xcarchive"):
        continue
    p = os.path.join(base, d, "Products/Applications/App.app/Info.plist")
    if not os.path.isfile(p):
        continue
    pl = plistlib.load(open(p, "rb"))
    print(d[:40], "| ver:", pl.get("CFBundleShortVersionString"), "| build:", pl.get("CFBundleVersion"))
