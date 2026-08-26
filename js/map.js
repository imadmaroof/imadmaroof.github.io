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
     3. walks the player sprite along the path on click / arrow keys
     4. plays the enter-pipe animation, then warps to the project page
     5. re-lays everything out on resize
     6. renders the mobile level-select list from the same array
   ========================================================================== */
(function () {
  'use strict';

  var projects = window.PROJECTS || [];
  var SITE = window.SITE;

  /* --- layout constants -------------------------------------------------- */
  var NODE_GAP   = 300;   // horizontal px between world nodes
  var START_PAD  = 210;   // px from the left edge to world 1
  var CASTLE_GAP = 280;   // px from the last world to the castle
  var END_PAD    = 190;   // px of map after the castle
  var WALK_SPEED = 320;   // px per second
  var MIN_HEIGHT = 560;   // map never gets shorter than this

  /* Vertical position of each node, as a fraction of map height. The list
     cycles, which is what gives the path its zig-zag. Add more values for a
     bumpier map. */
  var NODE_Y = [0.62, 0.82, 0.66, 0.88, 0.70, 0.80];
  var LAND_TOP  = 0.40;   // where the ground starts
  var TRAIL_Y   = 0.74;   // y of the start point and the castle

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
  var stops    = [];   // the places you can stand: worlds, then the castle
  var coinEls  = [];   // {x, y, el, taken}
  var cursor   = 0;    // index into points: where the sprite currently stands
  var selected = 0;    // index into stops
  var started  = false;// has the player left the start of the path yet?
  var busy     = false;
  var width    = 0;
  var height   = 0;

  /* ======================================================================
     SPRITES
     Original pixel art, drawn as inline SVG so it scales crisply and picks
     up the palette from CSS. Nothing here is traced from anyone's game.
     ====================================================================== */

  /* "BYTE" — the player. A small teal robot blob with an antenna. */
  var PLAYER_SVG =
    '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' +
      '<rect x="6" y="0" width="4" height="1" class="px-gold"/>' +
      '<rect x="7" y="1" width="2" height="2" class="px-ink"/>' +
      '<rect x="2" y="3" width="12" height="11" class="px-ink"/>' +
      '<rect x="3" y="4" width="10" height="9" class="px-body"/>' +
      '<rect x="3" y="4" width="8" height="2" class="px-body-hi"/>' +
      '<rect x="3" y="6" width="2" height="5" class="px-body-hi"/>' +
      '<rect x="11" y="6" width="2" height="7" class="px-body-lo"/>' +
      '<rect x="4" y="12" width="8" height="1" class="px-body-lo"/>' +
      '<rect x="5" y="7" width="2" height="3" class="px-white"/>' +
      '<rect x="9" y="7" width="2" height="3" class="px-white"/>' +
      '<rect x="5" y="8" width="1" height="2" class="px-ink"/>' +
      '<rect x="9" y="8" width="1" height="2" class="px-ink"/>' +
      '<rect x="6" y="11" width="4" height="1" class="px-ink"/>' +
      '<rect x="3" y="14" width="4" height="2" class="px-ink"/>' +
      '<rect x="9" y="14" width="4" height="2" class="px-ink"/>' +
    '</svg>';

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

  function nodeX(i)  { return START_PAD + i * NODE_GAP; }
  function nodeY(i)  { return Math.round(height * NODE_Y[i % NODE_Y.length]); }
  function castleX() { return nodeX(Math.max(projects.length - 1, 0)) + CASTLE_GAP; }

  /* Build the right-angled path and remember which point each stop sits on. */
  function buildPath() {
    points = [];
    stops  = [];

    var startY = Math.round(height * TRAIL_Y);
    points.push({ x: 70, y: startY });

    var prev = points[0];

    for (var i = 0; i < projects.length; i++) {
      var x = nodeX(i), y = nodeY(i);
      if (x !== prev.x && y !== prev.y) points.push({ x: x, y: prev.y }); // the corner
      points.push({ x: x, y: y });
      stops.push({ kind: 'world', project: projects[i], index: i, point: points.length - 1, el: null });
      prev = points[points.length - 1];
    }

    var cx = castleX(), cy = Math.round(height * TRAIL_Y);
    if (cx !== prev.x && cy !== prev.y) points.push({ x: cx, y: prev.y });
    points.push({ x: cx, y: cy });
    stops.push({ kind: 'castle', point: points.length - 1, el: castleEl });
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
    var old = canvas.querySelectorAll('.node');
    for (var k = 0; k < old.length; k++) old[k].remove();

    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'node' + (p.locked ? ' node--locked' : '');
      el.id = 'world-' + p.id;
      el.dataset.stop = String(i);
      el.title = p.blurb || '';
      el.setAttribute('aria-label',
        'World ' + p.world + ', ' + p.title + (p.locked ? ' (locked)' : '') + '. ' + (p.blurb || ''));
      if (p.locked) el.setAttribute('aria-disabled', 'true');

      el.innerHTML =
        '<span class="node__cursor" aria-hidden="true"></span>' +
        '<span class="node__sign">' +
          '<span class="node__world">' + esc(p.world) + '</span>' +
          '<span class="node__title">' + esc(p.title) + '</span>' +
        '</span>' +
        '<span class="node__post" aria-hidden="true"></span>' +
        (p.locked
          ? '<span class="qblock" aria-hidden="true">?</span>'
          : '<span class="pipe" aria-hidden="true">' +
              '<span class="pipe__rim"><span class="pipe__mouth"></span></span>' +
              '<span class="pipe__body"></span>' +
            '</span>');

      var pt = points[stops[i].point];
      el.style.left = pt.x + 'px';
      el.style.top  = pt.y + 'px';

      canvas.appendChild(el);
      stops[i].el = el;
    }
  }

  /* --- coins ------------------------------------------------------------- */
  function buildCoins() {
    for (var k = 0; k < coinEls.length; k++) coinEls[k].el.remove();
    coinEls = [];

    /* One coin halfway along each horizontal run of the path. */
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      if (a.y !== b.y) continue;                       // vertical run, skip
      if (Math.abs(b.x - a.x) < 120) continue;         // too short to bother
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
    drawPath();
    buildNodes();
    buildCoins();

    /* Put the sprite back where it was standing — or at the very start of
       the path if it has not moved yet. */
    cursor = (started && stops[selected]) ? stops[selected].point : 0;
    placeSprite(points[cursor]);
    paintSelection();
    centreOn(points[cursor].x, true);
    parallax();
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
  }

  /* ======================================================================
     WALKING
     Steps the sprite from point to point along the path until it reaches
     the target stop. Under prefers-reduced-motion it just teleports.
     ====================================================================== */
  function walkTo(stopIndex, done) {
    started = true;
    walkToPoint(stops[stopIndex].point, done);
  }

  /* Walk back to the head of the trail — the spot the sprite idles on before
     you have picked any world. Nothing is selected while standing there. */
  function goHome(done) {
    walkToPoint(0, function () {
      started = false;
      paintSelection();
      if (done) done();
    });
  }

  function walkToPoint(target, done) {
    if (SITE.reducedMotion() || target === cursor) {
      cursor = target;
      placeSprite(points[cursor]);
      centreOn(points[cursor].x, true);
      if (done) done();
      return;
    }

    busy = true;
    player.classList.remove('is-idle');
    player.classList.add('is-walking');

    var pos      = { x: points[cursor].x, y: points[cursor].y };
    var step     = target > cursor ? 1 : -1;
    var next     = cursor + step;
    var last     = performance.now();
    var stepTick = 0;

    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      var goal = points[next];
      var dx = goal.x - pos.x, dy = goal.y - pos.y;
      var dist = Math.hypot(dx, dy);
      var move = WALK_SPEED * dt;

      if (dx > 1) player.classList.remove('is-flipped');
      else if (dx < -1) player.classList.add('is-flipped');

      if (dist <= move) {
        pos.x = goal.x; pos.y = goal.y;
        cursor = next;
        if (cursor === target) { finish(); return; }
        next = cursor + step;
      } else {
        pos.x += dx / dist * move;
        pos.y += dy / dist * move;
      }

      placeSprite(pos);
      centreOn(pos.x, true);
      collectCoins(pos);

      stepTick += dt;
      if (stepTick > 0.22) { stepTick = 0; SITE.sfx.step(); }

      requestAnimationFrame(frame);
    }

    function finish() {
      placeSprite(points[cursor]);
      centreOn(points[cursor].x, true);
      player.classList.remove('is-walking');
      player.classList.add('is-idle');
      busy = false;
      if (done) done();
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
      /* Before the first move the sprite is standing at the head of the
         trail, not on a world, so no node should look selected. */
      stops[i].el.classList.toggle('is-selected', started && i === selected);
    }
  }

  function select(i, opts) {
    i = Math.max(0, Math.min(i, stops.length - 1));
    if (i === selected && started && !(opts && opts.force)) return;
    selected = i;
    /* Committing to a stop counts as leaving the head of the trail. This has
       to happen before painting, or the first step highlights nothing. */
    if (opts && opts.walk) started = true;
    paintSelection();
    SITE.sfx.select();
    if (opts && opts.walk) walkTo(i);
    else centreOn(points[stops[i].point].x, false);
  }

  function enter(i) {
    if (busy) return;
    var stop = stops[i];

    /* Castle at the end of the road -> contact page. */
    if (stop.kind === 'castle') {
      selected = i; paintSelection();
      walkTo(i, function () { SITE.warpTo('pages/contact.html'); });
      return;
    }

    var p = stop.project;
    selected = i; paintSelection();

    walkTo(i, function () {
      /* Locked worlds bump like an empty ? block and go nowhere. */
      if (p.locked) {
        var block = stop.el.querySelector('.qblock');
        if (block) {
          block.classList.remove('is-bumped');
          void block.offsetWidth;            // restart the animation
          block.classList.add('is-bumped');
        }
        SITE.sfx.bump();
        announce(p.world + ' is locked. Nothing here yet.');
        return;
      }

      if (SITE.reducedMotion()) { window.location.href = p.page; return; }

      busy = true;
      player.classList.remove('is-idle');
      player.classList.add('is-entering');
      window.setTimeout(function () { SITE.warpTo(p.page); }, 360);
    });
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
    canvas.addEventListener('click', function (ev) {
      var el = ev.target.closest('.node');
      if (!el) return;
      enter(parseInt(el.dataset.stop, 10));
    });

    canvas.addEventListener('focusin', function (ev) {
      var el = ev.target.closest('.node');
      if (!el) return;
      selected = parseInt(el.dataset.stop, 10);
      paintSelection();
    });

    if (castleEl) {
      castleEl.addEventListener('click', function (ev) {
        ev.preventDefault();
        enter(stops.length - 1);
      });
      castleEl.addEventListener('focus', function () {
        selected = stops.length - 1;
        paintSelection();
      });
    }

    document.addEventListener('keydown', function (ev) {
      if (ev.target.matches('input, textarea, select')) return;

      switch (ev.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          ev.preventDefault();
          if (busy) return;
          /* From the head of the trail the first step is world one, not the
             one after it. */
          if (!started) select(0, { walk: true, force: true });
          else select(selected + 1, { walk: true, force: true });
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          ev.preventDefault();
          if (busy) return;
          if (!started) return;                 // already at the start
          /* Stepping left off world one walks back to the head of the trail
             rather than sticking to world one. */
          if (selected === 0) { SITE.sfx.select(); goHome(); }
          else select(selected - 1, { walk: true, force: true });
          break;
        case 'Enter':
        case ' ':
          /* If a node button has focus the browser fires click for us. */
          if (ev.target.closest && ev.target.closest('.node, .castle')) return;
          ev.preventDefault();
          enter(started ? selected : 0);
          break;
        default:
          break;
      }
    });

    /* Click-and-drag to pan the map. */
    var dragging = false, dragX = 0, dragScroll = 0, moved = 0;
    viewport.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest('.node, .castle')) return;
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

    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
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
          '<span class="level-card__blurb">Placeholder blurb for the contact page.</span>' +
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
    player.innerHTML = PLAYER_SVG;
    player.classList.add('is-idle');

    buildList();
    layout();
    bindInput();

    /* Deep link: index.html#world-my-project focuses that world. */
    var hash = window.location.hash.replace('#', '');
    if (hash) {
      for (var i = 0; i < projects.length; i++) {
        if ('world-' + projects[i].id === hash) {
          selected = i;
          started = true;
          cursor = stops[i].point;
          placeSprite(points[cursor]);
          paintSelection();
          centreOn(points[cursor].x, true);
          break;
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
