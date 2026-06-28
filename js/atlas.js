/* Esqueletia atlas — global atlas. */
(function (global) {
    'use strict';

    global.atlas = {
            PATH_DROP_BIAS: 0.45,
            PATHS: [
                { id: 'cauldron', region: 'cauldron_core', emoji: '🍲', title_en: 'Path of the Cauldron', title_es: 'Camino del Caldero', tagline_en: 'Classic helpers, sacred utensils, and the heart of Esqueletia.', tagline_es: 'Ayudantes clásicos, utensilios sagrados y el corazón de Esqueletia.', chapters: [
                    { id: 'start', needSets: 0, title_en: 'First Stir', title_es: 'Primer remeo', text_en: 'Skullchef dips a wooden spoon into the broth. Five helpers lean in — this is where every legend begins.', text_es: 'Skullchef mete la cuchara de madera en el caldo. Cinco ayudantes se asoman: aquí empieza toda leyenda.' },
                    { id: 'album1', needSets: 1, title_en: 'Helper Album', title_es: 'Álbum de ayudantes', text_en: 'Your first set is complete. The cauldron remembers who stirred with you.', text_es: 'Tu primer set está completo. El caldero recuerda quién removió contigo.' },
                    { id: 'album2', needSets: 2, title_en: 'Kitchen Relics', title_es: 'Reliquias de cocina', text_en: 'Two albums sealed. Spoons and hats hum when you click — Esqueletia approves.', text_es: 'Dos álbumes sellados. Cucharas y gorros vibran al clicar: Esqueletia aprueba.' },
                    { id: 'master', needSets: 4, title_en: 'Cauldron Master', title_es: 'Maestro del caldero', text_en: 'The core of Esqueletia is yours. Other paths still exist — but this pot is home.', text_es: 'El núcleo de Esqueletia es tuyo. Otros caminos existen, pero esta olla es tu hogar.' }
                ]},
                { id: 'cosmic', region: 'cosmic_kitchen', emoji: '🛸', title_en: 'Cosmic Kitchen Route', title_es: 'Ruta Cocina Cósmica', tagline_en: 'Aliens, fast food, and superheroes in zero-gravity broth.', tagline_es: 'Aliens, comida rápida y superhéroes en caldo sin gravedad.', chapters: [
                    { id: 'start', needSets: 0, title_en: 'Snack-Space Breach', title_es: 'Brecha snack-espacial', text_en: 'The broth bubbles through a wormhole. Burgers float past UFOs. You chose the weird lane.', text_es: 'El caldo burbujea por un agujero de gusano. Burgers flotan junto a OVNIs. Elegiste el carril raro.' },
                    { id: 'album1', needSets: 1, title_en: 'Orbital Drop', title_es: 'Drop orbital', text_en: 'One cosmic set complete. Helpers wear helmets now — fashion and survival.', text_es: 'Un set cósmico completo. Los ayudantes llevan casco: moda y supervivencia.' },
                    { id: 'album2', needSets: 2, title_en: 'Galaxy Garnish', title_es: 'Guarnición galáctica', text_en: 'Two albums from the stars. Your chronicle now smells like fries and nebula dust.', text_es: 'Dos álbumes de las estrellas. Tu crónica huele a fritas y polvo de nebulosa.' },
                    { id: 'master', needSets: 4, title_en: 'Cosmic Chef', title_es: 'Chef cósmico', text_en: 'The kitchen orbits your will. Earth was practice — snack-space is the main course.', text_es: 'La cocina orbita tu voluntad. La Tierra fue práctica; el snack-espacio es el plato fuerte.' }
                ]},
                { id: 'chaos', region: 'chaos_realm', emoji: '🎭', title_en: 'Chaos Kawaii Trail', title_es: 'Senda Caos Kawaii', tagline_en: 'Meme disguises, cosmic cute, and staged madness.', tagline_es: 'Disfraces meme, cosmic cute y locura en staging.', chapters: [
                    { id: 'start', needSets: 0, title_en: 'Main Character Soup', title_es: 'Sopa protagonista', text_en: 'You picked chaos. Wigs, memes, and cursed kawaii — the pot laughs back.', text_es: 'Elegiste el caos. Pelucas, memes y kawaii maldito: la olla se ríe contigo.' },
                    { id: 'album1', needSets: 1, title_en: 'Disguise Unlocked', title_es: 'Disfraz desbloqueado', text_en: 'First chaos set done. Helpers refuse to wear normal shirts. Good.', text_es: 'Primer set del caos listo. Los ayudantes rechazan camisetas normales. Bien.' },
                    { id: 'album2', needSets: 2, title_en: 'Meme Stock', title_es: 'Existencias meme', text_en: 'Two albums of pure nonsense. Your adventure is nobody else\'s run.', text_es: 'Dos álbumes de puro nonsense. Tu aventura no es la de nadie más.' },
                    { id: 'master', needSets: 3, title_en: 'Chaos Sovereign', title_es: 'Soberano del caos', text_en: 'Esqueletia crowns you lord of cursed cute. The broth has opinions now.', text_es: 'Esqueletia te corona señor del cute maldito. El caldo tiene opiniones ahora.' }
                ]},
                { id: 'realms', region: 'realm_ruckus', emoji: '🗺️', title_en: 'Realm Ruckus Expedition', title_es: 'Expedición Alboroto de Reinos', tagline_en: 'Desert, winter, pirates — new lands as waves arrive.', tagline_es: 'Desierto, invierno, piratas: tierras nuevas con cada wave.', chapters: [
                    { id: 'start', needSets: 0, title_en: 'Map Unfolds', title_es: 'El mapa se abre', text_en: 'You set sail on the atlas. Realms are mostly blank — your future stamps wait.', text_es: 'Zarpas en el atlas. Los reinos están casi en blanco: tus sellos futuros esperan.' },
                    { id: 'album1', needSets: 1, title_en: 'First Realm Stamp', title_es: 'Primer sello de reino', text_en: 'A new land answers your collection. The chronicle adds a page you wrote.', text_es: 'Una tierra nueva responde a tu colección. La crónica suma una página tuya.' },
                    { id: 'album2', needSets: 2, title_en: 'Border Crosser', title_es: 'Cruzador de fronteras', text_en: 'Two realm sets sealed. Your path is a passport — others may never see these shores.', text_es: 'Dos sets de reinos sellados. Tu camino es un pasaporte; otros no verán estas costas.' },
                    { id: 'master', needSets: 3, title_en: 'Realm Walker', title_es: 'Caminante de reinos', text_en: 'You chart Esqueletia before most chefs know it exists. The adventure is yours alone.', text_es: 'Mapeas Esqueletia antes de que exista para la mayoría. La aventura es solo tuya.' }
                ]}
            ],
            PRESTIGE_SAGA: [
                { id: 'p1', needPrestige: 1, title_en: 'First Awakening', title_es: 'Primer despertar', text_en: 'The Angel stirs. Skullchef remembers every stir from the last life — and the broth forgives nothing.', text_es: 'El Ángel se agita. Skullchef recuerda cada remeo de la vida pasada — y el caldo no perdona nada.' },
                { id: 'p3', needPrestige: 3, title_en: 'Broth Reborn', title_es: 'Caldo renacido', text_en: 'Three eras behind you. Helpers whisper that the wooden spoon grows lighter each time.', text_es: 'Tres eras a tus espaldas. Los ayudantes murmuran que la cuchara de madera pesa menos cada vez.' },
                { id: 'p5', needPrestige: 5, title_en: 'Esqueletia Hears You', title_es: 'Esqueletia te escucha', text_en: 'Five awakenings. The cauldron glows when you sleep — as if cooking for your return.', text_es: 'Cinco despertares. El caldero brilla mientras duermes, como cocinando tu regreso.' },
                { id: 'p7', needPrestige: 7, title_en: 'Legend of the Stir', title_es: 'Leyenda del remeo', text_en: 'Seven cycles woven. Even the ranking remembers your name between prestiges.', text_es: 'Siete ciclos tejidos. Hasta el ranking recuerda tu nombre entre prestigios.' },
                { id: 'p10', needPrestige: 10, title_en: 'Eternal Chef', title_es: 'Chef eterno', text_en: 'Ten awakenings. Small Angel\'s light and skull bone — one soup, infinite returns.', text_es: 'Diez despertares. Luz del Pequeño Ángel y hueso de calavera: una sopa, infinitos regresos.' }
            ],
            pathDef(id) { if (!id) return null; for (let i = 0; i < this.PATHS.length; i++) if (this.PATHS[i].id === id) return this.PATHS[i]; return null; },
            pathTitle(id) { const p = this.pathDef(id || this.path()); if (!p) return ''; return (LANG === 'es') ? (p.title_es || p.title_en) : (p.title_en || p.title_es); },
            path() { try { const c = collection.normalize(); return (typeof c.atlasPath === 'string' && c.atlasPath) ? c.atlasPath : null; } catch (e) { return null; } },
            pathRegion(pathId) { const p = this.pathDef(pathId || this.path()); return p ? p.region : null; },
            setPath(id) {
                const p = this.pathDef(id); if (!p) return false;
                const c = collection.normalize();
                const prev = c.atlasPath;
                c.atlasPath = p.id;
                try { game.save(); } catch (e) {}
                try { gx.toast(t(prev ? 'path_change_toast' : 'path_set_toast', { name: this.pathTitle(p.id) })); } catch (e2) {}
                try { tutorial.notify('path_set'); } catch (e6) {}
                this.checkChapterUnlocks(true);
                try { game.updateLore(); } catch (e3) {}
                try { soupEvolution.onPathSet(); } catch (e5) {}
                try { collection.render(true); } catch (e4) {}
                return true;
            },
            packRegion(packId) { const meta = this.packMeta(packId); return meta ? meta.region : null; },
            skinInPath(skinId, pathId) {
                const region = this.pathRegion(pathId || this.path());
                if (!region) return false;
                const pack = this.packFor(skinId);
                return pack ? this.packRegion(pack) === region : false;
            },
            regionPacks(regionId) {
                const m = this.raw(); if (!m || !Array.isArray(m.regions)) return [];
                for (let i = 0; i < m.regions.length; i++) if (m.regions[i].id === regionId) return m.regions[i].packs || [];
                return [];
            },
            pathCompleteSets(pathId) {
                const p = this.pathDef(pathId || this.path()); if (!p) return 0;
                const packs = this.regionPacks(p.region);
                let n = 0;
                for (let i = 0; i < packs.length; i++) if (this.packProgress(packs[i]).complete) n++;
                return n;
            },
            unlockedChapters(pathId) {
                const p = this.pathDef(pathId || this.path()); if (!p || !Array.isArray(p.chapters)) return [];
                const sets = this.pathCompleteSets(p.id);
                const out = [];
                for (let i = 0; i < p.chapters.length; i++) {
                    const ch = p.chapters[i];
                    if (sets >= (ch.needSets || 0)) out.push(ch);
                }
                return out;
            },
            adventureChronicle() {
                const pid = this.path(); if (!pid) return '';
                const chapters = this.unlockedChapters(pid);
                if (!chapters.length) return '';
                const ch = chapters[chapters.length - 1];
                const title = (LANG === 'es') ? (ch.title_es || ch.title_en) : (ch.title_en || ch.title_es);
                const text = (LANG === 'es') ? (ch.text_es || ch.text_en) : (ch.text_en || ch.text_es);
                return '— ' + title + ' —\n' + text;
            },
            raw() { try { return window.ESQUELOTIA_ATLAS || null; } catch (e) { return null; } },
            goalTotal() { const m = this.raw(); return (m && m.goalTotal) ? m.goalTotal : 1000; },
            bonusPctPerSet() { const m = this.raw(); return (m && m.setBonusPct) ? m.setBonusPct : 1; },
            packFor(skinId) { const m = this.raw(); return (m && m.skinPack && m.skinPack[skinId]) ? m.skinPack[skinId] : null; },
            packMeta(packId) { const m = this.raw(); return (m && m.packs && m.packs[packId]) ? m.packs[packId] : null; },
            packTitle(pack) {
                if (!pack) return '';
                const meta = typeof pack === 'string' ? this.packMeta(pack) : pack;
                if (!meta) return String(pack);
                return (LANG === 'es') ? (meta.title_es || meta.title_en || meta.id) : (meta.title_en || meta.title_es || meta.id);
            },
            /** Player-facing set name — hides internal batch labels like "Wave 3 · …". */
            packDisplayTitle(pack) {
                let title = this.packTitle(pack);
                if (!title) return '';
                title = title.replace(/^Wave\s*\d+\s*[·•\-–—]\s*/i, '');
                title = title.replace(/^Wave\s*\d+\s+/i, '');
                return title.trim() || this.packTitle(pack);
            },
            ownedCount() { try { return collection.distinctCount(); } catch (e) { return 0; } },
            packProgress(packId) {
                const meta = this.packMeta(packId);
                if (!meta || !Array.isArray(meta.skinIds)) return { owned: 0, total: 0, complete: false, pct: 0 };
                const items = (game.coll && game.coll.items) ? game.coll.items : {};
                let owned = 0;
                for (let i = 0; i < meta.skinIds.length; i++) if (items[meta.skinIds[i]]) owned++;
                const total = meta.total || meta.skinIds.length;
                const pct = total ? Math.min(100, Math.round((owned / total) * 100)) : 0;
                return { owned, total, complete: total > 0 && owned >= total, pct };
            },
            packMissingLiveSkins(packId) {
                const meta = this.packMeta(packId);
                if (!meta || !Array.isArray(meta.skinIds)) return [];
                const items = (game.coll && game.coll.items) ? game.coll.items : {};
                const out = [];
                for (let i = 0; i < meta.skinIds.length; i++) {
                    const id = meta.skinIds[i];
                    if (items[id]) continue;
                    const sk = collection.skinById(id);
                    if (!sk || sk.dropLive === false) continue;
                    out.push(sk);
                }
                out.sort((a, b) => (collection.rarRank[b.rarity] || 0) - (collection.rarRank[a.rarity] || 0));
                return out;
            },
            completedPackCount() {
                const m = this.raw(); if (!m || !m.packs) return 0;
                let n = 0;
                for (const k in m.packs) if (this.packProgress(k).complete) n++;
                return n;
            },
            setBonusMult() {
                const n = this.completedPackCount();
                const pct = this.bonusPctPerSet();
                const cap = 15;
                return 1 + (Math.min(cap, n * pct) / 100);
            },
            setBonusPctDisplay() {
                const n = this.completedPackCount();
                const pct = this.bonusPctPerSet();
                const cap = 15;
                return Math.min(cap, n * pct);
            },
            chronicleSnippet() {
                const adv = this.adventureChronicle();
                if (adv) return adv;
                const m = this.raw(); if (!m || !Array.isArray(m.regions)) return '';
                let best = null, bestScore = -1;
                for (let i = 0; i < m.regions.length; i++) {
                    const r = m.regions[i];
                    let owned = 0, complete = 0, packs = r.packs || [];
                    for (let j = 0; j < packs.length; j++) {
                        const pr = this.packProgress(packs[j]);
                        owned += pr.owned;
                        if (pr.complete) complete++;
                    }
                    const score = complete * 1000 + owned;
                    if (score > 0 && score > bestScore) { bestScore = score; best = r; }
                }
                if (!best) return '';
                return (LANG === 'es') ? (best.chronicle_es || best.chronicle_en || '') : (best.chronicle_en || best.chronicle_es || '');
            },
            ensureAnnounced() {
                const c = collection.normalize();
                if (!c.atlasAnnounced || typeof c.atlasAnnounced !== 'object') c.atlasAnnounced = {};
                return c.atlasAnnounced;
            },
            ensureChapterAnnounced() {
                const c = collection.normalize();
                if (!c.atlasChapterAnnounced || typeof c.atlasChapterAnnounced !== 'object') c.atlasChapterAnnounced = {};
                return c.atlasChapterAnnounced;
            },
            checkChapterUnlocks(forceAll) {
                const pid = this.path(); if (!pid) return;
                const p = this.pathDef(pid); if (!p) return;
                const ann = this.ensureChapterAnnounced();
                const unlocked = this.unlockedChapters(pid);
                for (let i = 0; i < unlocked.length; i++) {
                    const ch = unlocked[i];
                    const key = pid + ':' + ch.id;
                    if (!forceAll && ann[key]) continue;
                    if (forceAll && ch.needSets > 0) continue;
                    if (!ann[key]) {
                        ann[key] = 1;
                        if (ch.needSets > 0 || forceAll) {
                            const title = (LANG === 'es') ? (ch.title_es || ch.title_en) : (ch.title_en || ch.title_es);
                            if (ch.needSets > 0) {
                                const eb = this.chapterRewardEb(ch.needSets);
                                if (eb > 0) {
                                    game.e += eb;
                                    game.te += eb;
                                    try { game.part(window.innerWidth / 2, window.innerHeight * 0.42, 'magic'); } catch (e0) {}
                                    try { gx.toast(t('path_chapter_reward', { title: title, eb: eb.toLocaleString() })); } catch (e1) {}
                                    try { game.save(); } catch (e2) {}
                                } else {
                                    try { gx.toast(t('path_chapter_toast', { title: title })); } catch (e) {}
                                }
                            } else {
                                try { gx.toast(t('path_chapter_toast', { title: title })); } catch (e) {}
                            }
                        }
                    }
                }
                try { game.updateLore(); } catch (e2) {}
            },
            chapterRewardEb(needSets) {
                const n = Math.floor(Number(needSets) || 0);
                if (n <= 0) return 0;
                const base = { 1: 8000, 2: 22000, 3: 45000, 4: 75000 }[n] || (n * 12000);
                const era = Number.isFinite(game.s) ? game.s : 0;
                return Math.floor(base * Math.pow(1.55, era));
            },
            checkNewCompletions() {
                const m = this.raw(); if (!m || !m.packs) return;
                const ann = this.ensureAnnounced();
                const pct = this.bonusPctPerSet();
                for (const packId in m.packs) {
                    const pr = this.packProgress(packId);
                    if (!pr.complete || ann[packId]) continue;
                    ann[packId] = 1;
                    this.celebrateSetComplete(packId, pct);
                }
                this.checkChapterUnlocks(false);
                try { soupEvolution.onProgress(); } catch (e4) {}
                try { const cm = document.getElementById('chronicle-modal'); if (cm && cm.classList.contains('open')) atlas.renderChronicleModal(); } catch (e3) {}
            },
            celebrateSetComplete(packId, pct) {
                const name = this.packTitle(packId);
                try { sound.play('victory'); } catch (e) {}
                try {
                    const cx = window.innerWidth / 2, cy = window.innerHeight * 0.45;
                    game.part(cx, cy, 'magic');
                    for (let i = 0; i < 6; i++) {
                        setTimeout(() => { try { game.part(cx + (Math.random() - 0.5) * 120, cy + (Math.random() - 0.5) * 80, 'energy'); } catch (e2) {} }, i * 90);
                    }
                } catch (e3) {}
                try { gx.toast(t('coll_set_complete', { name: name, pct: pct })); } catch (e4) {}
                try {
                    const ov = document.getElementById('set-celebrate');
                    const title = document.getElementById('set-celebrate-title');
                    const sub = document.getElementById('set-celebrate-sub');
                    if (ov && title && sub) {
                        title.textContent = t('coll_set_complete', { name: name, pct: pct });
                        sub.textContent = t('coll_set_celebrate_sub', { pct: pct });
                        ov.classList.add('show');
                        ov.setAttribute('aria-hidden', 'false');
                        clearTimeout(this._celebrateT);
                        this._celebrateT = setTimeout(() => {
                            try { ov.classList.remove('show'); ov.setAttribute('aria-hidden', 'true'); } catch (e5) {}
                        }, 3200);
                    }
                } catch (e6) {}
                try { objective.sync(); } catch (e7) {}
            },
            openPathModal() {
                const md = document.getElementById('atlas-path-modal'); if (!md) return;
                this.renderPathChoices();
                md.classList.add('open');
            },
            closePathModal() {
                const md = document.getElementById('atlas-path-modal'); if (md) md.classList.remove('open');
            },
            renderPathChoices() {
                const host = document.getElementById('atlas-path-choices'); if (!host) return;
                const cur = this.path();
                let html = '';
                for (let i = 0; i < this.PATHS.length; i++) {
                    const p = this.PATHS[i];
                    const title = (LANG === 'es') ? (p.title_es || p.title_en) : (p.title_en || p.title_es);
                    const tag = (LANG === 'es') ? (p.tagline_es || p.tagline_en) : (p.tagline_en || p.tagline_es);
                    const packs = this.regionPacks(p.region);
                    const sets = this.pathCompleteSets(p.id);
                    const cls = (cur === p.id) ? 'path-choice active' : 'path-choice';
                    const pid = String(p.id).replace(/'/g, "\\'");
                    html += `<button type="button" class="${cls}" onclick="atlas.pickPath('${pid}')"><div class="path-choice-hd">${p.emoji || '🗺️'} ${title}</div><div class="path-choice-sub">${tag}</div><div class="path-choice-meta">${packs.length ? (sets + '/' + packs.length + ' sets') : (LANG === 'es' ? 'Próximamente' : 'Coming soon')}</div></button>`;
                }
                host.innerHTML = html;
            },
            pickPath(id) {
                if (!this.setPath(id)) return;
                this.closePathModal();
            },
            renderPathCard() {
                const pid = this.path();
                if (!pid) {
                    return `<div class="atlas-path-card"><div class="atlas-path-card-hd">🧭 ${t('path_choose_title')}</div><div class="atlas-path-card-sub">${t('path_choose_hint')}</div><div class="atlas-path-actions"><button type="button" class="gx-btn sm" onclick="atlas.openPathModal()">${t('path_choose')}</button></div></div>`;
                }
                const p = this.pathDef(pid);
                const chapters = this.unlockedChapters(pid);
                const totalCh = (p && p.chapters) ? p.chapters.length : 0;
                return `<div class="atlas-path-card"><div class="atlas-path-card-hd">${p.emoji || '🗺️'} ${t('path_current', { name: this.pathTitle(pid) })}</div><div class="atlas-path-card-sub">${(LANG === 'es') ? (p.tagline_es || p.tagline_en) : (p.tagline_en || p.tagline_es)} · ${t('path_drop_bias')}</div><div class="atlas-path-chapters">${t('path_chapters', { n: chapters.length, total: totalCh })}</div><div class="atlas-path-actions"><button type="button" class="gx-btn sm" onclick="atlas.openChronicleModal()">${t('chronicle_modal_title')}</button><button type="button" class="gx-btn sm" onclick="atlas.openPathModal()">${t('path_change')}</button></div></div>`;
            },
            openChronicleModal() {
                const pid = this.path();
                if (!pid) { try { this.openPathModal(); } catch (e) {} return; }
                const md = document.getElementById('chronicle-modal'); if (!md) return;
                const sub = document.getElementById('chronicle-modal-sub');
                if (sub) sub.textContent = t('chronicle_modal_sub', { path: this.pathTitle(pid) });
                this.renderChronicleModal();
                md.classList.add('open');
            },
            closeChronicleModal() {
                const md = document.getElementById('chronicle-modal'); if (md) md.classList.remove('open');
            },
            renderChronicleModal() {
                const host = document.getElementById('chronicle-modal-list'); if (!host) return;
                const pid = this.path(); if (!pid) { host.innerHTML = ''; return; }
                const p = this.pathDef(pid); if (!p || !p.chapters) { host.innerHTML = ''; return; }
                const sets = this.pathCompleteSets(pid);
                let html = '';
                for (let i = 0; i < p.chapters.length; i++) {
                    const ch = p.chapters[i];
                    const unlocked = sets >= (ch.needSets || 0);
                    const title = (LANG === 'es') ? (ch.title_es || ch.title_en) : (ch.title_en || ch.title_es);
                    const text = (LANG === 'es') ? (ch.text_es || ch.text_en) : (ch.text_en || ch.text_es);
                    const cls = unlocked ? 'chronicle-ch unlocked' : 'chronicle-ch locked';
                    html += `<div class="${cls}"><div class="chronicle-ch-hd">${unlocked ? '✓' : '🔒'} ${title}</div>`;
                    if (unlocked) html += `<div class="chronicle-ch-tx">${text}</div>`;
                    else html += `<div class="chronicle-ch-req">${t('chronicle_modal_locked', { n: ch.needSets || 0 })}</div>`;
                    html += '</div>';
                }
                host.innerHTML = html;
                const saga = this.PRESTIGE_SAGA;
                if (saga && saga.length) {
                    html += `<h3 class="museum-region-hd" style="margin-top:14px">${t('chronicle_prestige_section')}</h3>`;
                    const prestige = Number.isFinite(game.s) ? game.s : 0;
                    for (let si = 0; si < saga.length; si++) {
                        const ch = saga[si];
                        const unlocked = prestige >= (ch.needPrestige || 0);
                        const title = (LANG === 'es') ? (ch.title_es || ch.title_en) : (ch.title_en || ch.title_es);
                        const text = (LANG === 'es') ? (ch.text_es || ch.text_en) : (ch.text_en || ch.text_es);
                        const cls = unlocked ? 'chronicle-ch unlocked' : 'chronicle-ch locked';
                        html += `<div class="${cls}"><div class="chronicle-ch-hd">${unlocked ? '✓' : '🔒'} ${title}</div>`;
                        if (unlocked) html += `<div class="chronicle-ch-tx">${text}</div>`;
                        else html += `<div class="chronicle-ch-req">${t('chronicle_prestige_locked', { n: ch.needPrestige || 0 })}</div>`;
                        html += '</div>';
                    }
                    host.innerHTML = html;
                }
            },
            ensurePrestigeSagaAnnounced() {
                const c = collection.normalize();
                if (!c.prestigeSagaAnnounced || typeof c.prestigeSagaAnnounced !== 'object') c.prestigeSagaAnnounced = {};
                return c.prestigeSagaAnnounced;
            },
            checkPrestigeChapters(prestige, silent) {
                const ann = this.ensurePrestigeSagaAnnounced();
                const saga = this.PRESTIGE_SAGA;
                if (!saga || !saga.length) return;
                for (let i = 0; i < saga.length; i++) {
                    const ch = saga[i];
                    if (!ch || ann[ch.id]) continue;
                    if (prestige < (ch.needPrestige || 0)) continue;
                    ann[ch.id] = 1;
                    if (silent) continue;
                    const title = (LANG === 'es') ? (ch.title_es || ch.title_en) : (ch.title_en || ch.title_es);
                    try { gx.toast(t('path_chapter_toast', { title: title })); } catch (e) {}
                }
                try { game.save(); } catch (e2) {}
                try { game.updateLore(); } catch (e3) {}
            },
            renderPanel() {
                const host = document.getElementById('collection-atlas'); if (!host) return;
                const m = this.raw();
                if (!m || !Array.isArray(m.regions)) {
                    host.innerHTML = `<div style="color:#94a3b8;font-size:0.82rem;padding:12px">${t('coll_empty')}</div>`;
                    return;
                }
                const focusRegion = this.pathRegion();
                let html = this.renderPathCard();
                for (let ri = 0; ri < m.regions.length; ri++) {
                    const r = m.regions[ri];
                    const packs = r.packs || [];
                    if (!packs.length) continue;
                    let regionOwned = 0, regionTotal = 0, regionComplete = 0;
                    for (let pi = 0; pi < packs.length; pi++) {
                        const pr = this.packProgress(packs[pi]);
                        regionOwned += pr.owned;
                        regionTotal += pr.total;
                        if (pr.complete) regionComplete++;
                    }
                    const regionTitle = (LANG === 'es') ? (r.title_es || r.title_en) : (r.title_en || r.title_es);
                    const regionChron = (LANG === 'es') ? (r.chronicle_es || r.chronicle_en) : (r.chronicle_en || r.chronicle_es);
                    let regionCls = 'atlas-region';
                    if (focusRegion) {
                        if (r.id === focusRegion) regionCls += ' path-focus';
                        else regionCls += ' path-dim';
                    }
                    html += `<section class="${regionCls}"><h3 class="atlas-region-hd"><span>${r.emoji || '🗺️'}</span><span>${regionTitle}</span><span style="margin-left:auto;font-size:0.62rem;color:#94a3b8">${regionOwned}/${regionTotal}${regionComplete ? ' · ' + regionComplete + '✓' : ''}</span></h3>`;
                    if (regionChron) html += `<p class="atlas-region-sub">${regionChron}</p>`;
                    html += '<div class="atlas-pack-grid">';
                    for (let pi = 0; pi < packs.length; pi++) {
                        const packId = packs[pi];
                        const pr = this.packProgress(packId);
                        const cls = pr.complete ? ' complete' : '';
                        const pid = String(packId).replace(/'/g, "\\'");
                        html += `<button type="button" class="atlas-pack${cls}" onclick="collection.openPack('${pid}')"><div class="atlas-pack-name">${this.packTitle(packId)}</div><div class="atlas-pack-bar"><div class="atlas-pack-fill" style="width:${pr.pct}%"></div></div><div class="atlas-pack-meta">${pr.owned}/${pr.total}${pr.complete ? ' ✓' : ''}</div></button>`;
                    }
                    html += '</div></section>';
                }
                host.innerHTML = html || `<div style="color:#94a3b8;font-size:0.82rem;padding:12px">${t('coll_empty')}</div>`;
            },
            museumLore(packId, regionChron) {
                if (regionChron) return regionChron;
                const name = this.packDisplayTitle(packId);
                return t('museum_lore_default') + ' — ' + name;
            },
            renderMuseumPanel() {
                const host = document.getElementById('collection-museum'); if (!host) return;
                const m = this.raw();
                if (!m || !Array.isArray(m.regions)) {
                    host.innerHTML = `<div style="color:#94a3b8;font-size:0.82rem;padding:12px">${t('coll_empty')}</div>`;
                    return;
                }
                const c = collection.normalize();
                const claimed = (c.museumClaimed && typeof c.museumClaimed === 'object') ? c.museumClaimed : {};
                let html = `<p style="font-size:0.72rem;color:#94a3b8;margin:0 0 10px">${t('museum_sub')}</p>`;
                for (let ri = 0; ri < m.regions.length; ri++) {
                    const r = m.regions[ri];
                    const packs = r.packs || [];
                    if (!packs.length) continue;
                    const regionTitle = (LANG === 'es') ? (r.title_es || r.title_en) : (r.title_en || r.title_es);
                    const regionChron = (LANG === 'es') ? (r.chronicle_es || r.chronicle_en) : (r.chronicle_en || r.chronicle_es);
                    html += `<h3 class="museum-region-hd">${r.emoji || '🏛️'} ${regionTitle}</h3>`;
                    for (let pi = 0; pi < packs.length; pi++) {
                        const packId = packs[pi];
                        const pr = this.packProgress(packId);
                        const pid = String(packId).replace(/'/g, "\\'");
                        const title = this.packDisplayTitle(packId);
                        const lore = this.museumLore(packId, regionChron);
                        const cls = pr.complete ? ' complete' : '';
                        let action = '';
                        if (pr.complete && claimed[packId]) action = `<span style="color:#4ade80;font-size:0.68rem;font-weight:bold">${t('museum_claimed')}</span>`;
                        else if (pr.complete) action = `<button type="button" class="gx-btn sm" onclick="collection.claimMuseumPlaque('${pid}')">${t('museum_claim')}</button>`;
                        else action = `<span style="font-size:0.62rem;color:#64748b">${pr.owned}/${pr.total}</span>`;
                        html += `<div class="museum-pack${cls}"><div class="museum-pack-hd"><span>${title}${pr.complete ? ' · ' + t('museum_complete') : ''}</span><span>${pr.owned}/${pr.total}</span></div><div class="museum-pack-lore">${lore}</div><div class="atlas-pack-bar"><div class="atlas-pack-fill" style="width:${pr.pct}%"></div></div><div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:8px">${action}<button type="button" class="gx-btn sm" style="font-size:0.62rem" onclick="collection.openPack('${pid}')">${t('coll_tab_all')}</button></div></div>`;
                    }
                }
                host.innerHTML = html;
            }
        };
})(typeof window !== 'undefined' ? window : this);
