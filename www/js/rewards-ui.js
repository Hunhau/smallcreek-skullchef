/* Side-FAB rewarded-ad menu (lists brew2, instapot, lucky). */
(function (global) {
    'use strict';

    global.rewardsUI = {
        LIST: ['brew2', 'instapot', 'lucky'],
        open() {
            if (!ads.isAvailable()) return;
            this.render();
            const m = document.getElementById('reward-modal'); if (m) m.classList.add('open');
        },
        close() { const m = document.getElementById('reward-modal'); if (m) m.classList.remove('open'); },
        render() {
            const wrap = document.getElementById('reward-list'); if (!wrap) return;
            wrap.innerHTML = this.LIST.map(function (id) {
                const def = REWARDS[id];
                const cd = rewardSystem.cooldownLeft(id), left = rewardSystem.dailyLeft(id);
                const can = rewardSystem.canClaim(id);
                let state;
                if (left <= 0) state = t('reward_daily_done');
                else if (cd > 0) state = t('reward_cooldown', { time: rewardSystem.fmtTime(cd) });
                else state = t('reward_daily_left', { n: left, max: def.daily });
                return '<div class="reward-card">'
                    + '<div class="reward-card-icon">' + (typeof scCauldronIcon !== 'undefined' ? scCauldronIcon.rewardIcon(id, def.icon) : def.icon) + '</div>'
                    + '<div class="reward-card-body">'
                    + '<div class="reward-card-name">' + t(def.labelKey) + '</div>'
                    + '<div class="reward-card-desc">' + t(def.descKey) + '</div>'
                    + '<div class="reward-card-state">' + state + '</div>'
                    + '</div>'
                    + '<button class="reward-card-btn" ' + (can ? '' : 'disabled') + ' onclick="rewardsUI.watch(\'' + id + '\')">▶ ' + t('reward_watch') + '</button>'
                    + '</div>';
            }).join('');
        },
        watch(id) {
            claimReward(id).then(() => { this.render(); rewardSystem.renderButton(); });
        }
    };
})(typeof window !== 'undefined' ? window : this);
