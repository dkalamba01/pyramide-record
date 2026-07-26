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
