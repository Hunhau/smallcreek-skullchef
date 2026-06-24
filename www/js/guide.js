/* In-game codex / guide — global guide. Runtime deps: t, objective, tutorial, pauseMenu. */
(function (global) {
    'use strict';

    global.guide = {
        topics: [
            { icon: '🥄', titleKey: 'tut_s1_title', bodyKey: 'tut_s1_body' },
            { icon: '👥', titleKey: 'tut_s2_title', bodyKey: 'tut_s2_body' },
            { icon: '👼', titleKey: 'tut_s3_title', bodyKey: 'tut_s3_body' },
            { icon: '🌱', titleKey: 'tut_s4_title', bodyKey: 'tut_s4_body' },
            { icon: '🎴', titleKey: 'tut_s5_title', bodyKey: 'tut_s5_body' },
            { icon: '🗺️', titleKey: 'tut_s6_title', bodyKey: 'tut_s6_body' },
            { icon: '📜', titleKey: 'tut_s7_title', bodyKey: 'tut_s7_body' },
            { icon: '👑', titleKey: 'guide_prix_title', bodyKey: 'guide_prix_body' },
            { icon: '🥊', titleKey: 'guide_skirmish_title', bodyKey: 'guide_skirmish_body' },
            { icon: '🌳', titleKey: 'guide_tree_title', bodyKey: 'guide_tree_body' },
            { icon: '💾', titleKey: 'guide_loadouts_title', bodyKey: 'guide_loadouts_body' },
            { icon: '💕', titleKey: 'guide_team_title', bodyKey: 'guide_team_body' },
            { icon: '🥄', titleKey: 'guide_spoons_title', bodyKey: 'guide_spoons_body' },
            { icon: '🎯', titleKey: 'guide_objective_title', bodyKey: 'guide_objective_body' },
            { icon: '🏷️', titleKey: 'guide_chips_title', bodyKey: 'guide_chips_body' },
            { icon: '🎁', titleKey: 'guide_items_title', bodyKey: 'guide_items_body' }
        ],
        _esc(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        },
        open() {
            this.render();
            const md = document.getElementById('guide-modal');
            if (md) md.classList.add('open');
        },
        close() {
            const md = document.getElementById('guide-modal');
            if (md) md.classList.remove('open');
        },
        _leavePause() {
            try { this.close(); } catch (e) {}
            try { pauseMenu.close(); pauseMenu._unpause(); } catch (e2) {}
        },
        render() {
            try {
                const nextEl = document.getElementById('guide-next');
                const goBtn = document.getElementById('guide-next-go');
                if (nextEl) {
                    let g = null;
                    try { objective.sync(); g = objective.compute(); } catch (e0) {}
                    const text = (g && g.text) ? g.text : t('guide_next_none');
                    const icon = (g && g.icon) ? g.icon : '🎯';
                    const hasAction = !!(g && g.action);
                    nextEl.innerHTML =
                        '<div class="guide-next-label">' + this._esc(t('guide_next_title')) + '</div>' +
                        '<div class="guide-next-text">' + this._esc(icon + ' ' + text) + '</div>';
                    if (goBtn) {
                        goBtn.style.display = hasAction ? 'inline-flex' : 'none';
                        goBtn.disabled = !hasAction;
                    }
                }
                const list = document.getElementById('guide-topics');
                if (list) {
                    list.innerHTML = this.topics.map(function (topic) {
                        return '<article class="guide-topic">' +
                            '<div class="guide-topic-head">' +
                            '<span class="guide-topic-icon" aria-hidden="true">' + topic.icon + '</span>' +
                            '<h3 class="guide-topic-title">' + global.guide._esc(t(topic.titleKey)) + '</h3>' +
                            '</div>' +
                            '<p class="guide-topic-body">' + global.guide._esc(t(topic.bodyKey)) + '</p>' +
                            '</article>';
                    }).join('');
                }
            } catch (e) {}
        },
        replayTutorial() {
            this._leavePause();
            try { tutorial.start(0); } catch (e) {}
        },
        goToObjective() {
            this._leavePause();
            try {
                objective.sync();
                const g = objective.compute();
                objective._current = g;
                if (g && g.action) {
                    g.action();
                    return;
                }
                const ls = document.getElementById('lore-scroll');
                if (ls) {
                    ls.classList.add('goal-pulse');
                    setTimeout(function () { try { ls.classList.remove('goal-pulse'); } catch (e) {} }, 1400);
                }
            } catch (e) {}
        }
    };
})(typeof window !== 'undefined' ? window : this);
