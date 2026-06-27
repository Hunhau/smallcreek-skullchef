/* Rewarded ads: providers, catalog, claimReward. */
(function (global) {
    'use strict';

    global.BUILD = (typeof global.BUILD_TARGET !== 'undefined' && global.BUILD_TARGET) || 'web';
    var BUILD = global.BUILD;

// === REWARDED ADS (self-contained, platform-aware) ==================
// ====================================================================
// Three decoupled layers:
//   1) ads        -> picks a provider adapter and exposes isAvailable() +
//                    showRewarded(rewardKey, onReward, onFail). Real ad on
//                    YouTube Playables / mobile (AdMob); a testable simulated
//                    overlay on web/local. HIDDEN on Steam/desktop.
//   2) REWARDS    -> reward catalog as DATA (cooldown + daily cap + apply()).
//                    Knows nothing about the ad network.
//   3) claimReward-> the ONLY grant point: checks limits, shows the ad and only
//                    on a COMPLETED ad applies the effect and records the use.
//
// BUILD (global) selects platform behaviour; also read by achievements/collection inline.

// --- Provider adapter: simulated ad (web / local / testing fallback) ---
// Shows a short non-skippable overlay with a countdown, then rewards. Available
// everywhere EXCEPT standalone desktop builds (Steam/desktop) where ads don't apply.
const adSimProvider = {
    id: 'sim',
    isAvailable() { return BUILD !== 'steam' && BUILD !== 'desktop'; },
    showRewarded(rewardKey, onReward, onFail) { adOverlay.play(3, onReward, onFail); }
};

// --- Provider adapter: YouTube Playables rewarded ads ---
// Reuses the SDK handle detected by the ytPlayables layer (window.ytgame). Guarded
// so a missing/partial SDK never throws and simply falls through to the simulator.
const adYtProvider = {
    id: 'yt',
    _api() {
        let sdk = null;
        try { sdk = (ytPlayables && ytPlayables._sdk) ? ytPlayables._sdk : (window.ytgame || null); } catch (e) { sdk = null; }
        // TODO(Playables SDK 2026): confirm the exact rewarded-ads namespace/method.
        // Interstitials historically live under ytgame.ads.*; rewarded support is
        // host-gated. If the real call differs, adapt _api()/showRewarded() here.
        return (sdk && sdk.ads) ? sdk.ads : null;
    },
    isAvailable() {
        const api = this._api();
        return !!(api && typeof api.requestRewardedAd === 'function');
    },
    showRewarded(rewardKey, onReward, onFail) {
        const api = this._api();
        if (!api || typeof api.requestRewardedAd !== 'function') { onFail(); return; }
        const rid = (rewardKey != null && String(rewardKey)) ? String(rewardKey) : 'reward-default';
        try {
            Promise.resolve(api.requestRewardedAd(rid)).then(function (earned) {
                if (earned === true) onReward(); else onFail();
            }).catch(function () { onFail(); });
        } catch (e) { onFail(); }
    }
};

// Google official test rewarded units — last-resort fill when production has no inventory
// (common during first App Review). Enable via admob.config.json useFillFallback: true.
const GOOGLE_TEST_REWARD = {
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917'
};

// --- Provider adapter: mobile (Capacitor + AdMob) ---
const adMobProvider = {
    id: 'admob',
    _ready: false,
    _booting: false,
    _bootPromise: null,
    _adUnitId: '',
    _config: null,
    _canRequestAds: true,
    _preparedUnit: '',
    _plugin() {
        try {
            const cap = window.Capacitor;
            if (!cap) return null;
            return (cap.Plugins && cap.Plugins.AdMob) || window.AdMob || null;
        } catch (e) { return null; }
    },
    _platformKey() {
        try {
            const cap = window.Capacitor;
            if (cap && typeof cap.getPlatform === 'function') {
                const p = cap.getPlatform();
                if (p === 'ios' || p === 'android') return p;
            }
        } catch (e) {}
        if (BUILD === 'ios') return 'ios';
        if (BUILD === 'android') return 'android';
        return null;
    },
    isAvailable() {
        return this._ready && !!this._adUnitId && !!this._plugin();
    },
    bootstrap() {
        const self = this;
        if (self._ready) return Promise.resolve(true);
        if (self._bootPromise) return self._bootPromise;
        const plat = self._platformKey();
        if (!plat || !self._plugin()) return Promise.resolve(false);
        self._booting = true;
        self._bootPromise = fetch('admob.config.json', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; })
            .then(function (cfg) {
                if (!cfg || !cfg[plat] || !cfg[plat].rewardedAdUnitId) return false;
                self._config = cfg;
                self._adUnitId = String(cfg[plat].rewardedAdUnitId).trim();
                if (!self._adUnitId) return false;
                const AdMob = self._plugin();
                const initOpts = { requestTrackingAuthorization: plat === 'ios' };
                if (cfg.isTesting) initOpts.initializeForTesting = true;
                if (Array.isArray(cfg.testingDevices) && cfg.testingDevices.length) {
                    initOpts.testingDevices = cfg.testingDevices;
                }
                const bundleCheck = Promise.resolve().then(function () {
                    if (!cfg.bundleId) return;
                    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
                    if (!App || !App.getInfo) return;
                    return App.getInfo().then(function (info) {
                        if (info && info.id && info.id !== cfg.bundleId) {
                            console.warn('[AdMob] Bundle mismatch — native:', info.id, 'admob.config:', cfg.bundleId, '(recreate iOS app in AdMob console)');
                        }
                    });
                }).catch(function () {});
                return bundleCheck.then(function () {
                    return self._runAtt(AdMob);
                }).then(function () {
                    return Promise.resolve(AdMob.initialize(initOpts));
                }).then(function () {
                    return self._runUmp(AdMob);
                })
                    .then(function () {
                        self._ready = true;
                        self._preloadRewarded().catch(function () {});
                        return true;
                    });
            })
            .catch(function () { return false; })
            .finally(function () { self._booting = false; });
        return self._bootPromise;
    },
    _fillFallbackUnit() {
        const plat = this._platformKey();
        if (!this._config || !this._config.useFillFallback || !plat) return '';
        return GOOGLE_TEST_REWARD[plat] || '';
    },
    _prepareOpts(adUnitId) {
        const opts = { adId: adUnitId };
        if (this._config && this._config.isTesting) opts.isTesting = true;
        return opts;
    },
    _prepareRewardAd(adUnitId, AdMob) {
        const self = this;
        if (!AdMob || !adUnitId) return Promise.reject(new Error('no ad unit'));
        self._preparedUnit = '';
        return Promise.resolve(AdMob.prepareRewardVideoAd(self._prepareOpts(adUnitId)))
            .then(function () { self._preparedUnit = adUnitId; });
    },
    _preloadRewarded() {
        const self = this;
        if (!self._ready || !self._adUnitId || !self._canRequestAds) return Promise.resolve(false);
        return self._prepareRewardAd(self._adUnitId, self._plugin()).catch(function () { return false; });
    },
    _runAtt(AdMob) {
        return Promise.resolve()
            .then(function () {
                if (AdMob.trackingAuthorizationStatus) return AdMob.trackingAuthorizationStatus();
            })
            .then(function (info) {
                if (info && info.status === 'notDetermined' && AdMob.requestTrackingAuthorization) {
                    return AdMob.requestTrackingAuthorization();
                }
            })
            .catch(function () {});
    },
    _runUmp(AdMob) {
        const self = this;
        return Promise.resolve()
            .then(function () {
                if (AdMob.requestConsentInfo) return AdMob.requestConsentInfo();
            })
            .then(function (consentInfo) {
                if (!consentInfo) return;
                if (typeof consentInfo.canRequestAds === 'boolean') self._canRequestAds = consentInfo.canRequestAds;
                if (!consentInfo.canRequestAds && AdMob.showConsentForm && consentInfo.isConsentFormAvailable) {
                    return AdMob.showConsentForm();
                }
            })
            .then(function (updated) {
                if (updated && typeof updated.canRequestAds === 'boolean') self._canRequestAds = updated.canRequestAds;
            })
            .catch(function () {});
    },
    _runConsent(AdMob) {
        const self = this;
        return self._runAtt(AdMob).then(function () { return self._runUmp(AdMob); });
    },
    _showPrepared(AdMob, onReward, onFail) {
        let settled = false;
        const handles = [];
        const finish = function (ok) {
            if (settled) return;
            settled = true;
            handles.forEach(function (h) {
                try { if (h && h.remove) h.remove(); } catch (e) {}
            });
            if (ok) onReward(); else onFail();
        };
        const reg = function (evt, fn) {
            return Promise.resolve(AdMob.addListener(evt, fn)).then(function (h) {
                if (h) handles.push(h);
            }).catch(function () {});
        };
        // Do NOT fail on Dismissed — Reward / showRewardVideoAd() resolve the grant.
        return Promise.all([
            reg('onRewardedVideoAdFailedToShow', function () { finish(false); }),
            reg('onRewardedVideoAdReward', function () { finish(true); })
        ]).then(function () {
            return AdMob.showRewardVideoAd();
        }).then(function (rewardItem) {
            if (rewardItem) finish(true);
        }).catch(function () {
            if (!settled) finish(false);
        });
    },
    showRewarded(rewardKey, onReward, onFail) {
        const self = this;
        const AdMob = self._plugin();
        if (!AdMob || !self._adUnitId) { onFail(); return; }
        if (!self._canRequestAds) { onFail(); return; }
        const units = [self._adUnitId];
        const fallback = self._fillFallbackUnit();
        if (fallback && fallback !== self._adUnitId) units.push(fallback);
        const tryUnit = function (idx) {
            if (idx >= units.length) { onFail(); return Promise.resolve(); }
            const unitId = units[idx];
            const alreadyPrepared = self._preparedUnit === unitId;
            const prep = alreadyPrepared
                ? Promise.resolve()
                : self._prepareRewardAd(unitId, AdMob).catch(function () { return Promise.reject(); });
            return prep.then(function () {
                return new Promise(function (resolve) {
                    self._showPrepared(AdMob, function () { resolve(true); }, function () { resolve(false); });
                });
            }).then(function (ok) {
                self._preparedUnit = '';
                if (ok) { onReward(); return; }
                return tryUnit(idx + 1);
            });
        };
        const startRealAd = function () {
            tryUnit(0).catch(function () { onFail(); });
        };
        // Same 3-2-1 + hint as web sim, then real AdMob rewarded (Apple review flow).
        adOverlay.playThen(3, startRealAd, onFail);
    }
};

// Picks the adapter for the current platform. Real providers win when present; the
// simulator is the web/test fallback. Provider stays null on Steam/desktop -> ads off.
const ads = {
    _provider: null,
    providerReady: false,
    _inited: false,
    init() {
        const self = this;
        if (self._inited) return;
        self._inited = true;
        const plat = adMobProvider._platformKey();
        if (plat === 'android' || plat === 'ios') {
            adMobProvider.bootstrap().then(function () {
                self._provider = self._pick();
                self.providerReady = !!self._provider;
                try { rewardSystem.renderButton(); } catch (e) {}
            });
        } else {
            this._provider = this._pick();
            this.providerReady = !!this._provider;
            try { rewardSystem.renderButton(); } catch (e) {}
        }
    },
    _pick() {
        const plat = adMobProvider._platformKey();
        if ((plat === 'android' || plat === 'ios') && adMobProvider.isAvailable()) return adMobProvider;
        try {
            if (typeof isPlayablesEnv === 'function' && isPlayablesEnv() && adYtProvider.isAvailable()) return adYtProvider;
        } catch (e) {}
        // PC / localhost / browser testing — simulated 3-2-1 countdown.
        if (plat !== 'android' && plat !== 'ios' && adSimProvider.isAvailable()) return adSimProvider;
        return null;
    },
    isAvailable() { return !!this._provider && this._provider.isAvailable(); },
    whenReady() {
        const self = this;
        if (!self._inited) self.init();
        const plat = adMobProvider._platformKey();
        if (plat !== 'ios' && plat !== 'android') return Promise.resolve(self.isAvailable());
        return adMobProvider.bootstrap().then(function () {
            self._provider = self._pick();
            self.providerReady = !!self._provider;
            return self.isAvailable();
        });
    },
    // Shows a rewarded ad. Calls onReward ONLY if the ad completed; otherwise onFail.
    showRewarded(rewardKey, onReward, onFail) {
        const fail = (typeof onFail === 'function') ? onFail : function () {};
        const reward = (typeof onReward === 'function') ? onReward : function () {};
        if (!this.isAvailable()) { fail(); return; }
        let settled = false;
        const ok = function () { if (settled) return; settled = true; reward(); };
        const ko = function () { if (settled) return; settled = true; fail(); };
        try { this._provider.showRewarded(rewardKey, ok, ko); } catch (e) { ko(); }
    }
};

// Reward catalog as DATA. cd = cooldown (seconds), daily = per-day cap.
// apply() is the ONLY effect; claimReward invokes it solely after a completed ad.
const REWARDS = {
    // Double Brew: x2 production for 5 minutes (reuses the buff + buff-chip UI).
    brew2:    { labelKey:'reward_brew2', descKey:'reward_brew2_d', icon:'🍲', cd:600,  daily:5, apply() { game.addBuff('cps', 2, 300, 'reward_brew2'); } },
    // Instant Pot: lump scaled to current production (~5 min of earnings) so it stays
    // fair early and late instead of a flat trivial amount.
    instapot: { labelKey:'reward_instapot', descKey:'reward_instapot_d', icon:'⚡', cd:900, daily:4, apply() { const g = game.getCps() * 300; game.e += g; game.te += g; game.floatNum(window.innerWidth / 2, 170, g); } },
    // Lucky Drop: a free charm drop honouring the existing rarity odds.
    lucky:    { labelKey:'reward_lucky', descKey:'reward_lucky_d', icon:'🎴', cd:1800, daily:2, apply() { try { collection.grant(collection.rollRarity()); } catch (e) {} } },
    // Used by the offline modal "x2" button: doubles pending offline earnings.
    offline2: { labelKey:'offline_double', descKey:'offline_double', icon:'⏩', cd:0, daily:2, apply() { offline.amt *= 2; offline.renderText(); } }
};

const rewardSystem = {
    dayKey() { try { return new Date().toISOString().slice(0, 10); } catch (e) { return 'na'; } },
    // Returns (and creates/resets per day) the anti-abuse record for a reward.
    rec(id) {
        if (!game.rewards || typeof game.rewards !== 'object') game.rewards = {};
        let r = game.rewards[id];
        const today = this.dayKey();
        if (!r || typeof r !== 'object' || r.day !== today) { r = { last: 0, count: 0, day: today }; game.rewards[id] = r; }
        if (!Number.isFinite(r.last)) r.last = 0;
        if (!Number.isFinite(r.count)) r.count = 0;
        return r;
    },
    cooldownLeft(id) {
        const def = REWARDS[id]; if (!def) return 0;
        const left = def.cd - (Date.now() - this.rec(id).last) / 1000;
        return left > 0 ? Math.ceil(left) : 0;
    },
    dailyLeft(id) {
        const def = REWARDS[id]; if (!def) return 0;
        return Math.max(0, def.daily - this.rec(id).count);
    },
    canClaim(id) {
        return !!REWARDS[id] && ads.isAvailable() && this.cooldownLeft(id) === 0 && this.dailyLeft(id) > 0;
    },
    // Formats seconds as "Xm" or "Xs" for cooldown messages.
    fmtTime(sec) {
        sec = Math.max(0, Math.ceil(sec));
        if (sec >= 60) return Math.ceil(sec / 60) + 'm';
        return sec + 's';
    },
    // Refreshes the side FAB: hidden on Steam/desktop (ads off); otherwise shows how
    // many rewards are ready, or the soonest cooldown / "come back later".
    renderButton() {
        const fab = document.getElementById('reward-fab');
        const lbl = document.getElementById('reward-fab-label');
        if (!fab || !lbl) return;
        if (!ads.isAvailable()) { if (fab.style.display !== 'none') fab.style.display = 'none'; return; }
        if (fab.style.display === 'none') fab.style.display = '';
        const ids = rewardsUI.LIST;
        const ready = ids.filter(id => this.canClaim(id)).length;
        let txt;
        if (ready > 0) { txt = '🎁 ' + t('reward_fab') + ' ·' + ready; fab.style.opacity = '1'; }
        else {
            const cds = ids.map(id => this.cooldownLeft(id)).filter(s => s > 0);
            if (cds.length) txt = '🎁 ' + t('reward_cooldown', { time: this.fmtTime(Math.min.apply(null, cds)) });
            else txt = '🎁 ' + t('reward_later');
            fab.style.opacity = '0.6';
        }
        if (lbl.textContent !== txt) lbl.textContent = txt;
    }
};

// The ONLY grant point. Checks cooldown + daily cap (persisted), shows the ad and
// ONLY on a completed ad applies the effect and records the use. Returns a Promise
// resolving true on grant (so callers like the offline modal can await it).
function claimReward(rewardId) {
    return ads.whenReady().then(function (ready) {
        return new Promise(function (resolve) {
        const def = REWARDS[rewardId];
        if (!def) { resolve(false); return; }
        if (!ready || !ads.isAvailable()) { gx.toast(t('ad_unavailable')); resolve(false); return; }
        if (rewardSystem.cooldownLeft(rewardId) > 0) {
            gx.toast(t('reward_cooldown', { time: rewardSystem.fmtTime(rewardSystem.cooldownLeft(rewardId)) }));
            resolve(false); return;
        }
        if (rewardSystem.dailyLeft(rewardId) <= 0) {
            gx.toast(t('reward_daily_left', { n: 0, max: def.daily }));
            resolve(false); return;
        }
        try { rewardsUI.close(); } catch (e) {}
        ads.showRewarded(rewardId, function () {
            const r = rewardSystem.rec(rewardId);
            r.last = Date.now();
            r.count += 1;
            try { def.apply(); } catch (e) {}
            try { game.save(); } catch (e) {}
            rewardSystem.renderButton();
            try { rewardsUI.render(); } catch (e) {}
            gx.toast(t('reward_granted', { r: t(def.labelKey) }));
            try { sound.play('bubble'); } catch (e) {}
            resolve(true);
        }, function () {
            gx.toast(t('ad_failed'));
            resolve(false);
        });
    });
    });
}
    global.ads = ads;
    global.REWARDS = REWARDS;
    global.rewardSystem = rewardSystem;
    global.claimReward = claimReward;
})(typeof window !== 'undefined' ? window : this);
