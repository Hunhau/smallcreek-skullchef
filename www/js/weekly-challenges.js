/* Weekly community goal + Soup Boss — loaded before main game script; uses game/quests/t at runtime. */
(function (global) {
    'use strict';

    global.commChallenge = {
        weekKey() { try { return quests.weekKey(); } catch (e) { return ''; } },
        ensure() {
            const wk = this.weekKey();
            if (!wk) return;
            if (!game.comm || game.comm.week !== wk) {
                let cps = 100;
                try { cps = Math.max(100, game.getCps()); } catch (e) {}
                const buffUntil = (game.comm && game.comm.buffUntil > Date.now()) ? game.comm.buffUntil : 0;
                game.comm = { week: wk, prog: 0, goal: Math.max(5000000, Math.floor(cps * 8000)), done: false, buffUntil: buffUntil };
                try { game.save(); } catch (e2) {}
            }
        },
        bump(n) {
            this.ensure();
            if (!game.comm || game.comm.done) return;
            const add = Math.max(0, Math.floor(Number(n) || 0));
            if (!add) return;
            game.comm.prog = Math.min(game.comm.goal, (game.comm.prog || 0) + add);
            if (game.comm.prog >= game.comm.goal) this.complete();
        },
        complete() {
            if (!game.comm || game.comm.done) return;
            game.comm.done = true;
            game.comm.buffUntil = Date.now() + 86400000;
            try { ach.grant('commGoal'); } catch (e0) {}
            try { gx.toast(t('comm_weekly_done')); } catch (e) {}
            try { this.syncUi(); } catch (e1) {}
            try { game.save(); } catch (e2) {}
        },
        buffTimeLeft() {
            if (!game.comm || !game.comm.buffUntil || game.comm.buffUntil <= Date.now()) return '';
            const sec = Math.max(0, Math.floor((game.comm.buffUntil - Date.now()) / 1000));
            const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
            if (h > 0) return h + 'h ' + m + 'm';
            if (m > 0) return m + 'm';
            return sec + 's';
        },
        syncUi() {
            const el = document.getElementById('comm-chip');
            if (!el) return;
            this.ensure();
            if (game.comm && game.comm.buffUntil > Date.now()) {
                const txt = t('comm_chip', { time: this.buffTimeLeft() });
                if (el.textContent !== txt) el.textContent = txt;
                el.style.display = 'block';
            } else if (game.comm && !game.comm.done && game.comm.goal) {
                const pct = this.pct();
                if (pct > 0) {
                    const txt = t('comm_chip_prog', { pct: pct });
                    if (el.textContent !== txt) el.textContent = txt;
                    el.style.display = 'block';
                } else if (el.style.display !== 'none') el.style.display = 'none';
            } else if (el.style.display !== 'none') {
                el.style.display = 'none';
            }
        },
        dropMult() {
            if (game.comm && game.comm.buffUntil > Date.now()) return 1.15;
            return 1;
        },
        pct() {
            if (!game.comm || !game.comm.goal) return 0;
            return Math.min(100, Math.floor((game.comm.prog || 0) / game.comm.goal * 100));
        },
        questHtml() {
            this.ensure();
            if (!game.comm) return '';
            const pct = this.pct();
            const done = game.comm.done || game.comm.buffUntil > Date.now();
            return `<div style="font-size:0.7rem; color:var(--go); margin:14px 0 6px; letter-spacing:0.06em; text-transform:uppercase">${t('comm_weekly_title')}</div>`
                + `<div style="font-size:0.62rem; color:#94a3b8; margin-bottom:8px">${t('comm_weekly_sub')}</div>`
                + `<div class="quest-row ${done ? 'done2' : ''}"><div style="font-weight:bold; font-size:0.85rem">${done ? t('comm_weekly_done') : t('goal_comm', { pct: pct })}</div>`
                + `<div class="q-bar"><div class="q-fill" style="width:${pct}%"></div></div>`
                + `<span style="font-size:0.7rem; color:#94a3b8">${Math.floor(game.comm.prog || 0).toLocaleString()} / ${game.comm.goal.toLocaleString()} EB</span></div>`;
        }
    };

    global.soupBoss = {
        weekKey() { try { return quests.weekKey(); } catch (e) { return ''; } },
        ensure() {
            const wk = this.weekKey();
            if (!wk) return;
            if (!game.boss || game.boss.week !== wk) {
                let cps = 100;
                try { cps = Math.max(100, game.getCps()); } catch (e) {}
                const max = Math.max(400000, Math.floor(cps * 500));
                game.boss = { week: wk, hp: max, max: max, claimed: false };
                try { game.save(); } catch (e2) {}
            }
        },
        pct() {
            this.ensure();
            if (!game.boss || !game.boss.max) return 0;
            return Math.min(100, Math.floor((1 - (game.boss.hp / game.boss.max)) * 100));
        },
        rewardPreview() {
            let cps = 100;
            try { cps = Math.max(100, game.getCps()); } catch (e) {}
            return Math.max(15000, Math.floor(cps * 180));
        },
        defeated() { this.ensure(); return !!(game.boss && game.boss.hp <= 0); },
        clickDamage() {
            let cps = 100;
            try { cps = Math.max(100, game.getCps()); } catch (e) {}
            return Math.max(80, cps * 0.45);
        },
        damage(amt) {
            this.ensure();
            if (!game.boss || game.boss.claimed || game.boss.hp <= 0) return;
            const dmg = Math.max(0, amt);
            if (dmg > 0) try { quests.bumpWeekly('boss_damage', Math.floor(dmg)); } catch (e0) {}
            game.boss.hp = Math.max(0, game.boss.hp - dmg);
            if (game.boss.hp <= 0) {
                try { ach.grant('soupBoss'); } catch (e0) {}
                try { gx.toast(t('boss_defeated')); } catch (e) {}
                try { quests.updateBadge(); } catch (e2) {}
                try { objective.sync(); } catch (e3) {}
            }
        },
        claim() {
            this.ensure();
            if (!game.boss || game.boss.hp > 0 || game.boss.claimed) return;
            game.boss.claimed = true;
            let cps = 100;
            try { cps = Math.max(100, game.getCps()); } catch (e) {}
            const reward = Math.max(15000, Math.floor(cps * 180));
            game.e += reward;
            game.te += reward;
            game.as += 1;
            try { game.floatNum(window.innerWidth / 2, 200, reward); } catch (e2) {}
            try { sound.play('victory'); } catch (e3) {}
            try { game.save(); } catch (e4) {}
            try { quests.render(); quests.updateBadge(); } catch (e5) {}
        },
        syncUi() {
            const el = document.getElementById('boss-chip');
            if (!el) return;
            this.ensure();
            if (!game.boss || game.boss.claimed) { el.style.display = 'none'; return; }
            const pct = this.pct();
            const txt = t('boss_chip', { pct: pct });
            if (el.textContent !== txt) el.textContent = txt;
            el.style.display = 'block';
        },
        questHtml() {
            this.ensure();
            if (!game.boss) return '';
            const pct = this.pct();
            const cur = Math.max(0, Math.floor(game.boss.max - game.boss.hp));
            let btn;
            if (game.boss.claimed) btn = `<span style="color:#4ade80;font-size:0.75rem;font-weight:bold">${t('claimed')}</span>`;
            else if (game.boss.hp <= 0) {
                let cps = 100;
                try { cps = Math.max(100, game.getCps()); } catch (e) {}
                const reward = Math.max(15000, Math.floor(cps * 180));
                btn = `<button class="gx-btn sm" onclick="soupBoss.claim()">${t('boss_claim', { eb: reward.toLocaleString() })}</button>`;
            } else btn = `<span style="font-size:0.72rem;color:#cbd5e1">${t('goal_boss', { pct: pct })}</span>`;
            return `<div style="font-size:0.7rem; color:#f87171; margin:14px 0 6px; letter-spacing:0.06em; text-transform:uppercase">${t('boss_weekly_title')}</div>`
                + `<div style="font-size:0.62rem; color:#94a3b8; margin-bottom:8px">${t('boss_weekly_sub')}</div>`
                + `<div class="quest-row ${game.boss.hp <= 0 ? 'done2' : ''}"><div style="font-weight:bold;font-size:0.85rem">${t('boss_hp', { cur: cur.toLocaleString(), max: game.boss.max.toLocaleString() })}</div>`
                + `<div class="q-bar"><div class="q-fill" style="width:${pct}%;background:linear-gradient(90deg,#ef4444,#fbbf24)"></div></div><div style="margin-top:6px">${btn}</div></div>`;
        }
    };
})(typeof window !== 'undefined' ? window : this);
