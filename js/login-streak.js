/* Daily login streak bonus on first visit of the day. */
(function (global) {
    'use strict';

    global.loginStreak = {
        todayKey() {
            try {
                const d = new Date();
                return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            } catch (e) { return ''; }
        },
        yesterdayKey() {
            try {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            } catch (e) { return ''; }
        },
        evaluate() {
            const today = this.todayKey();
            if (!today) return;
            const last = game.loginDay || '';
            if (last === today) return;
            const yday = this.yesterdayKey();
            if (last === yday) game.loginStreak = Math.max(1, (game.loginStreak || 0) + 1);
            else game.loginStreak = 1;
            game.loginDay = today;
            const base = (typeof balanceGet === 'function' ? balanceGet('loginStreakBase', 500) : 500);
            const perDay = (typeof balanceGet === 'function' ? balanceGet('loginStreakPerDay', 650) : 650);
            const cap = (typeof balanceGet === 'function' ? balanceGet('loginStreakCap', 95000) : 95000);
            const cpsMult = (typeof balanceGet === 'function' ? balanceGet('loginStreakCpsMult', 120) : 120);
            let cps = 0;
            try { cps = Math.max(0, game.getCps()); } catch (e) {}
            const bonus = Math.min(cap, base + (game.loginStreak * perDay) + Math.floor(cps * cpsMult));
            if (bonus > 0) { game.e += bonus; game.te += bonus; }
            const show = () => {
                try { gx.toast(t('streak_toast', { n: game.loginStreak, eb: Math.floor(bonus).toLocaleString() })); } catch (e) {}
                try { sound.play('bubble'); } catch (e2) {}
            };
            const om = document.getElementById('offline-modal');
            if (om && om.classList.contains('open')) setTimeout(show, 1200);
            else show();
            try { game.save(); } catch (e3) {}
        }
    };
})(typeof window !== 'undefined' ? window : this);
