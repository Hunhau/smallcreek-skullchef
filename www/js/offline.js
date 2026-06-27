/* Offline earnings welcome modal. */
(function (global) {
    'use strict';

    global.offline = {
        amt: 0,
        time: '',
        evaluate() {
            const last = game.lastSeen;
            if (!Number.isFinite(last) || last <= 0) return;
            let diff = (Date.now() - last) / 1000;
            if (!Number.isFinite(diff) || diff < 0) return;
            const bal = (typeof BALANCE !== 'undefined' ? BALANCE : {});
            diff = Math.min(diff, bal.offlineMaxSec || 28800);
            if (diff < 60) return;
            const gain = game.getCps() * diff * (bal.offlineCpsMult != null ? bal.offlineCpsMult : 0.5) * game.treeOfflineMult();
            if (!(gain > 0)) return;
            this.amt = gain;
            const h = Math.floor(diff / 3600), mn = Math.floor((diff % 3600) / 60);
            this.time = `${h > 0 ? h + 'h ' : ''}${mn}m`;
            this.renderText();
            const md = document.getElementById('offline-modal');
            if (md) {
                md.classList.add('open', 'offline-celebrate');
                try {
                    game.part(window.innerWidth / 2, window.innerHeight * 0.42, 'magic');
                } catch (e) {}
            }
        },
        renderText() {
            const timeLbl = document.getElementById('offline-time-label');
            if (timeLbl) timeLbl.textContent = t('offline_away', { time: this.time || '0m' });
            const burst = document.getElementById('offline-eb-burst');
            if (burst) burst.textContent = '+' + Math.floor(this.amt).toLocaleString() + ' EB';
            const txt = document.getElementById('offline-text');
            if (txt) txt.innerHTML = t('offline_body', { time: this.time || '0m', eb: Math.floor(this.amt).toLocaleString() });
            const extrasEl = document.getElementById('offline-extras');
            if (extrasEl) {
                const items = [];
                try {
                    farm.ensure();
                    const ready = game.farm.plots.filter(p => farm.plotState(p) === 'ready').length;
                    if (ready > 0) items.push(t('offline_farm_ready', { n: ready }));
                } catch (e) {}
                try {
                    if (game.weekly && game.weekly.menu && Array.isArray(game.weekly.menu.dishes)) {
                        const n = game.weekly.menu.dishes.filter(d => d && d.done && !d.claimed).length;
                        if (n > 0) items.push(typeof scCauldronIcon !== 'undefined' ? scCauldronIcon.prefixText(t('offline_menu_claim', { n: n })) : t('offline_menu_claim', { n: n }));
                    }
                } catch (e2) {}
                try {
                    if (game.daily && game.daily.missions) {
                        const n = game.daily.missions.filter(m => m.done && !m.claimed).length;
                        if (n > 0) items.push(t('offline_quest_claim', { n: n }));
                    }
                } catch (e3) {}
                try {
                    soupBoss.ensure();
                    if (game.boss && game.boss.hp <= 0 && !game.boss.claimed) items.push(t('offline_boss_claim'));
                } catch (e4) {}
                if (items.length) {
                    extrasEl.innerHTML = items.map(x => '<li>' + x + '</li>').join('');
                    extrasEl.style.display = 'block';
                } else {
                    extrasEl.innerHTML = '';
                    extrasEl.style.display = 'none';
                }
            }
            const db = document.getElementById('offline-double-btn');
            if (db) db.style.display = (ads.isAvailable() && rewardSystem.canClaim('offline2')) ? '' : 'none';
        },
        claim() {
            const md = document.getElementById('offline-modal');
            if (this.amt > 0) {
                const cx = window.innerWidth / 2, cy = 170;
                game.e += this.amt; game.te += this.amt;
                game.floatNum(cx, cy, this.amt);
                try { game.part(cx, cy, 'magic'); game.spawnRipple(cx, cy + 20); } catch (e) {}
                try {
                    const sb = document.getElementById('score-box');
                    if (sb) { sb.classList.remove('prestige-return-pulse'); void sb.offsetWidth; sb.classList.add('prestige-return-pulse'); }
                } catch (e) {}
                try { gx.toast(t('offline_welcome_toast')); } catch (e) {}
                try { sound.play('bubble'); } catch (e) {}
                this.amt = 0;
            }
            if (md) { md.classList.remove('open', 'offline-celebrate'); }
        },
        async double() {
            if (ads.isAvailable()) { try { await claimReward('offline2'); } catch (e) {} }
            this.claim();
        }
    };
})(typeof window !== 'undefined' ? window : this);
