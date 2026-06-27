/* Founder welcome modal — web beta funnel (build-328). Shown every home PLAY (web beta). */
(function (global) {
    'use strict';

    global.founderBeta = {
        _pending: null,

        shouldOffer: function () {
            try {
                return typeof STORE_TIER !== 'undefined' && STORE_TIER.isWebFounderBeta();
            } catch (e) { return false; }
        },

        syncLangPills: function () {
            var en = document.getElementById('founder-lang-en');
            var es = document.getElementById('founder-lang-es');
            var lang = (typeof global.LANG !== 'undefined') ? global.LANG : 'en';
            if (en) en.classList.toggle('active', lang === 'en');
            if (es) es.classList.toggle('active', lang === 'es');
        },

        pickLang: function (l) {
            try { if (typeof setLang === 'function') setLang(l); } catch (e) {}
            this.syncLangPills();
        },

        open: function () {
            var md = document.getElementById('founder-welcome-modal');
            if (!md) return;
            try { if (typeof applyStaticI18n === 'function') applyStaticI18n(); } catch (e) {}
            this.syncLangPills();
            md.classList.add('open');
            try { document.body.style.overflow = 'hidden'; } catch (e2) {}
        },

        close: function () {
            var md = document.getElementById('founder-welcome-modal');
            if (md) md.classList.remove('open');
            try { document.body.style.overflow = ''; } catch (e) {}
        },

        dismiss: function () {
            this.close();
            var cb = this._pending;
            this._pending = null;
            if (typeof cb === 'function') {
                try { cb(); } catch (e2) {}
            }
        },

        /** Returns true if modal shown (caller should wait for callback). */
        maybeShow: function (onDone) {
            if (!this.shouldOffer()) return false;
            var md = document.getElementById('founder-welcome-modal');
            if (!md) return false;
            this._pending = onDone;
            this.open();
            return true;
        }
    };
})(typeof window !== 'undefined' ? window : this);
