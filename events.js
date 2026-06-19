/* Seasonal / limited-time events scaffold (post-launch).
   Add entries to EVENTS; game boot calls events.getActive() for theming hooks. */
(function (global) {
  'use strict';

  /** @type {Array<{id:string, start:string, end:string, theme?:string, label?:string}>} */
  const EVENTS = [
    // Example (inactive until dates are set for a real season):
    // { id: 'halloween', start: '2026-10-25', end: '2026-11-02', theme: 'spooky', label: 'Halloween' },
    // { id: 'christmas', start: '2026-12-20', end: '2027-01-03', theme: 'winter', label: 'Winter Feast' },
    // { id: 'summer',    start: '2026-07-01', end: '2026-08-15', theme: 'beach',  label: 'Summer Splash' },
  ];

  function parseDay(iso) {
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  function getActive(at) {
    const now = at instanceof Date ? at : new Date();
    return EVENTS.filter((ev) => {
      const start = parseDay(ev.start);
      const end = parseDay(ev.end);
      if (!start || !end) return false;
      return now >= start && now <= end;
    });
  }

  function getActiveId(at) {
    const list = getActive(at);
    return list.length ? list[0].id : null;
  }

  global.events = {
    EVENTS,
    getActive,
    getActiveId,
    /** Future hook: apply CSS class / ambient swap when an event is live. */
    applyTheme() {
      try {
        const active = getActive();
        document.documentElement.dataset.event = active.length ? active[0].id : '';
      } catch (e) {}
    }
  };
})(typeof window !== 'undefined' ? window : this);
