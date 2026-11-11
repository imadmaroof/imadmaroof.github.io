/* ==========================================================================
   MAP — builds and drives the overworld
   --------------------------------------------------------------------------
   Everything here is generated from window.PROJECTS (see js/projects.js).
   You should never need to edit this file to add a project.

   What it does:
     1. computes a right-angled, Super-Mario-World-ish path from the number
        of projects (no hand-placed coordinates anywhere)
     2. drops a node on each bend of that path — a green pipe for published
        worlds, a greyed "?" block for locked ones
     3. floats a gold ? block over the start and between worlds, from
        window.POWERUPS; jumping into one opens a chest of skills
     4. walks the player sprite along the path on click / left and right
     5. plays the enter-pipe animation, then warps to the project page
     6. re-lays everything out on resize
     7. renders the mobile level-select list from the same array
   ========================================================================== */
(function () {
  'use strict';

  var projects = window.PROJECTS || [];
  var powerups = window.POWERUPS || [];
  var worlds   = window.WORLDS   || [];
  var SITE = window.SITE;

  /* --- layout constants -------------------------------------------------- */
  var NODE_GAP   = 340;   // horizontal px between world nodes (a ? block sits halfway)
  var ENTRY_X    = 95;    // the World 1 gate the path comes in through
  var START_X    = 230;   // px from the left edge to the start of the path
  var START_PAD  = 370;   // px from the left edge to world 1
  var CASTLE_GAP = 280;   // px from the last world to the castle
  var END_PAD    = 190;   // px of map after the castle
  var WORLD_GAP  = 200;   // extra px where one world ends and the next begins
  var BLEND      = 260;   // px over which one world's scenery fades into the next
  var FF_SECONDS = 0.8;   // a fast-forward never takes much longer than this
  /* Walking. The sprite eases in from standing, cruises, and brakes into the
     stop, rather than moving at one flat speed. A pipe-to-pipe leg is about
     385-485px of path, which these numbers walk in roughly 0.9-1.1s. */
  var WALK_SPEED = 560;   // px/s at full stride
  var WALK_ACCEL = 3200;  // px/s^2: standing to full stride in ~0.18s
  var WALK_DECEL = 2400;  // px/s^2: brakes over the last ~65px
  var WALK_MIN   = 60;    // px/s: never crawl the final few pixels
  var MIN_HEIGHT = 560;   // map never gets shorter than this

  /* Vertical position of each node, as a fraction of map height. The list
     cycles, which is what gives the path its zig-zag. Add more values for a
     bumpier map. */
  var NODE_Y = [0.62, 0.82, 0.66, 0.88, 0.70, 0.80];
  var LAND_TOP  = 0.40;   // where the ground starts
  var TRAIL_Y   = 0.74;   // y of the start point and the castle

  /* ? blocks. The block's underside sits BLOCK_LIFT px above the path, which
     is the 72px sprite plus the height of the jump that punches it. Kept in
     sync with the player-hit keyframes in css/style.css. */
  var BLOCK_LIFT = 102;
  var HIT_PEAK   = 130;   // ms into the jump when the fist meets the block
  var HIT_MS     = 300;   // the whole jump, crouch to landing

  /* --- element handles --------------------------------------------------- */
  var viewport = document.getElementById('map-viewport');
  var canvas   = document.getElementById('map-canvas');
  var land     = document.getElementById('layer-land');
  var hills    = document.getElementById('layer-hills');
  var cloudsF  = document.getElementById('layer-clouds-far');
  var cloudsN  = document.getElementById('layer-clouds-near');
  var pathSvg  = document.getElementById('layer-path');
  var pathEdge = document.getElementById('path-edge');
  var pathBack = document.getElementById('path-shadow');
  var pathLine = document.getElementById('path-dots');
  var player   = document.getElementById('player');
  var castleEl = document.getElementById('castle');
  var listEl   = document.getElementById('level-select-list');

  if (!viewport || !canvas) return;   /* not the overworld page */

  /* --- state ------------------------------------------------------------- */
  var points   = [];   // every corner of the path, in order
  var stops    = [];   // the places you can stand: the start, worlds, ? blocks, the castle
  var worldStop = [];  // project index -> its index in stops
  var opened   = {};   // ? blocks hit this visit, by their `after` key
  var hitting  = false;// mid-jump at a ? block
  var gates    = [];   // where each new world begins: {x, y, world}
  var boost    = 1;    // walking speed multiplier; above 1 while fast-forwarding
  var shownWorld = null; // the world the sprite was last seen in
  var coinEls  = [];   // {x, y, el, taken}
  var cursor   = 0;    // index into points: where the sprite currently stands
  var selected = 0;    // index into stops
  var entering = false;// the pipe dive / warp has begun; the page is leaving
  var divedInto = null;// stop index of the pipe this page went down, if any

  /* Pipe-entry timing. The dive is 340ms (hop, hang, sink) and the iris starts
     closing 40ms before it ends so the two overlap instead of queueing —
     total 480ms from keypress to navigation. Nothing here delays the START:
     the hop begins on the same frame as the click or Enter. Kept in sync with
     the pipe-enter / pipe-exit keyframes in css/style.css. */
  /* Which pipe the sprite is currently down. Kept separately from the iris
     hand-off because that is consumed by the project page on arrival, while
     this has to survive until the player comes back to the map — by the
     corner pipe, the HUD, or the browser's back button. */
  var STORE_PIPE = 'pixel-portfolio:inpipe';
  function rememberPipe(id) {
    try { sessionStorage.setItem(STORE_PIPE, id); } catch (e) { /* ignore */ }
  }
  function takePipe() {
    try {
      var v = sessionStorage.getItem(STORE_PIPE);
      sessionStorage.removeItem(STORE_PIPE);
      return v;
    } catch (e) { return null; }
  }

  var DIVE_MS      = 340;
  var EMERGE_MS    = 380;
  var IRIS_OVERLAP = 40;
  var busy     = false;
  var width    = 0;
  var height   = 0;

  /* ======================================================================
     SPRITES
     Original pixel art, drawn as inline SVG so it scales crisply and picks
     up the palette from CSS. Nothing here is traced from anyone's game.
     ====================================================================== */

  /* The player. The pixels live in js/sprite.js as text grids, one per
     frame; this turns them into a single SVG holding every frame as its own
     <g>, and CSS shows whichever one the current state calls for (standing,
     mid-stride, jumping). Runs of same-coloured pixels on a row are merged
     into one rect, which keeps a 16x24 sprite to a few dozen elements per
     frame instead of hundreds. */
  function buildPlayerSvg(sprite) {
    return window.PIXEL.svg(sprite.frames, sprite.palette, sprite.width, sprite.height);
  }

  /* A spinning coin. */
  var COIN_SVG =
    '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' +
      '<rect x="3" y="1" width="10" height="14" class="px-ink"/>' +
      '<rect x="2" y="3" width="12" height="10" class="px-ink"/>' +
      '<rect x="4" y="2" width="8" height="12" class="px-gold"/>' +
      '<rect x="3" y="4" width="10" height="8" class="px-gold"/>' +
      '<rect x="5" y="3" width="3" height="10" class="px-gold-hi"/>' +
      '<rect x="10" y="4" width="2" height="8" class="px-gold-lo"/>' +
      '<rect x="7" y="5" width="2" height="6" class="px-gold-deep"/>' +
    '</svg>';

  /* ======================================================================
     BUILDING THE MAP
     ====================================================================== */

  /* Which world a project belongs to: the first number of its label. */
  function worldNum(p) { return parseInt(String(p && p.world || '1'), 10) || 1; }
  function worldInfo(n) {
    for (var i = 0; i < worlds.length; i++) if (worlds[i].number === n) return worlds[i];
    return { number: n, name: '', theme: 'grassland' };
  }

  /* Pipes are NODE_GAP apart, with WORLD_GAP more wherever a new world starts. */
  function nodeX(i) {
    var x = START_PAD + i * NODE_GAP;
    for (var k = 1; k <= i && k < projects.length; k++) {
      if (worldNum(projects[k]) !== worldNum(projects[k - 1])) x += WORLD_GAP;
    }
    return x;
  }
  function nodeY(i)  { return Math.round(height * NODE_Y[i % NODE_Y.length]); }
  function castleX() { return nodeX(Math.max(projects.length - 1, 0)) + CASTLE_GAP; }

  /* The power-up that follows a given stop ('start' or a world id), if any. */
  function powerupAfter(key) {
    for (var i = 0; i < powerups.length; i++) {
      if (powerups[i] && powerups[i].after === key) return powerups[i];
    }
    return null;
  }

  /* Build the right-angled path and remember which point each stop sits on.
     A ? block between two stops goes halfway along the straight run leaving
     the first one, so adding power-ups never changes the shape of the path. */
  function buildPath() {
    points = [];
    stops  = [];
    worldStop = [];
    gates  = [];

    var startY = Math.round(height * TRAIL_Y);
    /* The path comes in from the left edge through the first world's gate,
       and the start stop is just past it. Nobody walks the bit before the
       start; it is there so the map has a way in. */
    points.push({ x: 0, y: startY });
    gates.push({ x: ENTRY_X, y: startY, world: projects.length ? worldNum(projects[0]) : 1, entry: true });
    points.push({ x: START_X, y: startY });
    /* The start of the path is a stop in its own right: you can always walk
       back to it, and it may carry the first ? block. */
    stops.push({ kind: 'start', powerup: powerupAfter('start'), point: points.length - 1, el: null });

    var prev = points[points.length - 1];

    function blockOnRun(afterKey, nextX) {
      var pu = powerupAfter(afterKey);
      if (!pu) return;
      points.push({ x: Math.round((prev.x + nextX) / 2), y: prev.y });
      stops.push({ kind: 'powerup', powerup: pu, point: points.length - 1, el: null });
    }

    for (var i = 0; i < projects.length; i++) {
      var x = nodeX(i), y = nodeY(i);
      if (i > 0) blockOnRun(projects[i - 1].id, x);
      /* A new world: its gate stands on the path between the last stop of
         the old world and the first pipe of the new one. */
      if (i > 0 && worldNum(projects[i]) !== worldNum(projects[i - 1])) {
        var last = points[points.length - 1];
        gates.push({ x: Math.round((last.x + x) / 2), y: last.y, world: worldNum(projects[i]) });
      }
      if (x !== prev.x && y !== prev.y) points.push({ x: x, y: prev.y }); // the corner
      points.push({ x: x, y: y });
      stops.push({ kind: 'world', project: projects[i], index: i, point: points.length - 1, el: null });
      worldStop[i] = stops.length - 1;
      prev = points[points.length - 1];
    }

    var cx = castleX(), cy = Math.round(height * TRAIL_Y);
    if (projects.length) blockOnRun(projects[projects.length - 1].id, cx);
    if (cx !== prev.x && cy !== prev.y) points.push({ x: cx, y: prev.y });
    points.push({ x: cx, y: cy });
    stops.push({ kind: 'castle', point: points.length - 1, el: castleEl });

    tallyLoot();
  }

  /* Each chest's contents, ready for the reward screen. */
  function tallyLoot() {
    for (var i = 0; i < stops.length; i++) {
      var pu = stops[i].powerup;
      if (!pu) continue;
      var loot = [];
      var skills = pu.skills || [];
      for (var k = 0; k < skills.length; k++) {
        var sk = skills[k] || {};
        var name = String(sk.name || '').trim().toUpperCase();
        if (!name) continue;
        loot.push({ name: name, detail: sk.detail || '', icon: sk.icon || '' });
      }
      stops[i].loot = loot;
    }
  }

  function drawPath() {
    var d = points.map(function (p) { return p.x + ',' + p.y; }).join(' ');
    pathSvg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    pathSvg.setAttribute('width', width);
    pathSvg.setAttribute('height', height);
    pathEdge.setAttribute('points', d);
    pathBack.setAttribute('points', d);
    pathLine.setAttribute('points', d);
  }

  /* --- world nodes ------------------------------------------------------- */
  function buildNodes() {
    /* Nodes are rebuilt from scratch on every layout so adding a project is
       genuinely just "add an object to the array". */
    var old = canvas.querySelectorAll('.node, .pipe-cap, .powerup');
    for (var k = 0; k < old.length; k++) old[k].remove();

    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      /* A locked project with a picture or video is work in progress: a real
         pipe, sealed shut, with a preview but no page. Without media it is a
         plain placeholder, a grey ? block. */
      var sealed = isSealed(p);
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'node' + (sealed ? ' node--sealed' : (p.locked ? ' node--locked' : ''));
      el.id = 'world-' + p.id;
      el.dataset.stop = String(worldStop[i]);
      el.title = p.blurb || '';
      el.setAttribute('aria-label',
        'World ' + p.world + ', ' + p.title +
        (sealed ? ' (in progress, no page yet)' : (p.locked ? ' (locked)' : '')) + '. ' + (p.blurb || ''));
      if (p.locked) el.setAttribute('aria-disabled', 'true');

      el.innerHTML =
        '<span class="node__cursor" aria-hidden="true"></span>' +
        '<span class="node__sign">' +
          '<span class="node__world">' + esc(p.world) + '</span>' +
          '<span class="node__title">' + esc(p.title) + '</span>' +
        '</span>' +
        '<span class="node__post" aria-hidden="true"></span>' +
        (p.locked && !sealed
          ? '<span class="qblock" aria-hidden="true">?</span>'
          : '<span class="pipe' + (sealed ? ' pipe--sealed' : '') + '" aria-hidden="true">' +
              '<span class="pipe__rim"><span class="pipe__mouth"></span></span>' +
              (sealed ? '<span class="pipe__lid"></span>' : '') +
              '<span class="pipe__body"></span>' +
            '</span>');

      var st = stops[worldStop[i]];
      var pt = points[st.point];
      el.style.left = pt.x + 'px';
      el.style.top  = pt.y + 'px';

      canvas.appendChild(el);
      st.el = el;

      /* The front half of the pipe: a copy of the rim, pinned over the real
         one but outside the node, so it can be painted ABOVE the sprite.
         This is what the sprite sinks behind when it enters. Measured from
         the live element rather than hard-coded, so it stays correct if the
         pipe is ever restyled. */
      if (!p.locked) {
        var pipe = el.querySelector('.pipe');
        var rim  = el.querySelector('.pipe__rim');
        var cap  = document.createElement('span');
        cap.className = 'pipe pipe-cap';
        cap.setAttribute('aria-hidden', 'true');
        cap.innerHTML = '<span class="pipe__rim"><span class="pipe__mouth"></span></span>';
        cap.style.left = pt.x + 'px';
        cap.style.top  = (pt.y - (pipe.offsetHeight - rim.offsetHeight)) + 'px';
        canvas.appendChild(cap);
        st.cap = cap;
      }
    }

    buildBlocks();
  }

  function isSealed(p) { return !!(p && p.locked && p.media); }

  /* --- ? blocks ---------------------------------------------------------- */
  function buildBlocks() {
    for (var i = 0; i < stops.length; i++) {
      var st = stops[i];
      if (!st.powerup) continue;
      var n = (st.loot || []).length;
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'powerup' + (opened[st.powerup.after] ? ' is-used' : '');
      el.dataset.stop = String(i);
      el.setAttribute('aria-label', 'Power-up: ' + (st.powerup.title || 'skills') +
        '. Opens a chest of ' + n + ' skill' + (n === 1 ? '' : 's') + '.');
      el.innerHTML =
        '<span class="node__cursor" aria-hidden="true"></span>' +
        '<span class="qblock qblock--mini" aria-hidden="true">?</span>';
      var pt = points[st.point];
      el.style.left = pt.x + 'px';
      el.style.top  = (pt.y - BLOCK_LIFT) + 'px';
      canvas.appendChild(el);
      st.el = el;
    }
  }

  /* --- coins ------------------------------------------------------------- */
  function buildCoins() {
    for (var k = 0; k < coinEls.length; k++) coinEls[k].el.remove();
    coinEls = [];

    /* One coin halfway along each horizontal run of the path (from the
       start on: nobody walks the way in). */
    for (var i = stops[0].point + 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      if (a.y !== b.y) continue;                       // vertical run, skip
      if (Math.abs(b.x - a.x) < 140) continue;         // too short to bother
      var el = document.createElement('div');
      el.className = 'coin pixel';
      el.innerHTML = COIN_SVG;
      var cx = Math.round((a.x + b.x) / 2);
      var cy = a.y - 34;
      el.style.left = cx + 'px';
      el.style.top  = cy + 'px';
      canvas.appendChild(el);
      coinEls.push({ x: cx, y: a.y, el: el, taken: false });
    }
  }

  /* --- backdrop layers --------------------------------------------------- */
  function layoutScenery() {
    var landTop = Math.round(height * LAND_TOP);
    land.style.height = (height - landTop) + 'px';
    hills.style.top   = (landTop - 168) + 'px';
    castleEl.style.left = castleX() + 'px';
    castleEl.style.top  = Math.round(height * TRAIL_Y) + 'px';
  }

  /* ======================================================================
     LAYOUT (runs on load and on resize)
     ====================================================================== */
  function layout() {
    height = Math.max(viewport.clientHeight, MIN_HEIGHT);
    width  = castleX() + END_PAD;

    canvas.style.width  = width + 'px';
    canvas.style.height = height + 'px';

    buildPath();
    layoutScenery();
    buildZones();
    drawPath();
    buildNodes();
    buildCoins();

    /* Put the sprite back on the stop it was standing on. */
    if (selected > stops.length - 1) selected = 0;
    cursor = stops[selected].point;
    placeSprite(points[cursor]);
    paintSelection();
    centreOn(points[cursor].x, true);
    parallax();
    if (previewEl) { previewFor = -1; updatePreview(); }
  }

  /* ======================================================================
     SPRITE + CAMERA
     ====================================================================== */
  function placeSprite(pt) {
    player.style.left = pt.x + 'px';
    player.style.top  = pt.y + 'px';
  }

  function centreOn(x, instant) {
    var target = Math.max(0, Math.min(x - viewport.clientWidth / 2, width - viewport.clientWidth));
    if (instant) viewport.scrollLeft = target;
    else viewport.scrollTo({ left: target, behavior: 'smooth' });
  }

  function parallax() {
    var s = viewport.scrollLeft;
    cloudsF.style.backgroundPositionX = (-s * 0.15) + 'px';
    cloudsN.style.backgroundPositionX = (-s * 0.32) + 'px';
    hills.style.backgroundPositionX   = (-s * 0.55) + 'px';
    var z = canvas.querySelectorAll('.zone');
    for (var i = 0; i < z.length; i++) {
      z[i].querySelector('.layer-clouds--far').style.backgroundPositionX  = (-s * 0.15) + 'px';
      z[i].querySelector('.layer-clouds--near').style.backgroundPositionX = (-s * 0.32) + 'px';
      z[i].querySelector('.layer-hills').style.backgroundPositionX        = (-s * 0.55) + 'px';
    }
  }

  /* ======================================================================
     WORLDS
     World 1 is the map's own scenery. Every later world lays its own sky,
     clouds, horizon and ground over the map from its gate onwards, fading in
     across BLEND px so the change happens as you walk through the gate.
     ====================================================================== */
  function buildZones() {
    var old = canvas.querySelectorAll('.zone, .world-gate');
    for (var k = 0; k < old.length; k++) old[k].remove();

    var landTop = Math.round(height * LAND_TOP);
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i], info = worldInfo(g.world);
      var left = g.x - BLEND / 2;

      /* The first world's gate is just a sign: its scenery is the map's own. */
      if (!g.entry) {
        var zone = document.createElement('div');
        zone.className = 'zone zone--' + (info.theme || 'grassland');
        zone.setAttribute('aria-hidden', 'true');
        zone.style.left  = left + 'px';
        zone.style.width = (width - left) + 'px';
        zone.style.setProperty('--blend', BLEND + 'px');
        zone.innerHTML =
          '<div class="zone__sky"></div>' +
          '<div class="zone__sun"></div>' +
          '<div class="layer-clouds layer-clouds--far"></div>' +
          '<div class="layer-clouds layer-clouds--near"></div>' +
          '<div class="layer-hills"></div>' +
          '<div class="layer-land"></div>';
        zone.querySelector('.zone__sun').style.top = (landTop - 150) + 'px';
        zone.querySelector('.layer-hills').style.top = (landTop - 168) + 'px';
        zone.querySelector('.layer-land').style.height = (height - landTop) + 'px';
        canvas.insertBefore(zone, pathSvg);
      }

      var gate = document.createElement('div');
      gate.className = 'world-gate';
      gate.setAttribute('aria-hidden', 'true');
      gate.style.left = g.x + 'px';
      gate.style.top  = g.y + 'px';
      gate.innerHTML =
        '<span class="world-gate__banner">' +
          '<span class="world-gate__world">WORLD ' + g.world + '</span>' +
          (info.name ? '<span class="world-gate__name">' + esc(info.name) + '</span>' : '') +
        '</span>' +
        '<span class="world-gate__post world-gate__post--l"></span>' +
        '<span class="world-gate__post world-gate__post--r"></span>';
      canvas.insertBefore(gate, player);
    }
    parallax();
  }

  /* The world at a given x on the map. */
  function worldAt(x) {
    var w = projects.length ? worldNum(projects[0]) : 1;
    for (var i = 0; i < gates.length; i++) if (x >= gates[i].x) w = gates[i].world;
    return w;
  }

  /* Walking through a gate puts up the new world's name for a moment. */
  var toastEl = null, toastTimer = null;
  function noteWorld(x, quiet) {
    var w = worldAt(x);
    if (w === shownWorld) return;
    var first = shownWorld === null;
    shownWorld = w;
    if (quiet || first) return;

    var info = worldInfo(w);
    announce('World ' + w + (info.name ? ', ' + info.name : ''));
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'world-toast';
      toastEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = '<span class="world-toast__world">WORLD ' + w + '</span>' +
      (info.name ? '<span class="world-toast__name">' + esc(info.name) + '</span>' : '');
    toastEl.classList.remove('is-on');
    void toastEl.offsetWidth;
    toastEl.classList.add('is-on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('is-on'); }, 1600);
  }

  /* ======================================================================
     WALKING
     Steps the sprite from point to point along the path until it reaches
     the target stop. Under prefers-reduced-motion it just teleports.
     ====================================================================== */
  function walkTo(stopIndex, done) {
    walkToPoint(stops[stopIndex].point, done);
  }

  /* The sprite's live pixel position, and the point index it is currently
     heading for. Between frames it sits somewhere on the segment joining
     points[cursor] and points[aim]. */
  var pos      = null;
  var aim      = null;
  var walkGoal = null;   // the point index we are ultimately walking to
  var walkDone = null;   // callback for the CURRENT goal, replaced on retarget
  var walking  = false;  // is the animation loop running?
  var speed    = 0;      // current walking speed, px/s

  /* Point the sprite at the next waypoint on the way to walkGoal. Called on
     arrival at every waypoint, and again whenever the goal changes — which is
     what lets a keypress mid-walk turn the sprite around instead of being
     thrown away. */
  function aimAtGoal() {
    var prev = aim;
    var dir = walkGoal > cursor ? 1 : (walkGoal < cursor ? -1 : 0);
    if (dir === 0) { aim = cursor; }
    /* If we are currently heading the other way we are part-way along the
       segment behind us, so walk back to points[cursor] first. Retargeting
       never cuts a corner. */
    else if (aim !== null && (aim - cursor) * dir < 0) aim = cursor;
    else aim = cursor + dir;

    /* Turning round mid-walk sheds most of the speed, the way a body has to
       stop before it can go back. Turning a corner does not: there the old
       and new waypoints are not on opposite sides of the sprite. */
    if (walking && pos && prev !== null && prev !== aim) {
      var a = points[prev], b = points[aim];
      if ((a.x - pos.x) * (b.x - pos.x) + (a.y - pos.y) * (b.y - pos.y) < 0) speed *= 0.25;
    }
  }

  /* Path distance still to walk, from where the sprite is to walkGoal. Used
     to brake for the FINAL stop only, so a run of quick presses carries
     straight through the pipes in between instead of slowing at each. */
  function remainingPath() {
    var d = Math.hypot(points[aim].x - pos.x, points[aim].y - pos.y);
    var dir = walkGoal > aim ? 1 : -1;
    for (var k = aim; k !== walkGoal; k += dir) {
      d += Math.hypot(points[k + dir].x - points[k].x, points[k + dir].y - points[k].y);
    }
    return d;
  }

  function walkToPoint(target, done) {
    walkGoal = target;
    walkDone = done || null;

    /* Reduced motion, or already standing there: no animation at all. */
    if (SITE.reducedMotion() || (target === cursor && (!pos || walking === false))) {
      walking = false;
      cursor  = target;
      aim     = cursor;
      pos     = { x: points[cursor].x, y: points[cursor].y };
      placeSprite(points[cursor]);
      centreOn(points[cursor].x, true);
      busy  = false;
      boost = 1;
      player.classList.remove('is-fast');
      noteWorld(points[cursor].x);
      var cb = walkDone; walkDone = null;
      if (cb) cb();
      updatePreview();
      return;
    }

    aimAtGoal();

    /* A loop is already running — it will pick up the new goal on its next
       frame. Starting a second loop would double the sprite's speed. */
    if (walking) return;

    if (!pos) pos = { x: points[cursor].x, y: points[cursor].y };

    walking = true;
    busy    = true;
    speed   = 0;
    hidePreview();
    player.classList.remove('is-idle');
    player.classList.add('is-walking');

    var last     = performance.now();
    var stepTick = 0;

    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      /* Speed up from standing, but never faster than lets us stop in the
         path that is left. */
      var brake = Math.sqrt(2 * WALK_DECEL * boost * remainingPath());
      speed = Math.min(WALK_SPEED * boost, speed + WALK_ACCEL * boost * dt, Math.max(brake, WALK_MIN));

      /* Spend this frame's movement along the path, carrying any left over
         through corners so the sprite does not hitch at each one. */
      var left = speed * dt;
      while (left > 0) {
        var goal = points[aim];
        var dx = goal.x - pos.x, dy = goal.y - pos.y;
        var dist = Math.hypot(dx, dy);

        if (dx > 1) player.classList.remove('is-flipped');
        else if (dx < -1) player.classList.add('is-flipped');

        if (dist <= left) {
          pos.x = goal.x; pos.y = goal.y;
          left -= dist;
          cursor = aim;
          if (cursor === walkGoal) { finish(); return; }
          aimAtGoal();
        } else {
          pos.x += dx / dist * left;
          pos.y += dy / dist * left;
          left = 0;
        }
      }

      placeSprite(pos);
      centreOn(pos.x, true);
      collectCoins(pos);
      noteWorld(pos.x);

      stepTick += dt;
      if (stepTick > 0.15) { stepTick = 0; SITE.sfx.step(); }

      requestAnimationFrame(frame);
    }

    function finish() {
      placeSprite(points[cursor]);
      centreOn(points[cursor].x, true);
      player.classList.remove('is-walking', 'is-fast');
      player.classList.add('is-idle');
      walking = false;
      busy    = false;
      speed   = 0;
      boost   = 1;
      noteWorld(points[cursor].x);
      var cb = walkDone; walkDone = null;
      if (cb) cb();
      updatePreview();
    }

    requestAnimationFrame(frame);
  }

  function collectCoins(pos) {
    for (var i = 0; i < coinEls.length; i++) {
      var c = coinEls[i];
      if (c.taken) continue;
      if (Math.abs(c.x - pos.x) < 26 && Math.abs(c.y - pos.y) < 40) {
        c.taken = true;
        c.el.classList.add('is-collected');
        SITE.sfx.coin();
      }
    }
  }

  /* ======================================================================
     SELECTION + ENTERING A WORLD
     ====================================================================== */
  function paintSelection() {
    for (var i = 0; i < stops.length; i++) {
      if (!stops[i].el) continue;
      stops[i].el.classList.toggle('is-selected', i === selected);
    }
  }

  function select(i, opts) {
    i = Math.max(0, Math.min(i, stops.length - 1));
    if (i === selected && !(opts && opts.force)) return;
    selected = i;
    paintSelection();
    SITE.sfx.select();
    if (opts && opts.walk) walkTo(i);
    else centreOn(points[stops[i].point].x, false);
  }

  /* One step along the map. `selected` is the node the player has ASKED to be
     on, and it moves on every press — the sprite then chases it. Presses are
     never dropped for being mid-walk. */
  function stepBy(delta) {
    if (entering || hitting) return;  // mid-dive or mid-jump
    var next = selected + delta;
    /* The start of the path is the front of the map, the castle the end. */
    if (next < 0 || next > stops.length - 1) return;
    slowDown();
    select(next, { walk: true, force: true });
  }

  function enter(i) {
    /* `entering` is the pipe-dive animation, which owns the screen until it
       navigates. A plain walk is NOT a reason to ignore a click — clicking
       mid-walk retargets the sprite. */
    if (entering || hitting) return;
    slowDown();
    var stop = stops[i];

    /* A ? block: walk under it, then jump and punch it. The start of the
       path is only a stop to stand on unless it has a block. */
    if (stop.kind === 'powerup' || stop.kind === 'start') {
      selected = i; paintSelection();
      walkTo(i, function () { if (stop.powerup) hitBlock(i); });
      return;
    }

    /* Castle at the end of the road -> contact page. */
    if (stop.kind === 'castle') {
      selected = i; paintSelection();
      walkTo(i, function () {
        entering = true;
        SITE.warpTo('pages/contact.html', { center: SITE.centreOf(castleEl) });
      });
      return;
    }

    var p = stop.project;
    selected = i; paintSelection();

    walkTo(i, function () {
      /* Locked worlds bump like an empty ? block and go nowhere. A sealed
         pipe bumps its lid. */
      if (p.locked) {
        var block = stop.el.querySelector('.qblock, .pipe__lid');
        if (block) {
          block.classList.remove('is-bumped');
          void block.offsetWidth;            // restart the animation
          block.classList.add('is-bumped');
        }
        SITE.sfx.bump();
        announce(isSealed(p) ? p.title + ' is still in progress. No page yet.'
                             : p.world + ' is locked. Nothing here yet.');
        return;
      }

      rememberPipe(p.id);
      divedInto = i;

      if (SITE.reducedMotion()) { entering = true; window.location.href = p.page; return; }

      entering = true;
      busy = true;
      hidePreview();
      player.classList.remove('is-idle');
      player.classList.add('is-entering');
      stop.el.classList.add('is-diving');

      /* The iris collapses onto the mouth of this pipe, and starts while the
         sprite is still sinking so the two read as one move rather than an
         animation followed by a transition. */
      var mouth = SITE.centreOf(stop.el.querySelector('.pipe__rim'));
      window.setTimeout(function () {
        SITE.warpTo(p.page, { center: mouth });
      }, DIVE_MS - IRIS_OVERLAP);
    });
  }

  /* ======================================================================
     FAST-FORWARD
     The button on the map that takes you straight to the newest published
     project, so nobody has to walk through the older ones to see it. The
     sprite runs there at whatever speed gets it there in about FF_SECONDS.
     ====================================================================== */
  function latestStop() {
    for (var i = projects.length - 1; i >= 0; i--) {
      if (!projects[i].locked) return worldStop[i];
    }
    return null;
  }

  function slowDown() {
    boost = 1;
    player.classList.remove('is-fast');
  }

  function pathBetween(a, b) {
    var d = 0, dir = b > a ? 1 : -1;
    for (var k = a; k !== b; k += dir) {
      d += Math.hypot(points[k + dir].x - points[k].x, points[k + dir].y - points[k].y);
    }
    return d;
  }

  function fastForward() {
    if (entering || hitting) return;
    if (window.CHEST && window.CHEST.isOpen()) return;
    var target = latestStop();
    if (target === null) return;

    selected = target;
    paintSelection();
    SITE.sfx.select();
    var from = walking ? aim : cursor;
    var dist = pathBetween(from, stops[target].point);
    boost = Math.max(1, dist / (WALK_SPEED * FF_SECONDS));
    if (boost > 1 && !SITE.reducedMotion()) player.classList.add('is-fast');
    walkTo(target);
  }

  /* Screen-reader status line for things that are only shown as animation. */
  function announce(msg) {
    var live = document.getElementById('map-status');
    if (live) live.textContent = msg;
  }

  /* ======================================================================
     INPUT
     ====================================================================== */
  function bindInput() {
    var ff = document.getElementById('ff-latest');
    if (ff) {
      if (latestStop() === null) ff.hidden = true;
      ff.addEventListener('click', function () {
        fastForward();
        /* Give the keyboard back to the map, or the next Enter (meant for a
           pipe) would press this button again. */
        ff.blur();
      });
    }

    canvas.addEventListener('click', function (ev) {
      var el = ev.target.closest('.node, .powerup');
      if (!el) return;
      enter(parseInt(el.dataset.stop, 10));
    });

    canvas.addEventListener('focusin', function (ev) {
      var el = ev.target.closest('.node, .powerup');
      if (!el) return;
      selected = parseInt(el.dataset.stop, 10);
      paintSelection();
      updatePreview();
    });

    if (castleEl) {
      castleEl.addEventListener('click', function (ev) {
        ev.preventDefault();
        enter(stops.length - 1);
      });
      castleEl.addEventListener('focus', function () {
        selected = stops.length - 1;
        paintSelection();
        updatePreview();
      });
    }

    document.addEventListener('keydown', function (ev) {
      if (ev.target.matches && ev.target.matches('input, textarea, select')) return;
      if (window.INTRO && window.INTRO.isOpen()) return;   // mode select is up
      if (window.CHEST && window.CHEST.isOpen()) return;

      switch (ev.key) {
        case 'ArrowRight':
          ev.preventDefault();
          stepBy(1);
          break;
        case 'ArrowLeft':
          ev.preventDefault();
          stepBy(-1);
          break;
        case 'ArrowUp':
          /* Up is a jump, and only does anything under a ? block. Pressed
             while still walking towards one, it jumps on arrival. */
          ev.preventDefault();
          if (stops[selected] && stops[selected].powerup) enter(selected);
          break;
        case 'Enter':
        case ' ':
          /* If a node button has focus the browser fires click for us. */
          if (ev.target.closest && ev.target.closest('.node, .castle, .powerup, .ff-button')) return;
          ev.preventDefault();
          enter(selected);
          break;
        default:
          break;
      }
    });

    /* Click-and-drag to pan the map. */
    var dragging = false, dragX = 0, dragScroll = 0, moved = 0;
    viewport.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest('.node, .castle, .powerup')) return;
      dragging = true; moved = 0;
      dragX = ev.clientX;
      dragScroll = viewport.scrollLeft;
      viewport.classList.add('is-dragging');
      viewport.setPointerCapture(ev.pointerId);
    });
    viewport.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      var dx = ev.clientX - dragX;
      moved = Math.max(moved, Math.abs(dx));
      viewport.scrollLeft = dragScroll - dx;
    });
    ['pointerup', 'pointercancel'].forEach(function (name) {
      viewport.addEventListener(name, function () {
        dragging = false;
        viewport.classList.remove('is-dragging');
      });
    });

    viewport.addEventListener('scroll', parallax, { passive: true });

    /* Vertical wheel scrolls the map sideways — it reads as one long level. */
    viewport.addEventListener('wheel', function (ev) {
      if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;
      viewport.scrollLeft += ev.deltaY;
      ev.preventDefault();
    }, { passive: false });

    var resizeTimer;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 150);
    });
  }

  /* ======================================================================
     MOBILE LEVEL SELECT — same data, plain vertical list, no map
     ====================================================================== */
  function buildList() {
    if (!listEl) return;
    var html = '';

    /* Newest first and published only, the same as LIST VIEW: on a phone
       this list IS the map, and the latest work should be on top. */
    for (var i = projects.length - 1; i >= 0; i--) {
      var p = projects[i];
      if (p.locked) continue;
      var icon = p.locked
        ? '<span class="qblock" aria-hidden="true">?</span>'
        : '<span class="pipe" aria-hidden="true">' +
            '<span class="pipe__rim"><span class="pipe__mouth"></span></span>' +
            '<span class="pipe__body"></span>' +
          '</span>';

      var body =
        '<span class="level-card__icon">' + icon + '</span>' +
        '<span>' +
          '<span class="level-card__world">' + esc(p.world) + (p.locked ? ' &middot; LOCKED' : '') + '</span>' +
          '<span class="level-card__title">' + esc(p.title) + '</span>' +
          '<span class="level-card__blurb">' + esc(p.blurb || '') + '</span>' +
        '</span>';

      html += p.locked
        ? '<div class="level-card level-card--locked" aria-disabled="true">' + body + '</div>'
        : '<a class="level-card" href="' + esc(p.page) + '" data-warp>' + body + '</a>';
    }

    /* The castle gets a card too, so contact is reachable from the list. */
    html +=
      '<a class="level-card" href="pages/contact.html" data-warp>' +
        '<span class="level-card__icon"><span class="qblock" aria-hidden="true">!</span></span>' +
        '<span>' +
          '<span class="level-card__world">CASTLE</span>' +
          '<span class="level-card__title">GET IN TOUCH</span>' +
          '<span class="level-card__blurb">Email, LinkedIn, phone and GitHub.</span>' +
        '</span>' +
      '</a>';

    listEl.innerHTML = html;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  function init() {
    player.innerHTML = buildPlayerSvg(window.PLAYER_SPRITE);
    player.classList.add('is-idle');

    buildList();
    layout();
    bindInput();

    /* Deep link: index.html#world-my-project focuses that world. */
    var hash = window.location.hash.replace('#', '');
    if (hash) {
      for (var i = 0; i < projects.length; i++) {
        if ('world-' + projects[i].id === hash) {
          standAt(worldStop[i]);
          break;
        }
      }
    }

    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) restoredFromCache();
    });

    /* Came back from a project page? Climb out of the pipe you went down,
       which is the entry animation played backwards. */
    var fromPipe = takePipe();
    if (fromPipe) {
      for (var j = 0; j < projects.length; j++) {
        if (projects[j].id === fromPipe) {
          standAt(worldStop[j]);
          if (!SITE.reducedMotion()) emerge(worldStop[j]);
          break;
        }
      }
    }
  }

  /* ----------------------------------------------------------------------
     BACK BUTTON
     Pressing Back after entering a pipe does not reload the map: the
     browser restores it from its back-forward cache exactly as it was
     frozen — sprite collapsed inside the pipe, sign faded, `entering` still
     set so Enter is ignored — and none of init() runs again. js/site.js
     reopens the iris; this puts the map itself back in working order and
     climbs out of the pipe, the same as returning by the corner pipe.
     ---------------------------------------------------------------------- */
  function restoredFromCache() {
    hidePreview();
    var i = divedInto;
    divedInto = null;
    entering  = false;
    hitting   = false;
    busy      = false;
    walkDone  = null;

    /* This page handles the climb-out itself. Clear the hand-off too, or a
       later fresh visit to the map would climb out of a pipe for no reason. */
    takePipe();

    boost = 1;
    player.classList.remove('is-entering', 'is-walking', 'is-exiting', 'is-hitting', 'is-fast');
    player.classList.add('is-idle');
    var faded = canvas.querySelectorAll('.node.is-diving');
    for (var k = 0; k < faded.length; k++) faded[k].classList.remove('is-diving');

    if (i !== null && stops[i]) {
      standAt(i);
      if (!SITE.reducedMotion()) emerge(i);
    } else if (stops[selected]) {
      standAt(selected);
    }
  }

  /* ======================================================================
     PROJECT PREVIEW
     A small card that pops up beside a world while the player is standing on
     it — never while walking past. Its layout mirrors the project page:
     the world banner, a picture or video, a short abstract, the tech stack.
     Everything in it comes from the world's entry in js/projects.js.
     ====================================================================== */
  var previewEl  = null;
  var previewFor = -1;       // stop index the card currently describes

  function previewLayer() {
    if (!previewEl) {
      previewEl = document.createElement('div');
      previewEl.className = 'preview';
      /* The node's own aria-label already carries the title and blurb, so a
         screen reader is not read the same thing twice. */
      previewEl.setAttribute('aria-hidden', 'true');
      canvas.appendChild(previewEl);
    }
    return previewEl;
  }

  var VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

  function previewMedia(p) {
    if (p.media && VIDEO_RE.test(p.media)) {
      return '<video src="' + esc(p.media) + '" muted loop playsinline autoplay preload="metadata"></video>';
    }
    if (p.media) return '<img src="' + esc(p.media) + '" alt="">';
    /* No media yet: an empty screen showing where it will go. */
    return '<span class="preview__placeholder">' +
             (p.locked ? '?' : 'SCREENSHOT<br>OR VIDEO') +
           '</span>';
  }

  function renderPreview(p) {
    var el   = previewLayer();
    el.classList.toggle('preview--locked', !!p.locked && !isSealed(p));
    el.innerHTML =
      '<div class="preview__card">' +
        '<div class="preview__banner">' +
          '<span class="preview__world">WORLD ' + esc(p.world) + '</span>' +
          '<span class="preview__title">' + esc(p.title) + '</span>' +
        '</div>' +
        '<div class="preview__media">' + previewMedia(p) + '</div>' +
        '<p class="preview__abstract">' + esc(p.abstract || p.blurb || '') + '</p>' +
        '<p class="preview__cta">' +
          (isSealed(p) ? 'IN PROGRESS &middot; NO PAGE YET'
                       : (p.locked ? 'NOT PUBLISHED YET' : 'ENTER &gt;&gt; PLAY LEVEL')) +
        '</p>' +
      '</div>' +
      '<span class="preview__tail"></span>';

    /* Some browsers ignore the autoplay attribute on injected video. */
    var v = el.querySelector('video');
    if (v) { v.muted = true; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
  }

  /* Where the card goes, best first:
       1. above the sign — the sky is empty, so it covers nothing;
       2. above the pipe, over the node's OWN sign — that sign only repeats
          the world and title already in the card's banner, so nothing is
          lost (short windows, e.g. an iPad in landscape, land here);
       3. either of those again with a compact card (two-line
          abstract) when the full one is a few pixels too tall;
       4. beside the node — last resort. Pipes are 300px apart, so this
          always lands on the neighbouring sign. */
  var GAP = 18, EDGE = 10, HINT = 64;      // HINT: room for the controls bar

  function aboveTop(stop) {
    var pt = points[stop.point], h = previewEl.offsetHeight;
    var block   = stop.el.querySelector('.pipe, .qblock');   // pipe, or ? block
    var signTop = pt.y - stop.el.offsetHeight;
    var baseTop = pt.y - (block ? block.offsetHeight : stop.el.offsetHeight);
    if (signTop - GAP - h >= EDGE) return signTop - GAP - h;
    if (baseTop - GAP - h >= EDGE) return baseTop - GAP - h;
    return null;
  }

  function placePreview(stop) {
    var el = previewEl;
    var pt = points[stop.point];
    var viewL = viewport.scrollLeft, viewR = viewL + viewport.clientWidth;
    var mode, left, top;

    el.classList.remove('preview--compact');
    top = aboveTop(stop);
    if (top === null) {
      el.classList.add('preview--compact');
      top = aboveTop(stop);
      if (top === null) el.classList.remove('preview--compact');
    }

    if (top !== null) {
      mode = 'above';
      var w = el.offsetWidth;
      left = Math.max(viewL + EDGE, Math.min(pt.x - w / 2, viewR - EDGE - w));
      el.style.setProperty('--tail-x', Math.max(22, Math.min(pt.x - left, w - 22)) + 'px');
    } else {
      var cw = el.offsetWidth, ch = el.offsetHeight;
      var nodeW = stop.el.offsetWidth, nodeH = stop.el.offsetHeight;
      var rightX = pt.x + nodeW / 2 + GAP;
      var leftX  = pt.x - nodeW / 2 - GAP - cw;
      mode = (rightX + cw <= viewR - EDGE || leftX < viewL + EDGE) ? 'right' : 'left';
      left = mode === 'right' ? rightX : leftX;
      var midY = pt.y - nodeH / 2;
      top  = Math.max(EDGE, Math.min(midY - ch / 2, height - ch - HINT));
      el.style.setProperty('--tail-y', Math.max(22, Math.min(midY - top, ch - 22)) + 'px');
    }

    el.style.left = left + 'px';
    el.style.top  = top + 'px';
    el.classList.toggle('preview--above', mode === 'above');
    el.classList.toggle('preview--right', mode === 'right');
    el.classList.toggle('preview--left',  mode === 'left');
  }

  function hidePreview() {
    if (!previewEl) return;
    previewEl.classList.remove('is-on');
    var v = previewEl.querySelector('video');
    if (v) v.pause();
    previewFor = -1;
  }

  /* Show the card only while the sprite is standing still on the selected
     world. Called whenever that might have just become true or false. */
  function updatePreview() {
    var stop = stops[selected];
    var standing = !walking && !entering && !busy &&
                   stop && stop.kind === 'world' && cursor === stop.point;
    if (!standing) { hidePreview(); return; }

    var el = previewLayer();
    if (previewFor !== selected) {
      renderPreview(stop.project);
      previewFor = selected;
      el.classList.remove('is-on');
      void el.offsetWidth;                 // restart the pop-in
    }
    placePreview(stop);
    el.classList.add('is-on');
  }

  /* ======================================================================
     ? BLOCKS
     Jump, punch the block from underneath, and it gives up a chest of the
     skills listed for it in js/projects.js. The chest itself is js/chest.js.
     ====================================================================== */
  function hitBlock(i) {
    var stop = stops[i];
    if (!stop || !stop.powerup || hitting || entering || walking) return;
    if (window.CHEST && window.CHEST.isOpen()) return;
    if (cursor !== stop.point) return;      // only from directly underneath

    hitting = true;
    busy = true;
    hidePreview();
    var block = stop.el && stop.el.querySelector('.qblock');

    function openChest() {
      hitting = false;
      busy = false;
      opened[stop.powerup.after] = true;
      if (stop.el) stop.el.classList.add('is-used');
      if (SITE.sfx.chest) SITE.sfx.chest();
      announce((stop.powerup.title || 'Power-up') + ' opened.');
      window.CHEST.open({
        title: stop.powerup.title,
        loot: stop.loot || [],
        onClose: function () { updatePreview(); }
      });
    }

    if (SITE.reducedMotion()) { openChest(); return; }

    player.classList.remove('is-idle');
    player.classList.add('is-hitting');

    /* The fist meets the block at the top of the jump. */
    window.setTimeout(function () {
      if (block) {
        block.classList.remove('is-bumped');
        void block.offsetWidth;
        block.classList.add('is-bumped');
      }
      if (stop.el) stop.el.classList.add('is-used');
      SITE.sfx.bump();
    }, HIT_PEAK);

    /* Landing. The chest opens as the feet touch down. */
    window.setTimeout(function () {
      player.classList.remove('is-hitting');
      player.classList.add('is-idle');
      openChest();
    }, HIT_MS);
  }

  /* Put the sprite on a stop with no walking. */
  function standAt(i) {
    selected = i;
    cursor   = stops[i].point;
    aim      = cursor;
    pos      = { x: points[cursor].x, y: points[cursor].y };
    placeSprite(points[cursor]);
    paintSelection();
    centreOn(points[cursor].x, true);
    noteWorld(points[cursor].x, true);
    updatePreview();
  }

  /* Rise up out of the pipe. The sprite begins collapsed inside the mouth,
     hidden by that pipe's cap, and grows back to full height — the same
     occlusion as going in, in reverse: head first, feet last. */
  function emerge(i) {
    busy = true;
    hidePreview();
    player.classList.remove('is-idle');
    player.classList.add('is-exiting');
    stops[i].el.classList.add('is-rising');
    window.setTimeout(function () {
      player.classList.remove('is-exiting');
      player.classList.add('is-idle');
      stops[i].el.classList.remove('is-rising');
      busy = false;
      updatePreview();
    }, EMERGE_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
