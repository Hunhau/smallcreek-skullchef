/* Chef mood meter — global chefMood. */
(function (global) {
    'use strict';

    global.chefMood = {
        mult() {
            const m = Number.isFinite(game.chefMood) ? game.chefMood : 55;
            const cap = (typeof balanceGet === 'function' ? balanceGet('chefMoodMaxBonusPct', 12) : 12) / 100;
            return 1 + (m / 100) * cap;
        },
        pctDisplay() { return Math.round((this.mult() - 1) * 100); },
        bump(amt, reason) {
            if (!Number.isFinite(amt) || amt <= 0) return;
            const prev = Number.isFinite(game.chefMood) ? game.chefMood : 55;
            game.chefMood = Math.min(100, Math.max(0, prev + amt));
            if (reason === 'feed' && game.chefMood >= 85 && prev < 85) {
                try { gx.toast(t('chef_mood_hot', { pct: this.pctDisplay() })); } catch (e) {}
            }
        },
        set(v, silent) {
            game.chefMood = Math.min(100, Math.max(0, Number(v) || 0));
            if (!silent) try { game.save(); } catch (e) {}
        },
        tick() {
            const prev = Number.isFinite(game.chefMood) ? game.chefMood : 55;
            const floor = (typeof balanceGet === 'function' ? balanceGet('chefMoodFloor', 15) : 15);
            if (prev <= floor) return;
            game.chefMood = Math.max(floor, prev - 0.07);
        },
        labelKey() {
            const m = Number.isFinite(game.chefMood) ? game.chefMood : 55;
            if (m >= 85) return 'chef_mood_hot';
            if (m >= 60) return 'chef_mood_warm';
            if (m >= 35) return 'chef_mood_ok';
            return 'chef_mood_cold';
        },
        emoji() {
            const m = Number.isFinite(game.chefMood) ? game.chefMood : 55;
            if (m >= 85) return '🔥';
            if (m >= 60) return '😋';
            if (m >= 35) return '🙂';
            return '😴';
        },
        syncUi() {
            const el = document.getElementById('chef-mood-pill');
            if (!el) return;
            const m = Number.isFinite(game.chefMood) ? game.chefMood : 55;
            if (m < 20) { el.style.display = 'none'; return; }
            const txt = this.emoji() + ' ' + t(this.labelKey(), { pct: this.pctDisplay() });
            if (el.textContent !== txt) el.textContent = txt;
            if (el.style.display !== 'block') el.style.display = 'block';
            el.classList.toggle('hot', m >= 85);
            el.classList.toggle('warm', m >= 60 && m < 85);
        }
    };
})(typeof window !== 'undefined' ? window : this);
