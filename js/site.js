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
     WARP — the fade-to-black screen transition between pages
     ====================================================================== */
  var warpEl = null;
  function warpLayer() {
    if (!warpEl) {
      warpEl = document.createElement('div');
      warpEl.className = 'warp';
      document.body.appendChild(warpEl);
    }
    return warpEl;
  }

  /**
   * Navigate to href behind a pipe-warp wipe.
   * With prefers-reduced-motion the wipe is skipped entirely and we go
   * straight there — no animation, no delay.
   */
  function warpTo(href, delay) {
    if (!href) return;
    if (reducedMotion()) { window.location.href = href; return; }
    sfx.warp();
    var layer = warpLayer();
    window.setTimeout(function () {
      layer.classList.add('is-on');
      window.setTimeout(function () { window.location.href = href; }, 300);
    }, delay || 0);
  }

  /* Fade the page up from black on arrival (skipped for reduced motion). */
  function arrive() {
    if (reducedMotion()) return;
    var layer = warpLayer();
    layer.classList.add('is-on', 'is-arriving');
    window.setTimeout(function () {
      layer.classList.remove('is-on', 'is-arriving');
    }, 420);
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

      /* The corner pipe sinks out of view before the screen wipes. */
      if (link.classList.contains('pipe-back') && !reducedMotion()) {
        link.classList.add('is-warping');
        warpTo(href, 240);
        return;
      }
      warpTo(href);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.SITE = {
    sfx: sfx,
    warpTo: warpTo,
    reducedMotion: reducedMotion
  };
}());
