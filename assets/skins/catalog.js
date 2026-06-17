// ============================================================================
// SMALLCREEK SKULLCHEF — Catálogo de skins coleccionables
// ----------------------------------------------------------------------------
// Este archivo lo MANTIENES TÚ (arte). El motor `collection` de index.html lo
// consume vía window.SKIN_CATALOG. No toca lógica de juego.
//
// Contrato por entrada (todos los campos son obligatorios):
//   id       : string única (recomendado = nombre del archivo sin extensión)
//   rarity   : 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'superleg'
//   family   : 'helper' | 'spoon' | 'chefhat'   (controla la etiqueta de familia)
//   img      : ruta relativa a index.html, p.ej. 'assets/skins/pio_rare_shades.png'
//   name_en  : nombre mostrado en inglés
//   name_es  : nombre mostrado en español
//
// Pesos de drop (definidos en el motor): common 50 / uncommon 25 / rare 14 /
//   epic 7 / legendary 3 / superleg 1  → cuanto más raro, menos probable.
// Para añadir más skins en el futuro: añade objetos aquí y deja el PNG (~256px,
//   fondo transparente) en esta carpeta. El motor los precarga y dibuja solo.
// ============================================================================
(function () {
  window.SKIN_CATALOG = [
    // ===== AYUDANTES — Pío =====
    { id: 'pio_common_beanie',    rarity: 'common',    family: 'helper', img: 'assets/skins/pio_common_beanie.png',    name_en: 'Pío · Knit Beanie',     name_es: 'Pío · Gorro de Punto' },
    { id: 'pio_uncommon_cap',     rarity: 'uncommon',  family: 'helper', img: 'assets/skins/pio_uncommon_cap.png',     name_en: 'Pío · Snapback',        name_es: 'Pío · Gorra Snapback' },
    { id: 'pio_rare_shades',      rarity: 'rare',      family: 'helper', img: 'assets/skins/pio_rare_shades.png',      name_en: 'Pío · Cool Shades',     name_es: 'Pío · Gafas de Sol' },
    { id: 'pio_epic_chain',       rarity: 'epic',      family: 'helper', img: 'assets/skins/pio_epic_chain.png',       name_en: 'Pío · Gold Chain',      name_es: 'Pío · Cadena de Oro' },
    { id: 'pio_legendary_drip',   rarity: 'legendary', family: 'helper', img: 'assets/skins/pio_legendary_drip.png',   name_en: 'Pío · Full Drip',       name_es: 'Pío · Drip Total' },
    { id: 'pio_superleg_iced',    rarity: 'superleg',  family: 'helper', img: 'assets/skins/pio_superleg_iced.png',    name_en: 'Pío · Iced Out',        name_es: 'Pío · Diamantes' },

    // ===== AYUDANTES — Ivan =====
    { id: 'ivan_common_basic',    rarity: 'common',    family: 'helper', img: 'assets/skins/ivan_common_basic.png',    name_en: 'Ivan · Basic Fit',      name_es: 'Ivan · Look Básico' },
    { id: 'ivan_uncommon_cap',    rarity: 'uncommon',  family: 'helper', img: 'assets/skins/ivan_uncommon_cap.png',    name_en: 'Ivan · Snapback',       name_es: 'Ivan · Gorra Snapback' },
    { id: 'ivan_rare_skulltee',   rarity: 'rare',      family: 'helper', img: 'assets/skins/ivan_rare_skulltee.png',   name_en: 'Ivan · Skull Tank',     name_es: 'Ivan · Camiseta Calavera' },
    { id: 'ivan_epic_cresttank',  rarity: 'epic',      family: 'helper', img: 'assets/skins/ivan_epic_cresttank.png',  name_en: 'Ivan · Crest Tank',     name_es: 'Ivan · Tirantes Escudo' },
    { id: 'ivan_legendary_drip',  rarity: 'legendary', family: 'helper', img: 'assets/skins/ivan_legendary_drip.png',  name_en: 'Ivan · Full Drip',      name_es: 'Ivan · Drip Total' },
    { id: 'ivan_superleg_iced',   rarity: 'superleg',  family: 'helper', img: 'assets/skins/ivan_superleg_iced.png',   name_en: 'Ivan · Iced Out',       name_es: 'Ivan · Diamantes' },

    // ===== AYUDANTES — Coco =====
    { id: 'coco_common_beanie',   rarity: 'common',    family: 'helper', img: 'assets/skins/coco_common_beanie.png',   name_en: 'Coco · Knit Beanie',    name_es: 'Coco · Gorro de Punto' },
    { id: 'coco_uncommon_cap',    rarity: 'uncommon',  family: 'helper', img: 'assets/skins/coco_uncommon_cap.png',    name_en: 'Coco · Snapback',       name_es: 'Coco · Gorra Snapback' },
    { id: 'coco_rare_shades',     rarity: 'rare',      family: 'helper', img: 'assets/skins/coco_rare_shades.png',     name_en: 'Coco · Cool Shades',    name_es: 'Coco · Gafas de Sol' },
    { id: 'coco_epic_chain',      rarity: 'epic',      family: 'helper', img: 'assets/skins/coco_epic_chain.png',      name_en: 'Coco · Gold Chain',     name_es: 'Coco · Cadena de Oro' },
    { id: 'coco_legendary_drip',  rarity: 'legendary', family: 'helper', img: 'assets/skins/coco_legendary_drip.png',  name_en: 'Coco · Full Drip',      name_es: 'Coco · Drip Total' },
    { id: 'coco_superleg_iced',   rarity: 'superleg',  family: 'helper', img: 'assets/skins/coco_superleg_iced.png',   name_en: 'Coco · Iced Out',       name_es: 'Coco · Diamantes' },

    // ===== AYUDANTES — Baby Bunny =====
    { id: 'bunny_common_hoodie',     rarity: 'common',    family: 'helper', img: 'assets/skins/bunny_common_hoodie.png',     name_en: 'Bunny · Hoodie',        name_es: 'Bunny · Sudadera' },
    { id: 'bunny_uncommon_cap',      rarity: 'uncommon',  family: 'helper', img: 'assets/skins/bunny_uncommon_cap.png',      name_en: 'Bunny · Snapback',      name_es: 'Bunny · Gorra Snapback' },
    { id: 'bunny_rare_shades',       rarity: 'rare',      family: 'helper', img: 'assets/skins/bunny_rare_shades.png',       name_en: 'Bunny · Cool Shades',   name_es: 'Bunny · Gafas de Sol' },
    { id: 'bunny_epic_cresthoodie',  rarity: 'epic',      family: 'helper', img: 'assets/skins/bunny_epic_cresthoodie.png',  name_en: 'Bunny · Crest Hoodie',  name_es: 'Bunny · Sudadera Escudo' },
    { id: 'bunny_legendary_drip',    rarity: 'legendary', family: 'helper', img: 'assets/skins/bunny_legendary_drip.png',    name_en: 'Bunny · Full Drip',     name_es: 'Bunny · Drip Total' },
    { id: 'bunny_superleg_iced',     rarity: 'superleg',  family: 'helper', img: 'assets/skins/bunny_superleg_iced.png',     name_en: 'Bunny · Iced Out',      name_es: 'Bunny · Diamantes' },

    // ===== CUCHARAS =====
    { id: 'spoon_common_wood',      rarity: 'common',    family: 'spoon', img: 'assets/skins/spoon_common_wood.png',      name_en: 'Wooden Spoon',          name_es: 'Cuchara de Madera' },
    { id: 'spoon_uncommon_carved',  rarity: 'uncommon',  family: 'spoon', img: 'assets/skins/spoon_uncommon_carved.png',  name_en: 'Carved Skull Spoon',    name_es: 'Cuchara Tallada' },
    { id: 'spoon_rare_steel',       rarity: 'rare',      family: 'spoon', img: 'assets/skins/spoon_rare_steel.png',       name_en: 'Steel Skull Spoon',     name_es: 'Cuchara de Acero' },
    { id: 'spoon_epic_gold',        rarity: 'epic',      family: 'spoon', img: 'assets/skins/spoon_epic_gold.png',        name_en: 'Golden Crest Spoon',    name_es: 'Cuchara de Oro' },
    { id: 'spoon_legendary_royal',  rarity: 'legendary', family: 'spoon', img: 'assets/skins/spoon_legendary_royal.png',  name_en: 'Royal Jeweled Spoon',   name_es: 'Cuchara Real' },
    { id: 'spoon_superleg_iced',    rarity: 'superleg',  family: 'spoon', img: 'assets/skins/spoon_superleg_iced.png',    name_en: 'Diamond Spoon',         name_es: 'Cuchara de Diamantes' },

    // ===== GORRO DE CHEF =====
    { id: 'chefhat_common_white',      rarity: 'common',    family: 'chefhat', img: 'assets/skins/chefhat_common_white.png',      name_en: "Classic Chef's Hat",    name_es: 'Gorro Clásico' },
    { id: 'chefhat_uncommon_band',     rarity: 'uncommon',  family: 'chefhat', img: 'assets/skins/chefhat_uncommon_band.png',     name_en: 'Skull Band Hat',        name_es: 'Gorro con Banda' },
    { id: 'chefhat_rare_skullprint',   rarity: 'rare',      family: 'chefhat', img: 'assets/skins/chefhat_rare_skullprint.png',   name_en: 'Skull Print Hat',       name_es: 'Gorro Estampado' },
    { id: 'chefhat_epic_goldemblem',   rarity: 'epic',      family: 'chefhat', img: 'assets/skins/chefhat_epic_goldemblem.png',   name_en: 'Gold Emblem Hat',       name_es: 'Gorro Emblema Dorado' },
    { id: 'chefhat_legendary_royal',   rarity: 'legendary', family: 'chefhat', img: 'assets/skins/chefhat_legendary_royal.png',   name_en: 'Royal Chef Hat',        name_es: 'Gorro Real' },
    { id: 'chefhat_superleg_iced',     rarity: 'superleg',  family: 'chefhat', img: 'assets/skins/chefhat_superleg_iced.png',     name_en: 'Diamond Chef Hat',      name_es: 'Gorro de Diamantes' }
  ];
})();
