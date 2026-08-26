/* ==========================================================================
   SITE — shared behaviour for every page
   --------------------------------------------------------------------------
   Handles: the pipe-warp screen transition, the optional Web Audio sound
   effects (off by default, no audio files anywhere), and the
   prefers-reduced-motion escape hatch.

   Exposed as window.SITE so js/map.js can reuse it.
   ========================================================================== */
(function () {
  'use strict';

  var STORE_SOUND = 'pixel-portfolio:sound';

  /* --- tiny localStorage wrapper; private-mode safe ---------------------- */
  function read(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  /* --- reduced motion ---------------------------------------------------- */
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reducedMotion() { return motionQuery.matches; }

  /* ======================================================================
     SOUND — all generated with the Web Audio API. No files, no downloads.
     Off by default; the user opts in with the HUD speaker button and the
     choice is remembered.
     ====================================================================== */
  var sfx = {
    enabled: read(STORE_SOUND, 'off') === 'on',
    ctx: null,

    /* The AudioContext can only start from a user gesture, so it is created
       lazily the first time a sound is actually requested. */
    context: function () {
      if (!this.ctx) {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },

    /* One square/triangle blip. Everything else is built out of these. */
    tone: function (freq, start, length, type, gain) {
      var ctx = this.context();
      if (!ctx) return;
      var t = ctx.currentTime + start;
      var osc = ctx.createOscillator();
      var amp = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain || 0.09, t + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
      osc.connect(amp).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + length + 0.02);
    },

    /* A downward frequency sweep — used for the pipe warp. */
    sweep: function (from, to, length, type) {
      var ctx = this.context();
      if (!ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      var amp = ctx.createGain();
      osc.type = type || 'sawtooth';
      osc.frequency.setValueAtTime(from, t);
      osc.frequency.exponentialRampToValueAtTime(to, t + length);
      amp.gain.setValueAtTime(0.07, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
      osc.connect(amp).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + length + 0.02);
    },

    coin: function () { if (!this.enabled) return; this.tone(988, 0, 0.07); this.tone(1319, 0.06, 0.22); },
    step: function () { if (!this.enabled) return; this.tone(196, 0, 0.04, 'square', 0.035); },
    bump: function () { if (!this.enabled) return; this.tone(147, 0, 0.09, 'square', 0.07); },
    select: function () { if (!this.enabled) return; this.tone(660, 0, 0.06, 'square', 0.05); },
    warp: function () { if (!this.enabled) return; this.sweep(880, 110, 0.5); },

    toggle: function () {
      this.enabled = !this.enabled;
      write(STORE_SOUND, this.enabled ? 'on' : 'off');
      if (this.enabled) this.select();
      return this.enabled;
    }
  };

  /* ======================================================================
     IRIS — the circular wipe between pages

     Leaving:  the hole shrinks onto the pipe until the screen is black.
     Arriving: it grows back out from the same spot.

     The centre travels between pages in sessionStorage as a fraction of the
     viewport, so the circle reopens where it closed even though the second
     page is a completely fresh document at a possibly different size.
     ====================================================================== */
  var IRIS_CLOSE = 180;          // ms, leaving
  var IRIS_OPEN  = 260;          // ms, arriving — a touch slower, it is a reveal
  var STORE_IRIS = 'pixel-portfolio:iris';

  var irisEl = null;
  function irisLayer() {
    if (!irisEl) {
      irisEl = document.createElement('div');
      irisEl.className = 'iris';
      document.body.appendChild(irisEl);
    }
    return irisEl;
  }

  /* Radius that still covers the furthest corner from (cx, cy). Without this
     an off-centre iris would start with black already showing in a corner. */
  function coverRadius(cx, cy) {
    var w = window.innerWidth, h = window.innerHeight;
    return Math.ceil(Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy))) + 2;
  }

  function placeIris(el, cx, cy, diameter) {
    el.style.left   = cx + 'px';
    el.style.top    = cy + 'px';
    el.style.width  = diameter + 'px';
    el.style.height = diameter + 'px';
  }

  /* Remember where the iris closed so the next page can open it there. */
  function rememberIris(cx, cy) {
    try {
      sessionStorage.setItem(STORE_IRIS, JSON.stringify({
        fx: cx / window.innerWidth,
        fy: cy / window.innerHeight
      }));
    } catch (e) { /* private mode: the iris just falls back to centre */ }
  }

  function takeIris() {
    try {
      var raw = sessionStorage.getItem(STORE_IRIS);
      sessionStorage.removeItem(STORE_IRIS);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /**
   * Navigate to href behind a closing iris.
   *
   * opts.center {x, y}  viewport coords to collapse onto; defaults to the
   *                     middle of the screen.
   * opts.delay          ms to wait before the iris starts closing, so a
   *                     sprite animation can play first.
   *
   * With prefers-reduced-motion nothing animates and we navigate at once.
   */
  function warpTo(href, opts) {
    if (!href) return;
    opts = opts || {};
    if (reducedMotion()) { window.location.href = href; return; }

    var cx = opts.center ? opts.center.x : window.innerWidth / 2;
    var cy = opts.center ? opts.center.y : window.innerHeight / 2;

    sfx.warp();
    rememberIris(cx, cy);

    var el = irisLayer();
    var r  = coverRadius(cx, cy);

    window.setTimeout(function () {
      el.style.transition = 'none';
      placeIris(el, cx, cy, r * 2);
      el.classList.add('is-on', 'is-blocking');
      /* Flush the open state before starting the close, or the browser
         collapses both writes into one frame and nothing animates. */
      void el.offsetWidth;
      el.style.transition = 'width ' + IRIS_CLOSE + 'ms ease-in, ' +
                            'height ' + IRIS_CLOSE + 'ms ease-in';
      placeIris(el, cx, cy, 0);
      window.setTimeout(function () { window.location.href = href; }, IRIS_CLOSE);
    }, opts.delay || 0);
  }

  /* Open the iris on arrival, from wherever the last page closed it. */
  var arrivedFrom = null;
  function arrive() {
    arrivedFrom = takeIris();
    if (reducedMotion()) return;

    var fx = arrivedFrom ? arrivedFrom.fx : 0.5;
    var fy = arrivedFrom ? arrivedFrom.fy : 0.5;
    var cx = fx * window.innerWidth;
    var cy = fy * window.innerHeight;

    var el = irisLayer();
    var r  = coverRadius(cx, cy);

    el.style.transition = 'none';
    placeIris(el, cx, cy, 0);
    el.classList.add('is-on');
    void el.offsetWidth;
    el.style.transition = 'width ' + IRIS_OPEN + 'ms ease-out, ' +
                          'height ' + IRIS_OPEN + 'ms ease-out';
    placeIris(el, cx, cy, r * 2);
    window.setTimeout(function () {
      el.classList.remove('is-on', 'is-blocking');
    }, IRIS_OPEN);
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  function boot() {
    arrive();

    /* Sound toggle button in the HUD. */
    var toggle = document.querySelector('[data-sound-toggle]');
    if (toggle) {
      var paint = function () {
        toggle.setAttribute('aria-pressed', sfx.enabled ? 'true' : 'false');
        toggle.textContent = sfx.enabled ? 'SFX ON' : 'SFX OFF';
      };
      paint();
      toggle.addEventListener('click', function () { sfx.toggle(); paint(); });
    }

    /* Any link marked data-warp gets the transition instead of a hard nav. */
    document.addEventListener('click', function (ev) {
      var link = ev.target.closest ? ev.target.closest('[data-warp]') : null;
      if (!link) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
      var href = link.getAttribute('href') || link.getAttribute('data-href');
      if (!href) return;
      ev.preventDefault();

      /* The corner pipe sinks out of view before the screen wipes, and the
         iris closes onto the pipe itself. */
      if (link.classList.contains('pipe-back') && !reducedMotion()) {
        link.classList.add('is-warping');
        warpTo(href, { delay: 240, center: centreOf(link) });
        return;
      }
      /* Any other warp link closes onto whatever was clicked, so the wipe
         always starts from something the eye is already looking at. */
      warpTo(href, { center: centreOf(link) });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Middle of an element in viewport coordinates. */
  function centreOf(el) {
    if (!el || !el.getBoundingClientRect) return null;
    var b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }

  window.SITE = {
    sfx: sfx,
    warpTo: warpTo,
    reducedMotion: reducedMotion,
    centreOf: centreOf
  };
}());
