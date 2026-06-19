# Skullchef — YouTube Playables

Build and submit guide for the YouTube Playables version of **Skullchef** (*The Wooden Soup*).

The web build at GitHub Pages stays on `BUILD_TARGET = 'web'`. YouTube receives a **separate zip** with `BUILD_TARGET = 'playables'`.

---

## What is already integrated

| Requirement | Implementation |
|-------------|----------------|
| SDK loaded before game code | `<script src="https://www.youtube.com/game_api/v1">` in `<head>` |
| `firstFrameReady()` | Called when home screen paints (double rAF in `boot()`) |
| `gameReady()` | Called when home is interactable (Play button) |
| `loadData()` / `saveData()` | `ytPlayables` + `cloudSave` (Playables-only cloud save) |
| `onPause` / `onResume` | Pauses loop + audio; saves on pause |
| `isAudioEnabled` / `onAudioEnabledChange` | Syncs with game `sound` |
| `getLanguage()` | Sets EN/ES from YouTube locale |
| `sendScore()` | Sends lifetime total (`game.te`) on save |
| `requestRewardedAd(rewardId)` | Wired to reward ads when SDK offers them |
| No Supabase cloud backup in Playables | Backup / creator-sync rows hidden |
| No external leaderboard writes | Supabase submit disabled; YouTube score used |

---

## 1. Create the Playables zip

From the repo root (PowerShell):

```powershell
cd "D:\SmallCreek Game"
.\tools\build-playables.ps1
```

Output: `dist-playables/skullchef-playables.zip`

This copies the game, sets `BUILD_TARGET_OVERRIDE = 'playables'`, and zips everything needed (excluding `.git`, `tools`, prior dist folders).

---

## 2. Test locally (optional)

The SDK is a **no-op** outside YouTube. To validate integration before upload:

1. Follow Google's [Playables test suite guide](https://developers.google.com/youtube/gaming/playables/guides/test_suite).
2. Or upload to YouTube's developer console as a **draft** and test in the Playables preview.

---

## 3. Submit on YouTube

1. Go to [YouTube Studio](https://studio.youtube.com) → your channel → **Playables** (or the Playables developer portal if enrolled).
2. Create a new Playable.
3. Upload `skullchef-playables.zip`.
4. Set title: **Skullchef**
5. Subtitle/description: **The Wooden Soup** — cozy idle clicker. Stir the cauldron, summon helpers, ascend.
6. Complete certification checklist (integration + content requirements).
7. Publish when approved.

Official docs:

- [Getting started](https://developers.google.com/youtube/gaming/playables/reference/getting_started)
- [SDK reference](https://developers.google.com/youtube/gaming/playables/reference/sdk)
- [Integration requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)

---

## 4. Web vs Playables (do not mix)

| | Web (GitHub Pages) | YouTube Playables |
|--|-------------------|-------------------|
| Build flag | `'web'` | `'playables'` |
| Save | localStorage + optional Supabase cloud | **only** `ytgame.game.saveData` |
| Leaderboard | Supabase global ranks | YouTube `sendScore` |
| Backup buttons | Visible | Hidden |
| Deploy | `git push` → Pages | Upload zip to YouTube |

Never upload the Playables zip to GitHub Pages or the web build to YouTube.

---

## 5. After updates

1. Fix/gameplay changes → edit `index.html` as usual.
2. `git push` for web players (build bump in `version.json` / `BUILD_V` / `sw.js`).
3. Re-run `.\tools\build-playables.ps1` and re-upload zip to YouTube.
