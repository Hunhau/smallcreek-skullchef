/* Grand Prix races — global prix. */
(function (global) {
    'use strict';

    global.prix = {
            a:false, rs:[], tk:null, cdIv:null, ch:null, w:false, _pendingReward: null,
            LEAGUES: [
                { crowns: 0, en: 'Bronze Ladles', es: 'Cucharas Bronce', emoji: '🥉', ai: 5.8, ebMult: 1 },
                { crowns: 3, en: 'Silver Stirrers', es: 'Remos Plata', emoji: '🥈', ai: 6.6, ebMult: 1.12 },
                { crowns: 10, en: 'Golden Broth', es: 'Caldo Dorado', emoji: '🥇', ai: 7.4, ebMult: 1.25 },
                { crowns: 25, en: 'Esqueletia Elite', es: 'Élite Esqueletia', emoji: '👑', ai: 8.2, ebMult: 1.4 }
            ],
            totalCrowns() {
                let n = 0;
                try { game.cp.forEach(c => { n += (c.ch || 0); }); } catch (e) {}
                return n;
            },
            leagueIdx() {
                const n = this.totalCrowns();
                let idx = 0;
                for (let i = 0; i < this.LEAGUES.length; i++) if (n >= this.LEAGUES[i].crowns) idx = i;
                return idx;
            },
            leagueInfo() {
                const idx = this.leagueIdx();
                const L = this.LEAGUES[idx];
                const name = (LANG === 'es') ? (L.es || L.en) : (L.en || L.es);
                const next = this.LEAGUES[idx + 1];
                return { idx, name, emoji: L.emoji, ai: L.ai, ebMult: L.ebMult, crowns: this.totalCrowns(), nextAt: next ? next.crowns : null };
            },
            syncLeagueUi() {
                const el = document.getElementById('prix-league-bar');
                if (!el) return;
                const L = this.leagueInfo();
                let txt = t('prix_league', { emoji: L.emoji, name: L.name, crowns: L.crowns });
                if (L.nextAt != null) txt += ' · ' + t('prix_league_next', { n: L.nextAt });
                el.textContent = txt;
            },
            _hideSkirmish() {
                try {
                    if (typeof skirmish !== 'undefined') {
                        if (skirmish.stopLoop) skirmish.stopLoop();
                        skirmish.active = false;
                        skirmish._pendingReward = null;
                    }
                    const sm = document.getElementById('skirmish-modal');
                    if (sm) sm.style.display = 'none';
                } catch (e) {}
            },
            _closeModal() {
                if (this.tk) { clearInterval(this.tk); this.tk = null; }
                if (this.cdIv) { clearInterval(this.cdIv); this.cdIv = null; }
                this.stopFx();
                this.a = false;
                const rm = document.getElementById('race-modal');
                if (rm) rm.style.display = 'none';
                try { document.body.classList.remove('prix-open'); } catch (e) {}
            },
            abandon() {
                this._pendingReward = null;
                this.w = false;
                this._closeModal();
                game.p = false;
                try { if (typeof collection !== 'undefined') collection.restoreSceneAfterMinigame(); } catch (e) {}
            },
            open() {
                if (!game || !game.cp) return;
                if (!game.minigameUnlocked || !game.minigameUnlocked()) return;
                if (game.cd > 0) {
                    const mm = String(Math.floor(game.cd / 60)).padStart(2, '0');
                    const ss = String(game.cd % 60).padStart(2, '0');
                    try { gx.toast(t('prix_cd', { mm: mm, ss: ss })); } catch (e) {}
                    return;
                }
                this._hideSkirmish();
                this._pendingReward = null;
                try { if (typeof collection !== 'undefined') collection.snapshotMainEquips(); } catch (e0) {}
                try { if (typeof collection !== 'undefined') collection.enterSceneLoadout('prix'); } catch (e0b) {}
                try { if (typeof mobileUI !== 'undefined') mobileUI.closeAll(); } catch (e) {}
                try { document.body.classList.add('prix-open'); } catch (e1) {}
                game.p = true;
                const rm = document.getElementById('race-modal');
                const sel = document.getElementById('p-sel');
                const run = document.getElementById('p-run');
                const end = document.getElementById('p-end');
                if (!rm || !sel) return;
                rm.style.display = 'flex';
                sel.style.display = 'block';
                if (run) run.style.display = 'none';
                if (end) end.style.display = 'none';
                this.syncLeagueUi();
                this.refreshList();
            },
            refreshList() {
                const l = document.getElementById('p-list'); if (!l) return; l.innerHTML = '';
                try { collection.renderMinigameEquipBar('prix-equip-bar', 'prix'); } catch (e0) {}
                game.cp.filter(c => c.lv > 0).forEach(c => { const d = document.createElement('div'); d.className = 'p-sel-card'; let imgSrc = c.im; try { imgSrc = collection.sceneImgForHelper(c.id, 'prix'); } catch (e) {} let cardHtml = ''; try { cardHtml = collection.helperEquipCardHtml(c.id, 'prix'); } catch (e2) { cardHtml = `<p>${t(c.nk)}</p>`; } d.innerHTML = `<img src="${imgSrc}" loading="lazy" decoding="async">${cardHtml}`; d.onclick = () => this.start(c); l.appendChild(d); });
            },
            start(c) {
                if (this.tk) { clearInterval(this.tk); this.tk = null; }
                if (this.cdIv) { clearInterval(this.cdIv); this.cdIv = null; }
                this.a = false; this.w = false; this.ch = c; this.stopFx(); document.getElementById('p-sel').style.display='none'; document.getElementById('p-run').style.display='flex';
                for(let i=0; i<5; i++) document.getElementById(`l-${i}`).innerHTML = '';
                const raceIm = (id) => { try { return collection.sceneImgForHelper(id, 'prix'); } catch (e) { return game.cp[id] ? game.cp[id].im : ''; } };
                this.rs = [{id:c.id, pos:0, im:raceIm(c.id), isP:true, lane:0}, ...game.cp.filter(co=>co.id!==c.id).map((co,i)=>({id:co.id, pos:0, im:raceIm(co.id), isP:false, lane:i+1}))];
                this.rs.forEach(r => { const im = document.createElement('img'); im.id=`r-${r.lane}`; im.src=r.im; im.className='racer-img'; im.loading='lazy'; im.decoding='async'; document.getElementById(`l-${r.lane}`).appendChild(im); });
                let t = 3; const b = document.getElementById('p-timer');
                this.cdIv = setInterval(() => { b.innerText = t > 0 ? t : "GO!"; if(t < 0) { clearInterval(this.cdIv); this.cdIv = null; b.innerText = ""; this.begin(); } t--; }, 1000);
            },
            begin() { if (this.tk) clearInterval(this.tk); this.a = true;
                const tr = document.getElementById('race-track'); if(tr) tr.classList.add('racing');
                this.rs.forEach(r => { const el = document.getElementById(`r-${r.lane}`); if(el) el.classList.add('run'); });
                const ai = this.leagueInfo().ai;
                this.tk = setInterval(() => {
                    this.rs.slice(1).forEach(r => { r.pos += Math.random() * ai; });
                    this.upd();
                    this.check();
                }, 100); },
            pClick() { if(this.a) { this.rs[0].pos += 8 * (this.ch ? helperBond.prixStirMult(this.ch.id) : 1); this.upd(); } },
            upd() { let lead = 0; this.rs.forEach(r => { const el = document.getElementById(`r-${r.lane}`); if(el) el.style.bottom = (10+(r.pos/100)*75)+'%'; if(r.pos > lead) lead = r.pos; });
                const tr = document.getElementById('race-track'); if(tr) tr.style.animationDuration = (0.7 - Math.min(lead,100)/100*0.48).toFixed(2)+'s'; },
            stopFx() { const tr = document.getElementById('race-track'); if(tr) { tr.classList.remove('racing'); tr.style.animationDuration = ''; } this.rs.forEach(r => { const el = document.getElementById(`r-${r.lane}`); if(el) el.classList.remove('run'); }); },
            check() { const w = this.rs.find(r => r.pos >= 100); if(w) { this.a = false; clearInterval(this.tk); this.stopFx(); this.w = w.isP; this.end(); } },
            end() {
                document.getElementById('p-run').style.display = 'none';
                const pe = document.getElementById('p-end');
                pe.style.display = 'block';
                const rm = document.getElementById('race-modal');
                if (rm) rm.scrollTop = 0;
                const r = document.getElementById('p-rank');
                const box = document.getElementById('p-reward-box');
                const icon = document.getElementById('p-reward-icon');
                const m = document.getElementById('p-reward');
                const d = document.getElementById('p-reward-detail');
                if (this.w) {
                    const prevCrowns = this.ch.ch || 0;
                    const newCrowns = prevCrowns + 1;
                    const newMult = game.champMult(newCrowns);
                    const helperName = t(this.ch.nk);
                    game.prixStreak = Math.max(1, (game.prixStreak || 0) + 1);
                    const leagueMult = this.leagueInfo().ebMult;
                    const streakBonus = Math.floor(5000 * game.prixStreak * (1 + game.s * 0.5) * leagueMult);
                    if (streakBonus > 0) { game.e += streakBonus; game.te += streakBonus; game.track('eb', streakBonus); }
                    if (r) r.innerText = t('first_place');
                    if (box) box.classList.remove('defeat');
                    if (icon) icon.textContent = '👑';
                    if (m) m.innerText = t('prix_win_reward', { name: helperName, crowns: newCrowns });
                    let detail = t('prix_win_bonus', { mult: newMult }) + '\n' + t('prix_win_hint');
                    if (leagueMult > 1) detail += '\n' + t('prix_league_bonus', { mult: leagueMult });
                    if (game.prixStreak >= 2) detail += '\n' + t('prix_streak_bonus', { n: game.prixStreak, eb: streakBonus.toLocaleString() });
                    else if (streakBonus > 0) detail += '\n+' + streakBonus.toLocaleString() + ' EB';
                    if (d) d.innerText = detail;
                    this.ch.ch = newCrowns;
                    try { helperBond.add(this.ch.id, 10); } catch (e) {}
                    game.track('crowns', 1);
                    try { leaderboard.bumpPrixWin(); if (typeof isPlayablesEnv !== 'function' || !isPlayablesEnv()) leaderboard.submit({ prix: leaderboard.getPrixWins() }); } catch (e) {}
                    ach.grant('firstChamp');
                    try { game.save(); } catch (e) {}
                    let toast = t('prix_win_toast', {
                        name: helperName,
                        crowns: newCrowns,
                        mult: newMult,
                    });
                    if (game.prixStreak >= 2) toast += '\n' + t('prix_streak_toast', { n: game.prixStreak, eb: streakBonus.toLocaleString() });
                    this._pendingReward = toast;
                } else {
                    game.prixStreak = 0;
                    try { if (this.ch) helperBond.add(this.ch.id, 3, true); } catch (e0) {}
                    const p = Math.floor(1e6 * Math.pow(5, game.s) * 0.01);
                    if (r) r.innerText = t('defeat');
                    if (box) box.classList.add('defeat');
                    if (icon) icon.textContent = '💫';
                    if (m) m.innerText = t('awarded_eb', { eb: p.toLocaleString() });
                    if (d) d.innerText = t('prix_loss_detail');
                    game.e += p;
                    game.te += p;
                    game.track('eb', p);
                    this._pendingReward = t('prix_loss_toast', { eb: p.toLocaleString() });
                }
                try { game.rebuild(); } catch (e) {}
                game.render();
            },
            ret() {
                if (this.tk) { clearInterval(this.tk); this.tk = null; }
                if (this.cdIv) { clearInterval(this.cdIv); this.cdIv = null; }
                this.stopFx();
                game.cd = game.getPrixCd();
                const rewardToast = this._pendingReward;
                this._pendingReward = null;
                document.getElementById('race-modal').style.display = 'none';
                try { document.body.classList.remove('prix-open'); } catch (e) {}
                const won = this.w;
                this.w = false;
                try { game.syncMinigameButtons(); } catch (e0) {}
                if (won) {
                    try { document.body.classList.add('coronation-active'); if (typeof mobileUI !== 'undefined') mobileUI.closeAll(); } catch (e) {}
                    game.coron(this.ch, rewardToast, { loadoutKey: 'prix' });
                } else {
                    game.p = false;
                    try { if (typeof collection !== 'undefined') collection.restoreSceneAfterMinigame(); } catch (e1) {}
                    if (rewardToast) { try { gx.toast(rewardToast); } catch (e) {} }
                }
            },
            wireButtons() {
                const bind = (el) => {
                    if (!el || el._prixBound) return;
                    el._prixBound = true;
                    const run = (e) => {
                        if (e) { e.preventDefault(); e.stopPropagation(); }
                        this.open();
                    };
                    el.addEventListener('pointerup', run, { passive: false });
                };
                bind(document.getElementById('prix-fab'));
            }
        };

    try {
        const run = () => { try { global.prix.wireButtons(); } catch (e) {} };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
        else run();
    } catch (e) {}
})(typeof window !== 'undefined' ? window : this);
