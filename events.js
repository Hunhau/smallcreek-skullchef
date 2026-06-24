/* Seasonal / limited-time soft events (client-side dates).
   Boot calls events.applyTheme(); game reads events.getActive() for bonuses. */
(function (global) {
  'use strict';

  /** @type {Array<{id:string, start:string, end:string, theme?:string, label?:string, label_es?:string, lore_en?:string, lore_es?:string, cpsBonus?:number, clickBonus?:number, decorPack?:string, dropPack?:string}>} */
  const EVENTS = [
    {
      id: 'summer',
      start: '2026-06-01',
      end: '2026-08-31',
      theme: 'beach',
      label: 'Summer Splash',
      label_es: 'Verano Splash',
      lore_en: 'The cauldron runs suspiciously cold. Skullchef calls it chilled-soup ASMR. Coco brought floaties.',
      lore_es: 'El caldero está sospechosamente frío. Skullchef lo llama ASMR de sopa fría. Coco trajo flotadores.',
      cpsBonus: 0.05,
      clickBonus: 0.03,
      decorPack: 'summer',
      dropPack: 'pirate_plunder'
    },
    {
      id: 'bloom',
      start: '2027-03-01',
      end: '2027-03-21',
      theme: 'garden',
      label: 'Spring Bloom',
      label_es: 'Floración',
      lore_en: 'Green steam wisps rise from the pot. Bunny insists the carrots are "seasonal garnish".',
      lore_es: 'Vapor verde sale de la olla. Bunny insiste en que las zanahorias son "guarnición de temporada".',
      cpsBonus: 0.04,
      clickBonus: 0.02,
      dropPack: 'fairy_glade'
    },
    {
      id: 'halloween',
      start: '2026-10-25',
      end: '2026-11-02',
      theme: 'spooky',
      label: 'Spooky Stir',
      label_es: 'Remolino Espeluznante',
      lore_en: 'Purple fog curls over Esquelotia. The golden bubbles cackle when you pop them.',
      lore_es: 'Niebla morada envuelve Esqueletia. Las burbujas doradas sueltan risitas al explotar.',
      cpsBonus: 0.05,
      clickBonus: 0.04,
      dropPack: 'vampire_vogue'
    }
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

  function getPrimary(at) {
    const list = getActive(at);
    return list.length ? list[0] : null;
  }

  global.events = {
    EVENTS,
    getActive,
    getActiveId,
    getPrimary,
    applyTheme() {
      try {
        const active = getActive();
        const id = active.length ? active[0].id : '';
        document.documentElement.setAttribute('data-event', id);
      } catch (e) {}
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
