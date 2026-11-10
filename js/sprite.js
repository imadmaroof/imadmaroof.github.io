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

   The head is shared by every frame (HEAD below) and each frame adds its
   own body, so a change to the face or hat only has to be made once.

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
}());
