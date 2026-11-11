/* ==========================================================================
   CHEST — the reward screen a ? block opens
   --------------------------------------------------------------------------
   A quick reveal rather than a cutscene: the chest drops in, the lid pops
   open, and every skill comes out of it at once, each with a short line on
   what it covers. All of it is on screen in under a second.
   The timing lives in the CSS (section 6o); this file builds the markup and
   handles closing.

   Any key or a click closes it. Key repeats are ignored, and so is input in
   the first moment after opening, so the Up press that opened the chest
   cannot also close it.

   Exposed as window.CHEST. js/map.js decides what goes in it.
   ========================================================================== */
(function () {
  'use strict';

  var GUARD_MS = 250;            // ignore input this soon after opening
  var CLOSE_MS = 120;            // fade-out before the screen is removed

  var root = null;               // the open screen, or null
  var openedAt = 0;
  var onClose = null;
  var lastFocus = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function summary(loot) {
    return loot.length + (loot.length === 1 ? ' SKILL' : ' SKILLS') + ' UNLOCKED';
  }

  /**
   * Open the reward screen.
   *   opts.title     chest heading, e.g. 'STARTING KIT'
   *   opts.loot      [{ name, detail, icon }]
   *   opts.onClose   called once the screen is gone
   */
  function open(opts) {
    if (root) remove();
    var loot = opts.loot || [];
    lastFocus = document.activeElement;
    onClose = opts.onClose || null;

    var tiles = '';
    for (var i = 0; i < loot.length; i++) {
      var s = loot[i];
      tiles +=
        '<li class="loot" style="--i:' + i + '">' +
          '<span class="loot__icon" aria-hidden="true">' + window.PIXEL.icon(s) + '</span>' +
          '<span class="loot__name">' + esc(s.name) + '</span>' +
          (s.detail ? '<span class="loot__detail">' + esc(s.detail) + '</span>' : '') +
        '</li>';
    }

    root = document.createElement('div');
    root.className = 'chest-screen';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'chest-title');
    root.tabIndex = -1;
    root.innerHTML =
      '<div class="chest-screen__inner">' +
        '<div class="chest-screen__stage" aria-hidden="true">' +
          '<span class="chest-screen__rays"></span>' +
          '<span class="chest-screen__chest">' + window.PIXEL.chest() + '</span>' +
        '</div>' +
        '<h2 class="chest-screen__title" id="chest-title">' + esc(opts.title || 'POWER-UP') + '</h2>' +
        '<p class="chest-screen__summary">' + summary(loot) + '</p>' +
        '<ul class="chest-screen__loot">' + tiles + '</ul>' +
        '<p class="chest-screen__hint">CLICK OR PRESS ANY KEY</p>' +
      '</div>';

    document.body.appendChild(root);
    openedAt = performance.now();
    root.focus({ preventScroll: true });
    root.addEventListener('click', function () { tryClose(); });
  }

  function tryClose() {
    if (!root || performance.now() - openedAt < GUARD_MS) return;
    close();
  }

  function close() {
    if (!root || root.classList.contains('is-closing')) return;
    var reduced = window.SITE && window.SITE.reducedMotion();
    root.classList.add('is-closing');
    window.setTimeout(remove, reduced ? 0 : CLOSE_MS);
  }

  function remove() {
    if (!root) return;
    root.remove();
    root = null;
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* gone */ }
    }
    var cb = onClose; onClose = null;
    if (cb) cb();
  }

  /* Capture phase, on window: this runs before the map's own key handling,
     so the key that closes the chest is not also read as a step or a jump. */
  var MODIFIERS = { Shift: 1, Control: 1, Alt: 1, Meta: 1, CapsLock: 1 };
  window.addEventListener('keydown', function (ev) {
    if (!root) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (ev.repeat || MODIFIERS[ev.key]) return;
    tryClose();
  }, true);

  window.CHEST = {
    open: open,
    close: close,
    isOpen: function () { return !!root; }
  };
}());
