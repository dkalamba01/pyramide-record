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
