/* Achievement grants + checks — global ach. */
(function (global) {
    'use strict';

    global.ach = {
        defs: [
            { k: 'firstClick', reward: 500 },
            { k: 'firstPres', reward: 5000, shards: 1 },
            { k: 'firstChamp', reward: 8000, shards: 1 },
            { k: 'fullTeam', reward: 4000, shards: 1 },
            { k: 'allSpoons', reward: 25000, shards: 2 },
            { k: 'centurion', reward: 50000, shards: 2 },
            { k: 'awakened5', reward: 60000, shards: 3 },
            { k: 'era5', reward: 12000 },
            { k: 'era10', reward: 35000, shards: 1 },
            { k: 'era15', reward: 60000, shards: 2 },
            { k: 'era20', reward: 90000, shards: 2 },
            { k: 'era25', reward: 150000, shards: 3 },
            { k: 'collector', reward: 15000, shards: 2 },
            { k: 'mythicCharm', reward: 40000, shards: 2 },
            { k: 'anomalyCharm', reward: 120000, shards: 3 },
            { k: 'soupBoss', reward: 20000, shards: 1 },
            { k: 'commGoal', reward: 15000, shards: 1 }
        ],
        grant(k) {
            if (game.ach[k]) return;
            const d = this.defs.find(x => x.k === k); if (!d) return;
            game.ach[k] = true;
            if (d.reward) { game.e += d.reward; game.te += d.reward; }
            if (d.shards) game.as += d.shards;
            let msg = t('ach_toast', {n: t('ach_' + k + '_n')});
            if (d.reward) msg += ' · +' + Math.floor(d.reward).toLocaleString() + ' EB';
            if (d.shards) msg += ' · +' + d.shards + ' ⬨';
            gx.toast(msg);
            sound.play('prestige');
            try { achievementsProvider.unlock(k); } catch (e) {}
            game.save();
            if (document.getElementById('quest-modal').classList.contains('open')) quests.render();
            if (document.getElementById('ach-modal').classList.contains('open')) achievementsUI.render();
        },
        check() {
            if (game.cp.every(c => c.lv > 0)) this.grant('fullTeam');
            if (game.spoons.every(s => s.owned)) this.grant('allSpoons');
            if (game.cp.some(c => c.lv >= 100)) this.grant('centurion');
            if (game.s >= 5) this.grant('awakened5');
            try { if (collection.distinctCount() >= 8) this.grant('collector'); } catch (e) {}
        }
    };
})(typeof window !== 'undefined' ? window : this);
