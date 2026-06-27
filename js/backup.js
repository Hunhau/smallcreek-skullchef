/* Save export/import + Supabase cloud backup (home menu). */
(function (global) {
    'use strict';

    global.backup = {
        FILENAME: 'smallcreek-save',
        SAVE_KEY: 'soup_p_v17',
        IDENTITY_KEY: 'soup_lb_identity',
        CREATOR_ID: '1832ff16-5fec-4afd-b570-f950e19eb434',
        CREATOR_NAME: 'SmallcreekSkullchef',
        readIdentity() {
            try {
                const raw = localStorage.getItem(this.IDENTITY_KEY);
                if (!raw) return null;
                const o = JSON.parse(raw);
                return (o && typeof o === 'object' && o.uuid) ? o : null;
            } catch (e) { return null; }
        },
        bundle() {
            return {
                _app: 'smallcreek-skullchef', _type: 'save+identity', v: 1,
                exportedAt: new Date().toISOString(),
                save: game.getSaveData(),
                identity: this.readIdentity()
            };
        },
        encode() { return JSON.stringify(this.bundle(), null, 2); },
        decode(str) {
            if (str == null) return null;
            const s = String(str).trim();
            if (!s) return null;
            let json = null;
            try {
                if (s.charAt(0) === '{') json = s;
                else json = decodeURIComponent(escape(atob(s.replace(/\s+/g, ''))));
            } catch (e) { json = null; }
            if (!json) return null;
            let o = null;
            try { o = JSON.parse(json); } catch (e) { o = null; }
            if (!o || typeof o !== 'object') return null;
            if (o.save && typeof o.save === 'object') {
                return { save: o.save, identity: (o.identity && typeof o.identity === 'object') ? o.identity : null };
            }
            return { save: o, identity: null };
        },
        download() {
            try {
                const code = this.encode();
                const blob = new Blob([code], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const stamp = new Date().toISOString().slice(0, 10);
                a.href = url; a.download = `${this.FILENAME}-${stamp}.json`;
                document.body.appendChild(a); a.click();
                setTimeout(() => { if (a.parentNode) a.remove(); URL.revokeObjectURL(url); }, 200);
                gx.toast(t('backup_exported'));
            } catch (e) { gx.toast(t('backup_error')); }
        },
        async copy() {
            let code = '';
            try { code = this.encode(); } catch (e) { gx.toast(t('backup_error')); return; }
            let ok = false;
            try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(code); ok = true; } } catch (e) {}
            if (!ok) {
                try {
                    const ta = document.createElement('textarea');
                    ta.value = code; ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
                    document.body.appendChild(ta); ta.focus(); ta.select();
                    ok = document.execCommand('copy'); ta.remove();
                } catch (e) {}
            }
            if (ok) gx.toast(t('backup_copied'));
            else { gx.toast(t('backup_error')); try { window.prompt(t('backup_copy_manual'), code); } catch (e) {} }
        },
        applyImported(data) {
            if (!data || typeof data !== 'object' || !data.save || typeof data.save !== 'object') { gx.toast(t('backup_invalid')); return false; }
            let hasExisting = false;
            try { hasExisting = !!localStorage.getItem(this.SAVE_KEY); } catch (e) {}
            if (hasExisting) {
                let ok = true;
                try { ok = window.confirm(t('backup_confirm_overwrite')); } catch (e) { ok = true; }
                if (!ok) return false;
            }
            let migrated;
            try { migrated = (global.migrateSave || window.migrateSave)(data.save); } catch (e) { migrated = data.save; }
            if (!migrated || typeof migrated !== 'object') { gx.toast(t('backup_invalid')); return false; }
            try { if (typeof collOrigin !== 'undefined') collOrigin.sanitizeImportedSave(migrated); } catch (e) {}
            const sec = global.secure || window.secure;
            try { localStorage.setItem(this.SAVE_KEY, sec.wrap(JSON.stringify(migrated))); }
            catch (e) { gx.toast(t('backup_error')); return false; }
            if (data.identity && typeof data.identity === 'object' && data.identity.uuid) {
                try { localStorage.setItem(this.IDENTITY_KEY, JSON.stringify(data.identity)); } catch (e) {}
            }
            try { if (game.saveTick) { clearInterval(game.saveTick); game.saveTick = null; } } catch (e) {}
            gx.toast(t('backup_imported'));
            setTimeout(() => { try { location.reload(); } catch (e) {} }, 1000);
            return true;
        },
        importFromCode(str) {
            const data = this.decode(str);
            if (!data) { gx.toast(t('backup_invalid')); return false; }
            return this.applyImported(data);
        },
        promptImport() {
            const m = document.getElementById('import-modal');
            const ta = document.getElementById('import-text');
            if (m && ta) {
                ta.value = '';
                m.classList.add('open');
                setTimeout(() => { try { ta.focus(); } catch (e) {} }, 40);
                return;
            }
            let code = null;
            try { code = window.prompt(t('backup_import_prompt'), ''); } catch (e) { code = null; }
            if (code == null) return;
            if (!String(code).trim()) { gx.toast(t('backup_invalid')); return; }
            this.importFromCode(code);
        },
        closeImport() {
            const m = document.getElementById('import-modal');
            if (m) m.classList.remove('open');
        },
        confirmImport() {
            const ta = document.getElementById('import-text');
            const code = ta ? ta.value : '';
            if (!String(code).trim()) { gx.toast(t('backup_invalid')); return; }
            const ok = this.importFromCode(code);
            if (ok) this.closeImport();
        },
        importFile(input) {
            const file = input && input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => { this.importFromCode(String(reader.result || '')); try { input.value = ''; } catch (e) {} };
            reader.onerror = () => { gx.toast(t('backup_error')); try { input.value = ''; } catch (e) {} };
            try { reader.readAsText(file); } catch (e) { gx.toast(t('backup_error')); }
        },
        ensureCreatorIdentity() {
            let cur = this.readIdentity() || {};
            let prix = Number.isFinite(cur.prixWins) ? cur.prixWins : 0;
            let scoreHi = Number.isFinite(cur.scoreHi) ? cur.scoreHi : 0;
            try { prix = Math.max(prix, leaderboard.getPrixWins()); } catch (e) {}
            try { scoreHi = Math.max(scoreHi, Math.floor(game.te || game.e || 0)); } catch (e) {}
            const id = {
                uuid: this.CREATOR_ID,
                name: this.CREATOR_NAME,
                prixWins: prix,
                scoreHi: scoreHi,
                named: true,
                provisional: false,
                v: 1
            };
            try { localStorage.setItem(this.IDENTITY_KEY, JSON.stringify(id)); } catch (e) {}
            try { leaderboard.reloadIdentity(); } catch (e) {}
            return id;
        },
        async creatorCloudUpload() {
            if (typeof scOwnerIdentityMatch === 'function' && !scOwnerIdentityMatch()) return;
            this.ensureCreatorIdentity();
            try { await leaderboard.claimName(this.CREATOR_NAME).catch(() => {}); } catch (e) {}
            try {
                leaderboard.submit({ score: game.te, prestige: game.s, prix: leaderboard.getPrixWins() });
                await leaderboard.flush();
            } catch (e) {}
            await this.cloudUpload();
        },
        creatorCloudRestore() {
            if (typeof scOwnerIdentityMatch === 'function' && !scOwnerIdentityMatch()) return;
            let live = false; try { live = !!leaderboard.isLive(); } catch (e) {}
            if (!live) { gx.toast(t('cloud_offline')); return; }
            let ok = true;
            try { ok = window.confirm(t('creator_restore_confirm')); } catch (e) { ok = true; }
            if (!ok) return;
            gx.toast(t('cloud_restoring'));
            leaderboard.cloudPull(this.CREATOR_ID).then(blob => {
                this.importFromCode(blob);
            }).catch(err => {
                if (err === 'NOT_FOUND') gx.toast(t('cloud_not_found'));
                else if (err === 'INVALID') gx.toast(t('cloud_bad_code'));
                else if (err === 'OFFLINE') gx.toast(t('cloud_offline'));
                else gx.toast(t('cloud_error'));
            });
        },
        async cloudUpload() {
            let code = '';
            try { code = this.encode(); } catch (e) { gx.toast(t('backup_error')); return; }
            let live = false; try { live = !!leaderboard.isLive(); } catch (e) {}
            if (!live) { gx.toast(t('cloud_offline')); return; }
            const doUpload = () => {
                gx.toast(t('cloud_uploading'));
                leaderboard.cloudPush(code).then(res => {
                    const myCode = (res && res.code) || (function () { try { return leaderboard.myCode(); } catch (e) { return ''; } })();
                    this.showAccountCode(myCode);
                }).catch(err => {
                    gx.toast(err === 'OFFLINE' ? t('cloud_offline') : t('cloud_error'));
                });
            };
            try { privacyConsent.gate(doUpload, () => {}); } catch (e) { doUpload(); }
        },
        async showAccountCode(myCode) {
            if (!myCode) { gx.toast(t('cloud_uploaded')); return; }
            let copied = false;
            try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(myCode); copied = true; } } catch (e) {}
            gx.toast(copied ? t('cloud_uploaded_copied') : t('cloud_uploaded'));
            try { window.prompt(t('cloud_your_code'), myCode); } catch (e) {}
        },
        cloudRestore() {
            let live = false; try { live = !!leaderboard.isLive(); } catch (e) {}
            if (!live) { gx.toast(t('cloud_offline')); return; }
            let own = ''; try { own = leaderboard.myCode() || ''; } catch (e) {}
            let code = null;
            try { code = window.prompt(t('cloud_restore_prompt'), own); } catch (e) { code = null; }
            if (code == null) return;
            code = String(code).trim();
            if (!code) { gx.toast(t('cloud_bad_code')); return; }
            gx.toast(t('cloud_restoring'));
            leaderboard.cloudPull(code).then(blob => {
                this.importFromCode(blob);
            }).catch(err => {
                if (err === 'NOT_FOUND') gx.toast(t('cloud_not_found'));
                else if (err === 'INVALID') gx.toast(t('cloud_bad_code'));
                else if (err === 'OFFLINE') gx.toast(t('cloud_offline'));
                else gx.toast(t('cloud_error'));
            });
        },
        initCreatorSyncUnlock() {
            const row = document.getElementById('home-creator-sync');
            const el = document.getElementById('home-version');
            if (!row || !el || el.dataset.creatorSync) return;
            el.dataset.creatorSync = '1';
            const show = () => { if (typeof scOwnerIdentityMatch === 'function' && scOwnerIdentityMatch()) row.style.display = ''; };
            try { if (localStorage.getItem('soup_creator_sync_v1') === '1') show(); } catch (e) {}
            if (typeof PRODUCTION_BUILD !== 'undefined' && PRODUCTION_BUILD) {
                if (typeof scOwnerIdentityMatch === 'function' && scOwnerIdentityMatch()) show();
                return;
            }
            let taps = [];
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                const now = Date.now();
                taps.push(now);
                taps = taps.filter(ts => now - ts <= 3000);
                if (taps.length >= 7) {
                    taps = [];
                    if (typeof scOwnerIdentityMatch === 'function' && !scOwnerIdentityMatch()) return;
                    try { localStorage.setItem('soup_creator_sync_v1', '1'); } catch (e) {}
                    show();
                    gx.toast(t('creator_sync_unlocked'));
                }
            });
        },
        initDevSyncUi() {
            try {
                if (typeof SC_LOCAL_DEV === 'undefined' || !SC_LOCAL_DEV) return;
                const row = document.getElementById('pause-backup-dev');
                if (row) row.style.display = '';
            } catch (e) {}
        },
        maybeMobileDevHint() {
            try {
                if (typeof SC_LOCAL_DEV === 'undefined' || !SC_LOCAL_DEV) return;
                if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
                if (sessionStorage.getItem('sc_dev_sync_hint')) return;
                let owned = 0;
                try {
                    if (typeof collection !== 'undefined' && collection.catalog) {
                        owned = collection.catalog().filter(c => { try { return collection.owned(c.id); } catch (e) { return false; } }).length;
                    }
                } catch (e) {}
                if (owned > 3) return;
                sessionStorage.setItem('sc_dev_sync_hint', '1');
                if (typeof gx !== 'undefined') gx.toast(t('dev_sync_hint'));
            } catch (e) {}
        }
    };
})(typeof window !== 'undefined' ? window : this);
