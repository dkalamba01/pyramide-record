/* Pyramide Record — bilingual engine (FR / EN).
 *
 * French is the source language written in the HTML. English is applied at runtime
 * from data/i18n/en.json. Elements carry data-i18n="<key>" (inner HTML) and
 * data-i18n-attr="attr:key,..." (attributes). JavaScript-generated text uses
 * PRI18N.t(id, fr).
 *
 * Language choice, in order:
 *   1. ?lang=fr|en in the URL (testing / sharing links)
 *   2. the visitor's saved choice (FR | EN switch)
 *   3. the first French or English entry in the browser's language list
 *   4. no French/English entry: French for languages spoken in Congo and francophone
 *      Africa, English for everything else.
 * Until ENABLED is true the engine only reacts to ?lang= (no auto-detect, no switch).
 */
(function () {
  'use strict';
  var ENABLED = false;
  var SUPPORTED = ['fr', 'en'];
  var FR_REGION = ['ln', 'kg', 'sw', 'lua', 'rw', 'rn', 'mg', 'wo', 'bm', 'ff', 'ktu', 'lu'];
  var STORE = 'pr-lang';
  var doc = document.documentElement;
  var script = document.currentScript;
  var base = script ? script.src.replace(/js\/i18n\.js(\?.*)?$/, '') : '';
  var dict = {}, listeners = [], current = 'fr';

  function stored() { try { return localStorage.getItem(STORE); } catch (e) { return null; } }
  function save(l) { try { localStorage.setItem(STORE, l); } catch (e) {} }
  function fromUrl() {
    var m = /[?&]lang=(fr|en)\b/.exec(location.search); return m ? m[1] : null;
  }
  function detect() {
    var u = fromUrl(); if (u) return u;
    if (!ENABLED) return 'fr';
    var s = stored(); if (s && SUPPORTED.indexOf(s) > -1) return s;
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
    var i, b;
    for (i = 0; i < list.length; i++) { b = String(list[i]).toLowerCase().split('-')[0]; if (SUPPORTED.indexOf(b) > -1) return b; }
    for (i = 0; i < list.length; i++) { b = String(list[i]).toLowerCase().split('-')[0]; if (FR_REGION.indexOf(b) > -1) return 'fr'; }
    return 'en';
  }

  function decode(html) { var t = document.createElement('textarea'); t.innerHTML = html; return t.value; }

  function applyAll(root) {
    var lang = current, scope = root || document, i, el, k, v, parts, j, a;
    var nodes = scope.querySelectorAll('[data-i18n]');
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i]; k = el.getAttribute('data-i18n');
      if (el.__fr === undefined) el.__fr = (el.tagName === 'TITLE' || el.tagName === 'OPTION') ? el.textContent : el.innerHTML;
      v = (lang === 'en' && dict[k] !== undefined) ? dict[k] : null;
      if (el.tagName === 'TITLE' || el.tagName === 'OPTION') el.textContent = v === null ? el.__fr : decode(v);
      else el.innerHTML = v === null ? el.__fr : v;
    }
    var attrs = scope.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < attrs.length; i++) {
      el = attrs[i]; if (!el.__frA) el.__frA = {};
      parts = el.getAttribute('data-i18n-attr').split(',');
      for (j = 0; j < parts.length; j++) {
        a = parts[j].split(':'); if (a.length < 2) continue;
        if (el.__frA[a[0]] === undefined) el.__frA[a[0]] = el.getAttribute(a[0]);
        v = (lang === 'en' && dict[a[1]] !== undefined) ? dict[a[1]] : null;
        el.setAttribute(a[0], v === null ? el.__frA[a[0]] : decode(v));
      }
    }
    if (!root) {
      doc.setAttribute('lang', lang);
      var sw = document.querySelectorAll('.nav__lang button');
      for (i = 0; i < sw.length; i++) sw[i].setAttribute('aria-pressed', sw[i].getAttribute('data-lang') === lang ? 'true' : 'false');
    }
  }

  function setLang(l, persist) {
    if (SUPPORTED.indexOf(l) < 0) return;
    current = l; if (persist) save(l);
    var go = function () { applyAll(); for (var i = 0; i < listeners.length; i++) try { listeners[i](l); } catch (e) {} };
    if (l === 'en' && !dict.__loaded) load(go); else go();
  }

  function load(cb) {
    var x = new XMLHttpRequest();
    x.open('GET', base + 'data/i18n/en.json?v=' + (window.PR_I18N_V || '1'));
    x.onload = function () { try { dict = JSON.parse(x.responseText); } catch (e) { dict = {}; } dict.__loaded = 1; cb(); };
    x.onerror = function () { dict.__loaded = 1; cb(); };
    x.send();
  }

  function css() {
    var s = document.createElement('style');
    s.textContent = 'html.i18n-wait body{visibility:hidden}' +
      '.nav__lang{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--hair-2,rgba(255,255,255,.2));border-radius:999px;padding:2px;margin:0 6px}' +
      '.nav__lang button{background:none;border:0;color:inherit;font:inherit;font-size:12px;font-weight:600;letter-spacing:.04em;padding:5px 9px;border-radius:999px;cursor:pointer;opacity:.65}' +
      '.nav__lang button[aria-pressed="true"]{background:var(--gold,#e8a552);color:#10161f;opacity:1}' +
      '.nav__lang button:focus-visible{outline:2px solid var(--gold,#e8a552);outline-offset:2px}';
    document.head.appendChild(s);
  }

  function mountSwitch() {
    if (!ENABLED || document.querySelector('.nav__lang')) return;
    var menu = document.getElementById('menu'); if (!menu) return;
    var box = document.createElement('div'); box.className = 'nav__lang'; box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Langue / Language'); box.setAttribute('translate', 'no');
    box.innerHTML = '<button type="button" data-lang="fr" aria-label="Français">FR</button><button type="button" data-lang="en" aria-label="English">EN</button>';
    var anchor = document.getElementById('theme-toggle');
    if (anchor && anchor.parentNode === menu) menu.insertBefore(box, anchor); else menu.appendChild(box);
    box.addEventListener('click', function (e) { var b = e.target.closest('button[data-lang]'); if (b) setLang(b.getAttribute('data-lang'), true); });
    var sw = box.querySelectorAll('button');
    for (var i = 0; i < sw.length; i++) sw[i].setAttribute('aria-pressed', sw[i].getAttribute('data-lang') === current ? 'true' : 'false');
  }

  current = detect();
  css();
  if (current === 'en') {
    doc.classList.add('i18n-wait');
    var done = false, finish = function () { if (done) return; done = true; applyAll(); doc.classList.remove('i18n-wait'); };
    load(function () { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { finish(); mountSwitch(); }); else { finish(); mountSwitch(); } });
    setTimeout(function () { doc.classList.remove('i18n-wait'); }, 2500);
  } else {
    doc.setAttribute('lang', 'fr');
    document.addEventListener('DOMContentLoaded', mountSwitch);
  }

  window.PRI18N = {
    get lang() { return current; },
    set: function (l) { setLang(l, true); },
    t: function (id, fr) { return (current === 'en' && dict[id] !== undefined) ? dict[id] : fr; },
    onChange: function (cb) { listeners.push(cb); },
    apply: applyAll
  };
})();
