/* Cloud save layer — Playables SDK + Steam Auto-Cloud + local fallback. */
(function (global) {
    'use strict';

    function secureUnwrap(raw) {
        const sec = global.secure || window.secure;
        if (!sec || !sec.unwrap) return null;
        return sec.unwrap(raw);
    }

    global.cloudSave = {
        KEY: 'soup_cloud_v17',
        get enabled() { return ytPlayables.available; },
        async save(dataString) {
            if (typeof isPlayablesEnv === 'function' && isPlayablesEnv()) {
                try { return await ytPlayables.saveData(dataString); } catch (e) { return false; }
            }
            let okLocal = false;
            try { localStorage.setItem(this.KEY, dataString); okLocal = true; } catch (e) {}
            try {
                if (typeof electronAPI !== 'undefined' && electronAPI.platform === 'steam' && electronAPI.writeCloudSave) {
                    electronAPI.writeCloudSave(dataString);
                }
            } catch (e) {}
            try { await ytPlayables.saveData(dataString); } catch (e) {}
            return okLocal;
        },
        _isSteamDesktop() {
            try { return typeof electronAPI !== 'undefined' && electronAPI.platform === 'steam'; } catch (e) { return false; }
        },
        async load() {
            if (typeof isPlayablesEnv === 'function' && isPlayablesEnv()) {
                try { return await ytPlayables.loadData(); } catch (e) {}
                return null;
            }
            if (this._isSteamDesktop() && electronAPI.readCloudSave) {
                try {
                    const steamFile = await electronAPI.readCloudSave();
                    if (typeof steamFile === 'string' && steamFile) return steamFile;
                } catch (e) {}
            }
            try { const cloud = await ytPlayables.loadData(); if (typeof cloud === 'string' && cloud) return cloud; } catch (e) {}
            try { return localStorage.getItem(this.KEY); } catch (e) { return null; }
        },
        _mergeCloudIntoMain(cloud) {
            if (typeof cloud !== 'string' || !cloud) return false;
            const cu = secureUnwrap(cloud);
            if (!cu || !cu.data || typeof cu.data !== 'object') return false;
            const MAIN = 'soup_p_v17';
            const lastSeenOf = (raw) => {
                try { const u = secureUnwrap(raw); const d = u && u.data; return (d && Number.isFinite(d.lastSeen)) ? d.lastSeen : 0; } catch (e) { return 0; }
            };
            let localRaw = null;
            try { localRaw = localStorage.getItem(MAIN); } catch (e) {}
            if (!localRaw || lastSeenOf(cloud) >= lastSeenOf(localRaw)) {
                try { localStorage.setItem(MAIN, cloud); return true; } catch (e) {}
            }
            return false;
        },
        async restoreToLocal() {
            try {
                if (this.enabled || this._isSteamDesktop()) {
                    const cloud = await this.load();
                    return this._mergeCloudIntoMain(cloud);
                }
            } catch (e) {}
            return false;
        }
    };
})(typeof window !== 'undefined' ? window : this);
