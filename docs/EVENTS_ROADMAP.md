# Events roadmap (post-launch)

Lightweight seasonal cadence for Smallcreek Skullchef. Implementation hook: `events.js` → `events.getActive()`.

---

## Suggested cadence

| Tier | Frequency | Duration | Goal |
|------|-----------|----------|------|
| **Mini** | Weekly (optional) | 3–7 days | Small EB boost, one cosmetic tint, or helper dialogue |
| **Seasonal** | Monthly | 2–4 weeks | Themed UI accent, limited drop pool, ambient swap |
| **Major** | Quarterly | 4–6 weeks | New skin family tease, leaderboard tag, story beat in lore scroll |

Keep mini events **optional** early on — one person studio should not commit to weekly art before launch stabilizes.

---

## Calendar sketch (year 1)

| Window | Event ID | Theme | Ideas |
|--------|----------|-------|-------|
| Late Oct | `halloween` | Spooky | Purple fog CSS, pumpkin hat drop rate +5%, lore line |
| Mid Dec – early Jan | `christmas` | Winter | Snow particles (low quality cap), candy spoon thumb |
| Jul – Aug | `summer` | Beach | Warm gold UI, “cold soup” joke in lore, floatie Coco skin |
| Spring (Mar) | `bloom` | Garden | Green steam wisps, carrot bunny spotlight |
| Launch +30d | `anniversary` | Celebration | Free common skin for returning players |

Dates are **placeholders** — set real ISO ranges in `events.js` when art is ready.

---

## Technical integration

### 1. Register dates (`events.js`)

```javascript
{ id: 'halloween', start: '2026-10-25', end: '2026-11-02', theme: 'spooky', label: 'Halloween' }
```

### 2. Boot hook (`index.html` → `boot()`)

Already calls `events.applyTheme()` which sets `document.documentElement.dataset.event`.

Future work:

- `dataset.event === 'halloween'` → add `body` class, swap ambient track
- Drop tables: `collection` roll weights per `events.getActiveId()`
- Leaderboard tag: submit `platform` + `event_id` field (schema TBD)

### 3. Feature flags

| Flag | Purpose |
|------|---------|
| `events.getActive()` | Array of live events |
| `events.getActiveId()` | First active id or `null` |
| `events.applyTheme()` | DOM `data-event` attribute |

### 4. Quality / mobile

Seasonal particles must respect `quality.params.maxParts` — use existing particle cap, do not bypass `quality` on phones.

---

## Content checklist per event

- [ ] Start/end dates in `events.js`
- [ ] Theme class CSS (≤ 50 lines, no new heavy assets required for mini events)
- [ ] Lore scroll string in i18n (`en` + `es`)
- [ ] Optional: 1 thumb skin in `assets/skins/` + catalog entry
- [ ] Playables build: verify no extra network calls
- [ ] `PRODUCTION_BUILD` store build smoke test

---

## What not to do at launch

- No hard dependency on server-side event config (keep client-side dates until backend exists).
- No paywalled seasonal skins before economy is proven.
- No event-specific save schema changes without migration/version bump in `soup_p_v17` integrity wrapper.

---

## Post-launch phases

1. **Phase 0 (launch):** scaffold only — `events.js` empty, hook dormant.
2. **Phase 1:** first `halloween` or `christmas` with CSS + lore only (no new PNGs).
3. **Phase 2:** drop rate + collection integration.
4. **Phase 3:** remote config JSON (optional) fetched network-first, fallback to `events.js`.
