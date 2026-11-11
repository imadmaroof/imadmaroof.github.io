/* ==========================================================================
   INTRO — the mode select shown on arrival
   --------------------------------------------------------------------------
   Two ways in: ADVENTURE (the map) or LIST VIEW (every project on one plain
   page). Whether it shows at all is decided by the small script in
   index.html's <head>, before the first paint, so the map never flashes up
   first. This file does the rest.

   Choosing ADVENTURE: the LIST VIEW card flies up into the LIST VIEW link in
   the top bar, which then pulses with a note saying that is the way to
   switch. Choosing LIST VIEW is an ordinary link to the list page.

   Exposed as window.INTRO so js/map.js can ignore keys while it is open.
   ========================================================================== */
(function () {
  'use strict';

  var STORE_MODE = 'pixel-portfolio:mode';
  var FADE_MS = 220;            // the backdrop clearing
  var FLY_MS  = 520;            // the LIST VIEW card flying into the top bar
  var NOTE_MS = 6000;           // how long the "switch any time" note stays

  var html = document.documentElement;
  var root = document.getElementById('intro');
  var open = !!root && html.classList.contains('intro-open');

  window.INTRO = { isOpen: function () { return open; } };
  if (!root) return;
  if (!open) { root.remove(); return; }

  var play = root.querySelector('[data-intro="play"]');
  var list = root.querySelector('[data-intro="list"]');
  var choices = [play, list];
  var current = 0;

  function reduced() { return !!(window.SITE && window.SITE.reducedMotion()); }
  function remember(mode) {
    try { sessionStorage.setItem(STORE_MODE, mode); } catch (e) { /* private mode */ }
  }
  function listLink() { return document.querySelector('.hud a[href$="all-projects.html"]'); }

  /* --- the pictures on the two cards ------------------------------------- */
  (function drawArt() {
    var sprite = window.PLAYER_SPRITE, px = window.PIXEL;
    if (!px) return;
    var me = root.querySelector('[data-intro-art="player"]');
    if (me && sprite) {
      var f = sprite.frames;
      me.innerHTML = px.svg({ idle: f.idle, walk1: f.walk1, walk2: f.walk2 },
                            sprite.palette, sprite.width, sprite.height);
    }
    var page = root.querySelector('[data-intro-art="list"]');
    if (page) page.innerHTML = px.icon({ icon: 'list' });
  }());

  /* --- which card is picked (the gold cursor), as on the map --------------- */
  function setCurrent(i, focus) {
    current = i;
    for (var k = 0; k < choices.length; k++) {
      choices[k].classList.toggle('is-current', k === i);
    }
    if (focus) choices[i].focus({ preventScroll: true });
  }
  choices.forEach(function (el, k) {
    el.addEventListener('mouseenter', function () { setCurrent(k); });
    el.addEventListener('focus', function () { setCurrent(k); });
  });
  setCurrent(0, true);

  play.addEventListener('click', chooseMap);
  list.addEventListener('click', function () { if (open) remember('list'); });

  /* Capture phase on window, so the map underneath never sees these keys. */
  window.addEventListener('keydown', function (ev) {
    if (!open) return;
    ev.stopImmediatePropagation();
    switch (ev.key) {
      case 'ArrowLeft': case 'ArrowUp':
        ev.preventDefault(); setCurrent(0, true); break;
      case 'ArrowRight': case 'ArrowDown':
        ev.preventDefault(); setCurrent(1, true); break;
      case 'Tab':
        ev.preventDefault(); setCurrent(current ? 0 : 1, true); break;
      case 'Enter': case ' ':
        ev.preventDefault();
        if (!ev.repeat) choices[current].click();
        break;
      case 'Escape':
        ev.preventDefault(); chooseMap(); break;
      default:
        break;
    }
  }, true);

  /* --- ADVENTURE ----------------------------------------------------------- */
  function chooseMap() {
    if (!open) return;
    open = false;                       // the map takes keys from here on
    remember('map');
    if (window.SITE && window.SITE.sfx && window.SITE.sfx.select) window.SITE.sfx.select();

    var target = listLink();
    if (reduced() || !target || !list.animate) {
      teardown();
      beacon(target);
      return;
    }

    /* A stand-in for the LIST VIEW card shrinks into the LIST VIEW link,
       turning from the card's colours into the link's on the way. Its
       picture and description fade as it lifts off; its title stays put and
       shrinks to the link's size. The real link is hidden until it lands,
       so the card reads as becoming the link rather than flying onto it. */
    var from = list.getBoundingClientRect();
    var to   = target.getBoundingClientRect();
    var name = list.querySelector('.intro__name');
    var nameBox   = name.getBoundingClientRect();
    var cardStyle = getComputedStyle(list);
    var linkStyle = getComputedStyle(target);
    var nameSize  = getComputedStyle(name).fontSize;

    var ghost = document.createElement('div');
    ghost.className = 'intro-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.innerHTML =
      '<div class="intro-ghost__card" style="width:' + list.clientWidth + 'px">' + list.innerHTML + '</div>' +
      '<span class="intro-ghost__label">LIST VIEW</span>';
    document.body.appendChild(ghost);
    list.style.visibility = 'hidden';
    target.style.visibility = 'hidden';
    root.classList.add('is-leaving');

    var ease = 'cubic-bezier(.65, 0, .35, 1)';
    var timing = { duration: FLY_MS, easing: ease, fill: 'forwards' };
    var flight = ghost.animate([
      { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px',
        borderWidth: cardStyle.borderTopWidth, backgroundColor: cardStyle.backgroundColor, color: cardStyle.color },
      { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px',
        borderWidth: linkStyle.borderTopWidth, backgroundColor: linkStyle.backgroundColor, color: linkStyle.color }
    ], timing);
    var dy = (nameBox.top + nameBox.height / 2) - (from.top + from.height / 2);
    ghost.lastChild.animate([
      { fontSize: nameSize, transform: 'translateY(' + dy + 'px)' },
      { fontSize: linkStyle.fontSize, transform: 'translateY(0)' }
    ], timing);
    ghost.firstChild.animate([{ opacity: 1 }, { opacity: 0 }],
                             { duration: 140, easing: 'linear', fill: 'forwards' });

    window.setTimeout(teardown, FADE_MS);
    flight.onfinish = function () {
      target.style.visibility = '';
      ghost.remove();
      beacon(target);
    };
  }

  function teardown() {
    if (!root) return;
    root.remove();
    root = null;
    html.classList.remove('intro-open');
  }

  /* --- the "switch any time" note under LIST VIEW --------------------------- */
  function beacon(target) {
    if (!target) return;
    target.classList.add('is-beacon');

    var note = document.createElement('div');
    note.className = 'list-note';
    note.setAttribute('role', 'status');
    note.innerHTML = 'WANT THE PLAIN LIST?<br>CLICK HERE ANY TIME.';
    document.body.appendChild(note);

    /* Centred under the link, kept on screen, with the arrow on the link. */
    var r = target.getBoundingClientRect();
    var w = note.offsetWidth;
    var left = Math.max(16, Math.min(window.innerWidth - 16 - w, r.left + r.width / 2 - w / 2));
    note.style.left = left + 'px';
    note.style.top  = (r.bottom + 14) + 'px';
    note.style.setProperty('--tip', (r.left + r.width / 2 - left) + 'px');

    var timer = window.setTimeout(dismiss, NOTE_MS);
    note.addEventListener('click', dismiss);
    window.addEventListener('resize', dismiss);

    function dismiss() {
      window.clearTimeout(timer);
      window.removeEventListener('resize', dismiss);
      target.classList.remove('is-beacon');
      if (!note.parentNode || note.classList.contains('is-leaving')) return;
      note.classList.add('is-leaving');
      window.setTimeout(function () { note.remove(); }, reduced() ? 0 : 150);
    }
  }
}());
