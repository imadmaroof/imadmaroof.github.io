/* ==========================================================================
   PLAYER SPRITE — the character who walks the overworld
   ==========================================================================

   Drawn as text, one character per pixel, so it can be edited by hand in
   any text editor: change a letter, reload, and the sprite changes. Every
   frame is 16 pixels wide and 24 tall, and is shown at 3x (48 x 72 px).

   The sprite faces RIGHT. Walking left mirrors it, so there is no need to
   draw left-facing frames.

   --------------------------------------------------------------------------
   PALETTE — each letter is one colour
   --------------------------------------------------------------------------

   The colours themselves live in css/style.css, in the :root block with the
   rest of the site's palette (--hat, --skin, --suit ...), so the sprite can
   be recoloured without touching this file.

       .  transparent       K  outline (ink)
       Y  straw hat         L  hat highlight     y  hat shadow
       R  red band / tie    r  band shadow
       B  hair              b  hair highlight
       S  skin              h  skin highlight    s  skin shadow
       W  white shirt
       N  suit              M  suit highlight    n  suit shadow
       O  shoes

   --------------------------------------------------------------------------
   FRAMES — when each one is shown
   --------------------------------------------------------------------------

       idle    standing still on the map
       walk1   mid-stride; alternates with walk2 while walking
       walk2   legs passing each other
       jump    the hop into and out of a pipe
       hit     fist up, punching a ? block from underneath

   The head is shared by most frames (HEAD below) and each frame adds its
   own body, so a change to the face or hat only has to be made once. `hit`
   is drawn whole, because the raised arm passes in front of the head.

   Further down the same file: the treasure chest (closed and open), the
   small skill icons shown when a ? block is opened, and the page icon on
   the LIST VIEW card of the mode select.

   This is a plain script, not an ES module, for the same reason as
   js/projects.js: the site has to work straight off the filesystem. It
   publishes one global, PLAYER_SPRITE, which js/map.js turns into SVG.
   ========================================================================== */

(function () {
  'use strict';

  /* Straw hat, messy fringe, face looking right. Rows 0-15. */
  var HEAD = [
    '.....KKKKKK.....',
    '...KKLLYYYYKK...',
    '..KLYYYYYYYYyK..',
    '..KRRRRRRRRRrK..',
    'KKyYYYYYYYYYYyKK',
    'KYYYYYYYYYYYYYyK',
    '.KKKKKKKKKKKKKK.',
    '.KBbBBBbBBBbBBK.',
    'KBBBbBBBBbBBBbBK',
    'KBbBBSBBSBSSBSBK',
    '.KBBSSKKKSSKKKSK',
    '.KBsSSWKSSSWKSSK',
    '.KBsSSSSSSSSShK.',
    '..KsSSSSSsssSSK.',
    '...KSSSSSKKSSK..',
    '....KKSSSSSKK...'
  ];

  /* Suit, red tie, legs. Rows 16-23, one body per frame. */
  var BODY = {
    idle: [
      '....KNWRWNK.....',
      '...KNNWRWNNK....',
      '..KNNNNRNNNNK...',
      '..KMNNNRNNNnK...',
      '..KSKNNNNNKSK...',
      '...KNNNKNNNK....',
      '...KNNK.KNNK....',
      '..KOOOK.KOOOOK..'
    ],
    walk1: [
      '....KNWRWNK.....',
      '...KNNWRWNNK....',
      '..KNNNNRNNNNK...',
      '..KMNNNRNNNnK...',
      '..KSKNNNNNKSK...',
      '..KNNNNKNNNNK...',
      '.KNNK....KNNK...',
      'KOOOK....KOOOOK.'
    ],
    walk2: [
      '....KNWRWNK.....',
      '...KNNWRWNNK....',
      '..KNNNNRNNNNK...',
      '..KMNNNRNNNnK...',
      '...KSNNNNNSK....',
      '....KNNNNNK.....',
      '....KNNKNNK.....',
      '...KOOOKOOOOK...'
    ],
    jump: [
      '....KNWRWNK.....',
      'KKKKNNWRWNNKKKK.',
      'KSNNNNNRNNNNNSK.',
      '.KKKMNNRNNnKKK..',
      '...KNNNNNNNK....',
      '...KNNNNNNNK....',
      '....KNNKNNK.....',
      '....KOOKOOOK....'
    ]
  };

  var frames = {};
  for (var name in BODY) {
    if (Object.prototype.hasOwnProperty.call(BODY, name)) {
      frames[name] = HEAD.concat(BODY[name]);
    }
  }

  /* Fist raised to punch a block. The BACK arm goes up, on the left, so the
     face stays whole; the white cuff separates the hand from the sleeve. */
  frames.hit = [
    'KKKK.KKKKKK.....',
    'KSSKKLLYYYYKK...',
    'KSSKYYYYYYYYyK..',
    'KWWKRRRRRRRRrK..',
    'KNNKYYYYYYYYYyKK',
    'KNNKYYYYYYYYYYyK',
    'KNNKKKKKKKKKKKK.',
    'KNNKBBBbBBBbBBK.',
    'KNNKbBBBBbBBBbBK',
    'KNNKBSBBSBSSBSBK',
    'KNNKSSKKKSSKKKSK',
    'KNNKSSWKSSSWKSSK',
    'KNNKSSSSSSSSShK.',
    'KNNKSSSSSsssSSK.',
    'KNNKSSSSSKKSSK..',
    'KNNKKKSSSSSKK...',
    '.KNNNNWRWNK.....',
    '..KNNNWRWNNK....',
    '..KNNNNRNNNNKK..',
    '..KMNNNRNNNnKSK.',
    '...KNNNNNNNKK...',
    '...KNNNNNNNK....',
    '....KNNKNNK.....',
    '....KOOKOOOK....'
  ];

  window.PLAYER_SPRITE = {
    width:  16,
    height: 24,
    /* letter -> CSS class (px-<name>) that sets the fill */
    palette: {
      K: 'ink',
      L: 'hat-hi',  Y: 'hat',   y: 'hat-lo',
      R: 'band',    r: 'band-lo',
      B: 'hair',    b: 'hair-hi',
      S: 'skin',    h: 'skin-hi', s: 'skin-lo',
      W: 'shirt',
      N: 'suit',    M: 'suit-hi', n: 'suit-lo',
      O: 'shoe'
    },
    frames: frames
  };

  /* ========================================================================
     TREASURE CHEST — what a ? block gives you. 18 x 14, shown at 5x.

       K outline   D wood   h wood highlight   d wood shadow   I wood, dark
       G gold      L gold highlight   g gold shadow   b keyhole   W glow
     ======================================================================== */
  var CHEST_PALETTE = {
    K: 'ink', D: 'dirt', h: 'dirt-hi', d: 'dirt-lo', I: 'dirt-deep',
    G: 'gold', L: 'gold-hi', g: 'gold-lo', b: 'gold-deep', W: 'white'
  };
  var CHEST = {
    closed: [
      '..KKKKKKKKKKKKKK..',
      '.KhhhhhhhhhhhhhhK.',
      'KhDDDDDDDDDDDDDDdK',
      'KhDDDDDDDDDDDDDDdK',
      'KGGGGGGGGGGGGGGGgK',
      'KKKKKKKKLLKKKKKKKK',
      'KhDDDDDGLLGDDDDDdK',
      'KhDDDDDGbbGDDDDDdK',
      'KhDDDDDDGGDDDDDDdK',
      'KhDDDDDDDDDDDDDDdK',
      'KGGGGGGGGGGGGGGGgK',
      'KdDDDDDDDDDDDDDDdK',
      'KddddddddddddddddK',
      '.KKKKKKKKKKKKKKKK.'
    ],
    open: [
      '..KKKKKKKKKKKKKK..',
      '.KIIIIIIIIIIIIIIK.',
      '.KIdddddddddddIIK.',
      '.KGGGGGGGGGGGGGgK.',
      'KKKKKKKKKKKKKKKKKK',
      'KLLLLWWWLLLWWWLLLK',
      'KGLLLLLLLLLLLLLLgK',
      'KhDDDDDGLLGDDDDDdK',
      'KhDDDDDGbbGDDDDDdK',
      'KhDDDDDDGGDDDDDDdK',
      'KGGGGGGGGGGGGGGGgK',
      'KdDDDDDDDDDDDDDDdK',
      'KddddddddddddddddK',
      '.KKKKKKKKKKKKKKKK.'
    ]
  };

  /* ========================================================================
     SKILL ICONS — 10 x 10, one per kind of skill. A skill in js/projects.js
     picks its icon by name (CAD, SOLDERING, 3D PRINTING, CODING, ELECTRONICS
     ...) or by an explicit `icon` field; anything else gets the star.
     ======================================================================== */
  var ICON_PALETTE = {
    K: 'ink', W: 'white', T: 'water', t: 'water-lo', U: 'water-hi',
    G: 'gold', g: 'gold-lo', L: 'gold-hi', R: 'accent', r: 'accent-lo',
    S: 'stone', s: 'stone-lo', N: 'panel-alt', n: 'panel-alt-lo',
    E: 'grass', O: 'hot'
  };
  var ICONS = {
    code: [            /* a terminal with a prompt */
      'KKKKKKKKKK', 'KTTTTTRGEK', 'KKKKKKKKKK', 'KnnnnnnnnK', 'KnWnnnnnnK',
      'KnnWnnnnnK', 'KnWnnnnnnK', 'KnnnnWWWnK', 'KnnnnnnnnK', 'KKKKKKKKKK'
    ],
    cad: [             /* a shaded cube */
      '....KK....', '..KKUUKK..', 'KKUUUUUUKK', 'KTKKUUKKtK', 'KTTTKKtttK',
      'KTTTTKtttK', 'KTTTTKtttK', 'KKTTTKttKK', '..KKTKKK..', '....KK....'
    ],
    solder: [          /* a soldering iron with a hot tip */
      '......K.K.', '.......K..', '......KOK.', '.....KOK..', '....KSK...',
      '...KSK....', '..KRRK....', '.KRRK.....', 'KRrK......', 'KKK.......'
    ],
    print: [           /* a print nozzle over a layered bed */
      '..KKKKKK..', '..KSSSSK..', '...KssK...', '....KK....', '....GG....',
      '..........', 'KKKKKKKKKK', 'KRRRRRRRRK', 'KTTTTTTTTK', 'KKKKKKKKKK'
    ],
    chip: [            /* an IC with its legs */
      '.S.S.S.S..', 'KKKKKKKKK.', 'KnnnnnnnK.', 'KnEnnnnnKS', 'KnnnnnnnK.',
      'KnnnnnnnKS', 'KnnnnnnnK.', 'KKKKKKKKK.', '.S.S.S.S..', '..........'
    ],
    list: [            /* a page of rows: the LIST VIEW card on arrival */
      'KKKKKKKKKK', 'KWWWWWWWWK', 'KWGWssssWK', 'KWWWWWWWWK', 'KWGWsssWWK',
      'KWWWWWWWWK', 'KWGWssssWK', 'KWWWWWWWWK', 'KWGWssWWWK', 'KKKKKKKKKK'
    ],
    star: [            /* everything else */
      '....KK....', '....KGK...', '...KGGK...', 'KKKKGLGKKK', '.KGGLLGGK.',
      '..KGGGgK..', '..KGgKGgK.', '.KGgK.KgK.', '.KKK...KK.', '..........'
    ]
  };

  /* Turn text grids into one SVG. Each named grid becomes its own <g
     class="fr fr-NAME"> so several frames can share one element and CSS can
     show whichever is current. Runs of the same colour on a row become a
     single rect. */
  function svg(grids, palette, width, height) {
    var out = '<svg viewBox="0 0 ' + width + ' ' + height +
              '" shape-rendering="crispEdges" aria-hidden="true">';
    for (var name in grids) {
      if (!Object.prototype.hasOwnProperty.call(grids, name)) continue;
      var rows = grids[name];
      out += '<g class="fr fr-' + name + '">';
      for (var y = 0; y < rows.length; y++) {
        var row = rows[y], x = 0;
        while (x < row.length) {
          var ch = row.charAt(x), run = 1;
          while (x + run < row.length && row.charAt(x + run) === ch) run++;
          if (ch !== '.' && palette[ch]) {
            out += '<rect x="' + x + '" y="' + y + '" width="' + run +
                   '" height="1" class="px-' + palette[ch] + '"/>';
          }
          x += run;
        }
      }
      out += '</g>';
    }
    return out + '</svg>';
  }

  /* Which icon a skill gets: an explicit `icon` wins, then its name. */
  var ICON_WORDS = [
    ['cad',    /\bcad\b|fusion|solidworks|onshape/i],
    ['solder', /solder/i],
    ['print',  /3d|print/i],
    ['chip',   /electr|circuit|pcb|arduino|teensy|embedded|hardware/i],
    ['code',   /cod|program|python|java|c\+\+|software|script|\bweb\b|\bml\b|machine learning/i]
  ];
  function iconFor(skill) {
    if (skill.icon && ICONS[skill.icon]) return skill.icon;
    for (var i = 0; i < ICON_WORDS.length; i++) {
      if (ICON_WORDS[i][1].test(skill.name || '')) return ICON_WORDS[i][0];
    }
    return 'star';
  }

  window.PIXEL = {
    svg: svg,
    iconName: iconFor,
    chest: function () { return svg(CHEST, CHEST_PALETTE, 18, 14); },
    icon: function (skill) {
      var one = {}; one.icon = ICONS[iconFor(skill)];
      return svg(one, ICON_PALETTE, 10, 10);
    }
  };
}());
