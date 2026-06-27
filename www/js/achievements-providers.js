/* Achievement platform adapters + modal UI. */
(function (global) {
    'use strict';

    var BUILD = global.BUILD || global.BUILD_TARGET || 'web';

const localAchievementsProvider = {
    id: 'local',
    unlock(id) { return true; }, // el estado persiste en game.ach (vía ach.grant)
    setStat(k, v) { return true; }
};
// STUB Steam (BLOQUEADO: requiere empaquetar con Steamworks y la app dada de alta).
const steamAchievementsProvider = {
    id: 'steam',
    _apiName(k) { return 'ACH_' + String(k).replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase(); },
    unlock(id) {
        try {
            if (window.steamworks && window.steamworks.activateAchievement) {
                window.steamworks.activateAchievement(this._apiName(id));
                if (window.steamworks.storeStats) window.steamworks.storeStats();
                return true;
            }
        } catch (e) {}
        return false;
    },
    setStat(k, v) {
        try {
            if (window.steamworks && window.steamworks.setStat) {
                window.steamworks.setStat(k, v);
                if (window.steamworks.storeStats) window.steamworks.storeStats();
                return true;
            }
        } catch (e) {}
        return false;
    }
};
function pickAchievementsProvider() {
    try { if (BUILD === 'steam' && window.steamworks && window.steamworks.available !== false) return steamAchievementsProvider; } catch (e) {}
    return localAchievementsProvider;
}
const achievementsProvider = {
    unlock(id) { return pickAchievementsProvider().unlock(id); },
    setStat(k, v) { return pickAchievementsProvider().setStat(k, v); }
};
const achievementsUI = {
    open() { this.render(); document.getElementById('ach-modal').classList.add('open'); },
    close() { document.getElementById('ach-modal').classList.remove('open'); },
    progress(k) {
        try {
            if (k === 'collector') return { cur: Math.min(collection.distinctCount(), 8), goal: 8 };
            if (k === 'awakened5') return { cur: Math.min(game.s, 5), goal: 5 };
            if (k === 'centurion') { const m = game.cp.reduce((a, c) => Math.max(a, c.lv), 0); return { cur: Math.min(m, 100), goal: 100 }; }
        } catch (e) {}
        return null;
    },
    render() {
        const list = document.getElementById('ach-modal-list'); if (!list) return;
        list.innerHTML = ach.defs.map(d => {
            const got = !!game.ach[d.k];
            const pr = !got ? this.progress(d.k) : null;
            const prTxt = pr ? `<div class="q-bar" style="margin-top:6px"><div class="q-fill" style="width:${Math.floor(pr.cur / pr.goal * 100)}%"></div></div><div style="font-size:0.65rem;color:#94a3b8">${t('ach_progress', { cur: pr.cur, goal: pr.goal })}</div>` : '';
            return `<div class="ach-row ${got ? 'got' : ''}"><span class="ach-ico">${got ? '🏆' : '🔒'}</span><div class="ach-body"><div class="ach-name">${t('ach_' + d.k + '_n')}</div><div class="ach-desc">${t('ach_' + d.k + '_d')}${d.reward ? ` · +${d.reward.toLocaleString()} EB` : ''}${d.shards ? ` · +${d.shards} ⬨` : ''}</div>${prTxt}</div></div>`;
        }).join('');
    }
};
    global.achievementsProvider = achievementsProvider;
    global.achievementsUI = achievementsUI;
})(typeof window !== 'undefined' ? window : this);
