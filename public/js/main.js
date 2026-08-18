/* ============================================================
   PYRAMIDE RECORD — main.js
   Nav toggle · animated waveform · scroll reveal
   ============================================================ */
(function () {
  'use strict';

  /* ---- Mobile nav ---- */
  var burger = document.querySelector('.nav__burger');
  var menu = document.querySelector('.nav__menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) menu.classList.remove('is-open');
    });
  }

  /* ---- Animated bar waveform (signature motif) ---- */
  function buildWaveform(el) {
    var N = parseInt(el.getAttribute('data-bars') || '64', 10);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < N; i++) {
      var env = 0.32 + 0.68 * Math.abs(Math.sin(i / 9.0));      // loudness envelope
      var base = env * (0.45 + Math.random() * 0.55);
      var h = Math.max(14, Math.round(base * 100));
      var bar = document.createElement('div');
      bar.className = 'waveform__bar';
      bar.style.height = h + '%';
      bar.style.setProperty('--bar-dur', (0.8 + Math.random() * 1.1).toFixed(2) + 's');
      bar.style.setProperty('--bar-min', (0.25 + Math.random() * 0.35).toFixed(2));
      bar.style.animationDelay = (-Math.random() * 1.5).toFixed(2) + 's';
      frag.appendChild(bar);
    }
    el.appendChild(frag);
  }
  document.querySelectorAll('.waveform').forEach(buildWaveform);

  /* ---- Scroll reveal ---- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add('is-visible'); });
  }
})();

/* ============================================================
   SITE-WIDE NAV FIXES — append to the END of js/main.js
   ------------------------------------------------------------
   1. Fixes any leftover "Journal" links pointing at the
      non-existent journal.html — repoints them to blog.html
      and relabels the text to "Blog", so every page is
      consistent even if a stray Journal link was missed
      during manual edits.
   2. Adds a "← Retour à l'accueil" link to the nav, but ONLY
      when the current page is NOT the homepage — so it never
      appears on index.html itself.
   ============================================================ */
(function () {
  // --- Fix 1: repoint any stray Journal links to Blog ---
  document.querySelectorAll('a.nav__link').forEach(function (link) {
    var href = link.getAttribute('href') || '';
    if (href.indexOf('journal.html') !== -1) {
      link.setAttribute('href', href.replace('journal.html', 'blog.html'));
      link.textContent = 'Blog';
    }
  });
 
  // --- Fix 2: conditional "back to home" link ---
  var path = window.location.pathname;
  var isHome = path === '/' || path.endsWith('/index.html') || path === '' ;
 
  if (!isHome) {
    var menu = document.querySelector('.nav__menu');
    if (menu) {
      var homeLink = document.createElement('a');
      homeLink.className = 'nav__link nav__link--home';
      homeLink.href = path.indexOf('/pages/') !== -1 ? '../index.html' : 'index.html';
      homeLink.innerHTML = '&larr;&nbsp;Retour à l\u2019accueil';
      menu.insertBefore(homeLink, menu.firstChild);
    }
  }
})();

/* ============================================================
   HORIZONTAL VIEWPORT DRIFT GUARD — append to the END of js/main.js
   ------------------------------------------------------------
   MITIGATION, not a root-cause fix. On some mobile browsers
   (observed on iOS Safari), focusing a text input inside a
   cross-origin iframe — like the Iris Financial booking/portal/
   shop widgets embedded via <iframe> on booking.html, portal.html
   and shop.html — can leave the OUTER page's visual viewport
   horizontally offset even after the input loses focus. This
   clips the site's own header/logo and hero text at the left
   edge until the page is reloaded or manually scrolled back.

   html/body already have overflow-x:hidden (tokens.css), which
   stops normal horizontal *scrolling*, but does not stop this
   specific visual-viewport *offset* quirk, since that's a
   browser-level pan, not a body scroll position.

   This listens for any horizontal drift and snaps it back to 0
   automatically — cheap, harmless on pages with no iframe, and
   runs continuously so it self-heals regardless of what triggered
   the drift. The actual root cause (why the offset happens at
   all) lives inside the Iris Financial widget's own iframe content
   and needs to be fixed on that side — this is a client-side
   safety net for our own pages in the meantime.
   ============================================================ */
(function () {
  function snapHorizontalScroll() {
    if (window.scrollX !== 0 || window.pageXOffset !== 0) {
      window.scrollTo(0, window.scrollY || window.pageYOffset || 0);
    }
  }
  window.addEventListener('scroll', snapHorizontalScroll, { passive: true });
  window.addEventListener('resize', snapHorizontalScroll);
  window.addEventListener('orientationchange', snapHorizontalScroll);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('scroll', snapHorizontalScroll);
    window.visualViewport.addEventListener('resize', snapHorizontalScroll);
  }
  // Also catch it right after any iframe on the page gains/loses focus,
  // since that's the specific trigger observed (booking/portal/shop widgets).
  window.addEventListener('blur', function () { setTimeout(snapHorizontalScroll, 50); });
  window.addEventListener('focus', function () { setTimeout(snapHorizontalScroll, 50); });
})();

/* ============================================================
   DAY/NIGHT THEME TOGGLE — append to the END of js/main.js
   ------------------------------------------------------------
   The color swap itself is pure CSS (tokens.css handles both
   the adaptive prefers-color-scheme case and the explicit
   data-theme override — see that file's DAY MODE section).
   This script only needs to:
     1. Persist an explicit choice to localStorage so it
        survives navigation and future visits.
     2. Flip the data-theme attribute on click.
   A blocking inline script in <head> (added to every page)
   already re-applies any saved explicit choice before first
   paint, so there's no flash of the wrong theme on load.
   ============================================================ */
(function () {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  function effectiveTheme() {
    var explicit = document.documentElement.getAttribute('data-theme');
    if (explicit === 'day' || explicit === 'night') return explicit;
    var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'day' : 'night';
  }

  toggle.addEventListener('click', function () {
    var next = effectiveTheme() === 'day' ? 'night' : 'day';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('pr-theme', next); } catch (e) {}
  });
})();