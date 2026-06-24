/* Angel Shard upgrade tree — global atree. */
(function (global) {
    'use strict';

    global.atree = {
        open() { this.render(); document.getElementById('tree-modal').classList.add('open'); },
        close() { document.getElementById('tree-modal').classList.remove('open'); },
        cost(def) {
            const lv = game.tree[def.k] || 0;
            if (def.inf) return Math.max(1, Math.floor(def.cb * Math.pow(def.cg || 1.5, lv)));
            return def.cb + lv;
        },
        render() {
            const sh = document.getElementById('tree-shards'); if (sh) sh.innerText = game.as;
            const list = document.getElementById('tree-list'); if (!list) return;
            list.innerHTML = game.treeDefs.map(def => {
                const lv = game.tree[def.k]; const maxed = !def.inf && lv >= def.mx; const cost = this.cost(def); const can = !maxed && game.as >= cost;
                const cap = def.inf ? '∞' : def.mx;
                return `<div class="tnode ${maxed ? 'maxed' : ''}"><div style="font-weight:bold; color:var(--ac)">${t('node_' + def.k + '_name')} <span style="float:right; color:var(--go)">${t('lv')}${lv}/${cap}</span></div><div style="font-size:0.72rem; color:#cbd5e1; margin:4px 0">${t('node_' + def.k + '_desc')}</div>${maxed ? `<span style="color:var(--go); font-size:0.75rem; font-weight:bold">${t('tree_max')}</span>` : `<button class="gx-btn sm" ${can ? '' : 'disabled'} onclick="atree.buy('${def.k}')">${t('tree_upgrade', {cost})}</button>`}</div>`;
            }).join('');
        },
        buy(k) {
            const def = game.treeDefs.find(x => x.k === k); if (!def) return;
            const lv = game.tree[k]; if (!def.inf && lv >= def.mx) return;
            const cost = this.cost(def); if (game.as < cost) return;
            game.as -= cost; game.tree[k] = lv + 1;
            sound.play('buy'); game.part(window.innerWidth / 2, window.innerHeight / 2, 'magic');
            game.save(); this.render(); game.render();
        }
    };
})(typeof window !== 'undefined' ? window : this);
