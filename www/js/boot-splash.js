/* Early boot splash feedback (build-314). */
    /* First paint + tunnel/LAN boot feedback (iOS Safari). */
    try { document.documentElement.style.background = '#1a1030'; document.body.style.background = '#1a1030'; } catch (e) {}
    (function scBootSplashWatch() {
        var msg = document.getElementById('boot-splash-msg');
        var hint = document.getElementById('boot-splash-hint');
        var err = document.getElementById('boot-splash-err');
        var start = Date.now();
        var host = '';
        try { host = (location.hostname || '').toLowerCase(); } catch (e) {}
        var viaTunnel = /\.trycloudflare\.com$/i.test(host);
        var viaLan = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
        if (hint && (viaTunnel || viaLan)) {
            hint.style.display = 'block';
            hint.textContent = viaTunnel
                ? 'Túnel HTTPS: la 1ª carga puede tardar 1–3 min. No cierres la pestaña.'
                : 'Wi‑Fi local: la 1ª carga puede tardar un momento.';
        }
        function setErr(t) {
            if (!err) return;
            err.style.display = 'block';
            err.textContent = t;
        }
        window.__scBootSplashDone = function () {
            try { clearInterval(window.__scBootSplashIv); } catch (e) {}
        };
        window.__scBootSplashFail = function (t) { setErr(t); };
        window.__scBootSplashIv = setInterval(function () {
            if (!msg) return;
            var s = Math.floor((Date.now() - start) / 1000);
            if (s < 8) msg.textContent = 'Loading…';
            else if (s < 45) msg.textContent = 'Downloading game (' + s + 's)…';
            else if (viaTunnel) msg.textContent = 'Still loading (' + s + 's)…\nTunnel is slow — wait or use Wi‑Fi (option 2).';
            else msg.textContent = 'Still loading (' + s + 's)…';
        }, 1000);
        window.addEventListener('error', function (e) {
            try {
                if (e.target && e.target.tagName === 'SCRIPT') {
                    var src = e.target.src || e.target.getAttribute('src') || '?';
                    setErr('Script failed:\n' + src + '\n\nReload or try abrir-iphone.bat option 2 (Wi‑Fi).');
                }
            } catch (e2) {}
        }, true);
        setTimeout(function () {
            if (window.__scBootDone) return;
            setErr('Load is taking too long.\n\n1) Keep this tab open 2–3 min\n2) On PC: abrir-iphone.bat → option 2 (same Wi‑Fi)\n3) Scan the NEW QR (not an old link)');
        }, viaTunnel ? 150000 : 90000);
    })();
