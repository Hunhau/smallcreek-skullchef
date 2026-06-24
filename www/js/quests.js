/* Daily + weekly Chef's Orders — global quests. Load before soup-menu / weekly-challenges. */
(function (global) {
    'use strict';

    global.quests = {
        pool: [
            { type: 'clicks', goal: () => 150, reward: () => Math.max(1500, Math.floor(game.getCps() * 150)) + 1500 },
            { type: 'eb', goal: () => Math.max(8000, Math.floor(game.getCps() * 240)) + 8000, reward: () => Math.max(3000, Math.floor(game.getCps() * 200)) + 3000 },
            { type: 'levels', goal: () => 15, reward: () => Math.max(2500, Math.floor(game.getCps() * 180)) + 2500 },
            { type: 'crowns', goal: () => 1, reward: () => 0, shard: true }
        ],
        weeklyPool: [
            { type: 'eb', goal: () => Math.max(400000, Math.floor(game.getCps() * 14400)) + 100000, reward: () => Math.max(25000, Math.floor(game.getCps() * 900)) + 15000 },
            { type: 'levels', goal: () => 35, reward: () => Math.max(20000, Math.floor(game.getCps() * 600)) + 12000 },
            { type: 'clicks', goal: () => 2500, reward: () => Math.max(15000, Math.floor(game.getCps() * 400)) + 8000 },
            { type: 'daily_claims', goal: () => 5, reward: () => 0, shard: true },
            { type: 'boss_damage', goal: () => Math.max(80000, Math.floor(game.getCps() * 350)), reward: () => Math.max(18000, Math.floor(game.getCps() * 500)) + 10000 }
        ],
        weekKey() {
            try {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                const yearStart = new Date(d.getFullYear(), 0, 1);
                const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                return d.getFullYear() + '-W' + String(week).padStart(2, '0');
            } catch (e) { return ''; }
        },
        genWeekly() {
            const order = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5).slice(0, 2);
            return order.map(i => {
                const p = this.weeklyPool[i];
                const goal = p.goal();
                return { type: p.type, goal, prog: 0, done: false, claimed: false, shard: !!p.shard, reward: p.shard ? 0 : p.reward() };
            });
        },
        ensureWeekly() {
            const wk = this.weekKey();
            if (!wk) return;
            if (!game.weekly || game.weekly.week !== wk) {
                game.weekly = { week: wk, counters: { eb: 0, levels: 0, clicks: 0, daily_claims: 0, boss_damage: 0 }, missions: this.genWeekly(), menu: null };
                try { soupMenu.ensure(); } catch (e) {}
                try { game.save(); } catch (e2) {}
                this.updateBadge();
            } else {
                try { soupMenu.ensure(); } catch (e3) {}
                if (game.weekly.counters && game.weekly.counters.boss_damage == null) game.weekly.counters.boss_damage = 0;
            }
        },
        weeklyLabel(m) {
            if (m.type === 'daily_claims') return t('quest_week_daily', { g: m.goal });
            if (m.type === 'eb') return t('quest_week_eb', { g: m.goal.toLocaleString() });
            if (m.type === 'levels') return t('quest_week_levels', { g: m.goal });
            if (m.type === 'clicks') return t('quest_week_clicks', { g: m.goal.toLocaleString() });
            if (m.type === 'boss_damage') return t('quest_week_boss', { g: m.goal.toLocaleString() });
            return m.type;
        },
        bumpWeekly(type, amt) {
            if (!game.weekly || !game.weekly.missions) return;
            const map = { eb: 'eb', levels: 'levels', clicks: 'clicks', boss_damage: 'boss_damage' };
            const key = map[type];
            if (key && game.weekly.counters && game.weekly.counters[key] != null) game.weekly.counters[key] += amt;
            let changed = false;
            game.weekly.missions.forEach(m => {
                if (m.type === type && !m.done) {
                    m.prog += amt;
                    if (m.prog >= m.goal) { m.prog = m.goal; m.done = true; changed = true; try { gx.toast(t('quest_week_done')); } catch (e) {} }
                }
            });
            if (changed) this.updateBadge();
        },
        bumpWeeklyDailyClaim() {
            if (!game.weekly) return;
            if (!game.weekly.counters) game.weekly.counters = { eb: 0, levels: 0, clicks: 0, daily_claims: 0, boss_damage: 0 };
            game.weekly.counters.daily_claims++;
            this.bumpWeekly('daily_claims', 1);
        },
        claimWeekly(i) {
            const m = game.weekly && game.weekly.missions[i];
            if (!m || !m.done || m.claimed) return;
            m.claimed = true;
            if (m.shard) { game.as += 2; try { gx.toast(t('quest_shard_toast') + ' x2'); } catch (e) {} }
            else { game.e += m.reward; game.te += m.reward; game.floatNum(window.innerWidth / 2, 200, m.reward); }
            try { sound.play('buy'); } catch (e) {}
            game.save(); this.render(); this.updateBadge();
        },
        label(m) {
            if (m.type === 'path_charms') return t('quest_path_charms', { g: m.goal, path: atlas.pathTitle(m.pathId || atlas.path()) });
            return t('quest_' + m.type, { g: m.type === 'eb' ? m.goal.toLocaleString() : m.goal });
        },
        gen() {
            const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 3);
            const missions = order.map(i => { const p = this.pool[i]; const goal = p.goal(); return { type: p.type, goal, prog: 0, done: false, claimed: false, shard: !!p.shard, reward: p.shard ? 0 : p.reward() }; });
            const pathId = atlas.path();
            if (pathId) {
                missions[2] = {
                    type: 'path_charms', goal: 3, prog: 0, done: false, claimed: false, shard: false,
                    pathId: pathId,
                    reward: Math.max(2000, Math.floor(game.getCps() * 120)) + 2000
                };
            }
            return missions;
        },
        ensureDaily() {
            const today = new Date().toDateString();
            if (!game.daily || game.daily.date !== today) {
                game.daily = { date: today, counters: { clicks: 0, levels: 0, eb: 0, crowns: 0, pathCharms: 0 }, missions: this.gen() };
                this.updateBadge();
            } else if (game.daily.counters && game.daily.counters.pathCharms == null) {
                game.daily.counters.pathCharms = 0;
            }
        },
        bump(type, amt) {
            if (!game.daily) return;
            let changed = false;
            game.daily.missions.forEach(m => { if (m.type === type && !m.done) { m.prog += amt; if (m.prog >= m.goal) { m.prog = m.goal; m.done = true; changed = true; gx.toast(t('quest_done_toast')); } } });
            if (changed) this.updateBadge();
        },
        claim(i) {
            const m = game.daily && game.daily.missions[i]; if (!m || !m.done || m.claimed) return;
            m.claimed = true;
            if (m.shard) { game.as++; gx.toast(t('quest_shard_toast')); }
            else { game.e += m.reward; game.te += m.reward; game.floatNum(window.innerWidth / 2, 180, m.reward); }
            try { this.bumpWeeklyDailyClaim(); } catch (e) {}
            sound.play('buy'); game.save(); this.render(); this.updateBadge();
        },
        updateBadge() {
            const b = document.getElementById('quest-badge'); if (!b) return;
            let n = game.daily ? game.daily.missions.filter(m => m.done && !m.claimed).length : 0;
            if (game.weekly && game.weekly.missions) n += game.weekly.missions.filter(m => m.done && !m.claimed).length;
            if (game.weekly && game.weekly.menu && Array.isArray(game.weekly.menu.dishes)) n += game.weekly.menu.dishes.filter(d => d && d.done && !d.claimed).length;
            try { soupBoss.ensure(); if (game.boss && game.boss.hp <= 0 && !game.boss.claimed) n++; } catch (e) {}
            b.style.display = n > 0 ? 'inline-block' : 'none'; b.innerText = n;
        },
        open() { this.render(); document.getElementById('quest-modal').classList.add('open'); try { tutorial.notify('quest_open'); } catch (e) {} },
        close() { document.getElementById('quest-modal').classList.remove('open'); },
        render() {
            const list = document.getElementById('quest-list'); if (!list || !game.daily) return;
            let html = `<div style="font-size:0.7rem; color:#94a3b8; margin-bottom:8px">${t('quests_today')}</div>` + game.daily.missions.map((m, i) => {
                const pct = Math.min(100, Math.floor(m.prog / m.goal * 100));
                const rewardStr = m.shard ? '+1 ⬨' : '+' + Math.floor(m.reward).toLocaleString() + ' EB';
                let btn;
                if (m.claimed) btn = `<span style="color:#4ade80; font-size:0.75rem; font-weight:bold">${t('claimed')}</span>`;
                else if (m.done) btn = `<button class="gx-btn sm" onclick="quests.claim(${i})">${t('claim_reward', {r: rewardStr})}</button>`;
                else btn = `<span style="font-size:0.72rem; color:#cbd5e1">${t('reward_label', {r: rewardStr})}</span>`;
                return `<div class="quest-row ${m.done ? 'done2' : ''}"><div style="font-weight:bold; font-size:0.85rem">${this.label(m)}</div><div class="q-bar"><div class="q-fill" style="width:${pct}%"></div></div><div style="display:flex; justify-content:space-between; align-items:center"><span style="font-size:0.7rem; color:#94a3b8">${Math.floor(Math.min(m.prog, m.goal)).toLocaleString()} / ${m.goal.toLocaleString()}</span>${btn}</div></div>`;
            }).join('');
            if (game.weekly && game.weekly.missions && game.weekly.missions.length) {
                html += `<div style="font-size:0.7rem; color:var(--ac); margin:14px 0 8px; letter-spacing:0.06em; text-transform:uppercase">${t('quests_weekly')}</div>`;
                html += game.weekly.missions.map((m, i) => {
                    const pct = Math.min(100, Math.floor(m.prog / m.goal * 100));
                    const rewardStr = m.shard ? '+2 ⬨' : '+' + Math.floor(m.reward).toLocaleString() + ' EB';
                    let btn;
                    if (m.claimed) btn = `<span style="color:#4ade80; font-size:0.75rem; font-weight:bold">${t('claimed')}</span>`;
                    else if (m.done) btn = `<button class="gx-btn sm" onclick="quests.claimWeekly(${i})">${t('claim_reward', {r: rewardStr})}</button>`;
                    else btn = `<span style="font-size:0.72rem; color:#cbd5e1">${t('reward_label', {r: rewardStr})}</span>`;
                    return `<div class="quest-row ${m.done ? 'done2' : ''}"><div style="font-weight:bold; font-size:0.85rem">${this.weeklyLabel(m)}</div><div class="q-bar"><div class="q-fill" style="width:${pct}%"></div></div><div style="display:flex; justify-content:space-between; align-items:center"><span style="font-size:0.7rem; color:#94a3b8">${Math.floor(Math.min(m.prog, m.goal)).toLocaleString()} / ${m.goal.toLocaleString()}</span>${btn}</div></div>`;
                }).join('');
            }
            try { html += soupMenu.questHtml(); } catch (e) {}
            try { html += commChallenge.questHtml(); } catch (e2) {}
            try { html += soupBoss.questHtml(); } catch (e3) {}
            list.innerHTML = html;
            const al = document.getElementById('ach-list');
            if (al) al.innerHTML = `<div style="font-size:0.75rem; color:var(--ac); text-transform:uppercase; letter-spacing:1px; border-top:1px solid #fff2; padding-top:10px; margin-bottom:8px">${t('achievements_header')}</div>` + ach.defs.map(d => { const got = !!game.ach[d.k]; const rw = (d.reward ? ` · +${d.reward.toLocaleString()} EB` : '') + (d.shards ? ` · +${d.shards} ⬨` : ''); return `<div class="quest-row ${got ? 'done2' : ''}" style="opacity:${got ? 1 : 0.6}"><div style="font-weight:bold; font-size:0.82rem">${got ? '🏆' : '🔒'} ${t('ach_' + d.k + '_n')}</div><div style="font-size:0.7rem; color:#94a3b8">${t('ach_' + d.k + '_d')}${rw}</div></div>`; }).join('');
        }
    };
})(typeof window !== 'undefined' ? window : this);
