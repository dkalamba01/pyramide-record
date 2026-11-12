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
  var ENABLED = true;
  var SUPPORTED = ['fr', 'en'];
  var FR_REGION = ['ln', 'kg', 'sw', 'lua', 'rw', 'rn', 'mg', 'wo', 'bm', 'ff', 'ktu', 'lu'];
  var STORE = 'pr-lang';
  var doc = document.documentElement;
  var script = document.currentScript;
  var base = script ? script.src.replace(/js\/i18n\.js(\?.*)?$/, '') : '';
  var dict = {}, dyn = {}, listeners = [], current = 'fr';

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
    if (window.PR_I18N_RELOAD && persist) { location.reload(); return; }
    var go = function () { applyAll(); for (var i = 0; i < listeners.length; i++) try { listeners[i](l); } catch (e) {} };
    if (l === 'en' && !dict.__loaded) load(go); else go();
  }

  function load(cb) {
    var pending = 2, fin = function () { if (--pending === 0) { dict.__loaded = 1; cb(); } };
    var get = function (name, set) {
      var x = new XMLHttpRequest();
      x.open('GET', base + 'data/i18n/' + name + '?v=' + (window.PR_I18N_V || '1'));
      x.onload = function () { try { set(JSON.parse(x.responseText)); } catch (e) {} fin(); };
      x.onerror = fin;
      x.send();
    };
    get('en.json', function (d) { dict = d; });
    get('en-js.json', function (d) { dyn = d; buildPats(); });
  }

  /* ---- Runtime translation of JavaScript-generated text -------------------------------
   * The apps (configurator, tools, quote builder) build French text in code. Instead of
   * touching their logic, the rendered text is translated afterwards: a text is normalised
   * (numbers replaced by #), looked up in en-js.json, and the numbers are put back in the
   * target language's format. */
  var NUM = /\d{1,3}(?:[\u00a0\u202f ]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g;
  function numEn(n, lang) {
    if (lang !== 'en') return n;
    var parts = n.split(','), ip = parts[0].replace(/[\u00a0\u202f ]/g, ','), dp = parts.length > 1 ? parts[1] : null;
    if (parts.length > 2) return n;
    if (dp !== null && dp.length === 3 && !/[\u00a0\u202f ]/.test(parts[0])) return n; /* already English thousands */
    return dp === null ? ip : ip + '.' + dp;
  }
  /* Template entries: keys containing {} match any text; the captured text is translated on its own. */
  var pats = [];
  function buildPats() {
    pats = [];
    Object.keys(dyn).forEach(function (k) {
      if (k.indexOf('{}') < 0) return;
      var src = k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\}/g, '\u0001').replace(/#/g, '\u0002');
      src = src.replace(/\u0001/g, '(.+?)').replace(/\u0002/g, '(\\d{1,3}(?:[\\u00a0\\u202f ]\\d{3})+(?:,\\d+)?|\\d+(?:[.,]\\d+)?)');
      pats.push({ re: new RegExp('^' + src + '$'), k: k, v: dyn[k] });
    });
    pats.sort(function (a, b) { return b.k.length - a.k.length; });
  }
  function trPat(core, lang) {
    var i, m, p, ci, order, out;
    for (i = 0; i < pats.length; i++) {
      p = pats[i]; m = p.re.exec(core); if (!m) continue;
      ci = 1; order = p.k.match(/\{\}|#/g) || [];
      out = []; order.forEach(function (t) { var c = m[ci++]; out.push(t === '#' ? numEn(c, lang) : tr(c, lang)); });
      ci = 0;
      return p.v.replace(/\{\}|#/g, function () { return out[ci++]; });
    }
    return null;
  }
  function trCore(core, lang) {
    var nums = [], key = core.replace(/\s+/g, ' ').replace(NUM, function (n) { nums.push(n); return '#'; });
    var v = dyn[key];
    if (v === undefined) v = dyn[core.replace(/\s+/g, ' ')];
    if (v === undefined) { return pats.length ? trPat(core.replace(/\s+/g, ' '), lang) : null; }
    var i = 0;
    return v.replace(/#/g, function () { var n = nums[i++]; return n === undefined ? '#' : numEn(n, lang); });
  }
  function tr(str, lang) {
    lang = lang || override || current;
    if (lang !== 'en' || str == null) return str;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(String(str));
    var core = m[2]; if (!core) return str;
    var v = trCore(core, lang);
    if (v !== null) return m[1] + v + m[3];
    if (window.__trDebug && /[A-Za-z\u00c0-\u00ff]{3}/.test(core)) (window.__trMiss = window.__trMiss || {})[core] = 1;
    /* fallback 1: sentence by sentence ('. ' and '; ' boundaries), each sentence may itself fall back to pieces */
    var sp = core.split(/(\s*[.;]\s+)/), hit0 = false, j, one;
    if (sp.length > 1) {
      for (j = 0; j < sp.length; j += 2) {
        one = trOne(sp[j], lang);
        if (one !== sp[j]) { sp[j] = one; hit0 = true; }
      }
      if (hit0) { for (j = 1; j < sp.length; j += 2) sp[j] = sp[j].replace(/^\s+;/, ';'); return m[1] + sp.join('') + m[3]; }
    }
    one = trOne(core, lang);
    return one !== core ? m[1] + one + m[3] : str;
  }
  /* one sentence: whole lookup (with/without trailing period), then piecewise around separators */
  function trOne(core0, lang) {
    var mm = /^(\s*)([\s\S]*?)(\s*)$/.exec(core0), core = mm[2];
    if (!core) return core0;
    return mm[1] + trOne2(core, lang) + mm[3];
  }
  function trOne2(core, lang) {
    var dot = /[.]$/.test(core) ? '.' : '', c = dot ? core.slice(0, -1) : core, v = trCore(c, lang);
    if (v !== null) return v + dot;
    v = trCore(core, lang); if (v !== null) return v;
    var parts = splitTop(c), hit = false, i, t;
    if (parts.length < 3) parts = null;
    if (parts) {
      for (i = 0; i < parts.length; i += 2) {
        if (!parts[i].trim()) continue;
        t = trPart(parts[i].trim(), lang);
        if (t !== null) { parts[i] = parts[i].replace(parts[i].trim(), function () { return t; }); hit = true; }
      }
      for (i = 1; i < parts.length; i += 2) parts[i] = parts[i].replace(/^\s*:\s*$/, ': ');
      if (hit) return parts.join('') + dot;
    }
    t = trPart(c, lang);
    return t !== null ? t + dot : core;
  }
  var SEP = /^(\s*[\u00b7\u2014\u2013:+\u2192|]\s*|\s\u00d7\s?(?=\d))/;
  /* split at separators that are NOT inside parentheses; returns [text, sep, text, ...] */
  function splitTop(c) {
    var out = [], depth = 0, cur = '', i = 0, m, ch;
    while (i < c.length) {
      ch = c.charAt(i);
      if (ch === '(') depth++; else if (ch === ')') depth = Math.max(0, depth - 1);
      if (!depth && (m = SEP.exec(c.slice(i))) && m[0].trim() !== '' && cur) { out.push(cur, m[0]); cur = ''; i += m[0].length; continue; }
      cur += ch; i++;
    }
    out.push(cur);
    return out;
  }
  /* a piece: whole lookup, else split around parentheses */
  function trPart(c, lang) {
    var v = trCore(c, lang); if (v !== null) return v;
    var parts = c.split(/(\s*[()]\s*)/), hit = false, i, t;
    if (parts.length < 3) return null;
    for (i = 0; i < parts.length; i += 2) {
      if (!parts[i].trim()) continue;
      t = trCore(parts[i].trim(), lang);
      if (t !== null) { parts[i] = parts[i].replace(parts[i].trim(), function () { return t; }); hit = true; }
    }
    return hit ? parts.join('') : null;
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1 };
  var TATTR = ['title', 'placeholder', 'aria-label', 'alt', 'data-tip'];
  function trNode(n, lang) {
    var i, a, v, w;
    if (n.nodeType === 3) {
      if (n.parentNode && (SKIP[n.parentNode.nodeName] || (n.parentNode.nodeName === 'OPTION' && !n.parentNode.hasAttribute('value')))) return;
      v = n.nodeValue; w = tr(v, lang); if (w !== v) n.nodeValue = w; return;
    }
    if (n.nodeType !== 1 || SKIP[n.nodeName]) return;
    if (n.hasAttribute && n.hasAttribute('translate') && n.getAttribute('translate') === 'no') return;
    for (i = 0; i < TATTR.length; i++) {
      a = TATTR[i]; if (n.hasAttribute(a)) { v = n.getAttribute(a); w = tr(v, lang); if (w !== v) n.setAttribute(a, w); }
    }
    if (n.nodeName === 'INPUT' && /^(button|submit)$/.test(n.type)) { w = tr(n.value, lang); if (w !== n.value) n.value = w; }
    for (n = n.firstChild; n; n = n.nextSibling) trNode(n, lang);
  }
  var queue = [], queued = false;
  function flush() {
    queued = false; var q = queue; queue = [];
    for (var i = 0; i < q.length; i++) if (q[i].isConnected !== false) trNode(q[i], current);
  }
  function startObserver() {
    if (current !== 'en' || !window.MutationObserver || !document.body) return;
    trNode(document.body, 'en');
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'childList') for (var j = 0; j < m.addedNodes.length; j++) queue.push(m.addedNodes[j]);
        else queue.push(m.target);
      }
      if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(flush); }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TATTR });
  }
  /* Translate an HTML string (e.g. a PDF page) or a multi-line text (e.g. a WhatsApp message). */
  function trHtml(html, lang) {
    lang = eff(lang); if (lang !== 'en') return html;
    var d = new DOMParser().parseFromString(html, 'text/html');
    trNode(d.documentElement, 'en');
    d.documentElement.setAttribute('lang', 'en');
    return '<!DOCTYPE html>' + d.documentElement.outerHTML;
  }
  var override = null;
  function eff(lang) { return lang || override || current; }
  function trText(text, lang) {
    lang = eff(lang); if (lang !== 'en' || text == null) return text;
    return String(text).split('\n').map(function (l) {
      var w;
      if (!/[*_~]/.test(l)) { w = tr(l, 'en'); if (w !== l) return tidy(w); }
      /* split on WhatsApp markers and separators, translate each piece */
      return tidy(l.split(/(\s[\u2014\u00b7]\s|\s:\s|:\s|[*_~])/).map(function (p, i) {
        if (i % 2) return p;
        var b = /^(\s*[\u2022\u25aa\u25e6]\s+)([\s\S]*)$/.exec(p);
        return b ? b[1] + tr(b[2], 'en') : tr(p, 'en');
      }).join(''));
    }).join('\n');
  }
  /* English typography: "word :" -> "word:" */
  function tidy(l) { return l.replace(/([*_~)\w\u00e0-\u00ff]) :(?=\s|$)/g, '$1:'); }
  function deep(o, lang) {
    lang = eff(lang); if (lang !== 'en') return o;
    if (typeof o === 'string') return trText(o, lang);
    if (Array.isArray(o)) return o.map(function (x) { return deep(x, lang); });
    if (o && typeof o === 'object' && Object.getPrototypeOf(o) === Object.prototype) {
      var r = {}; for (var k in o) r[k] = deep(o[k], lang); return r;
    }
    return o;
  }
  function withLang(lang, fn) {
    var prev = override; override = lang; try { return fn(); } finally { override = prev; }
  }
  function loc() { return eff() === 'en' ? 'en-US' : 'fr-FR'; }

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
    var done = false, finish = function () { if (done) return; done = true; applyAll(); doc.classList.remove('i18n-wait'); startObserver(); };
    load(function () { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { finish(); mountSwitch(); }); else { finish(); mountSwitch(); } });
    setTimeout(function () { doc.classList.remove('i18n-wait'); }, 2500);
  } else {
    doc.setAttribute('lang', 'fr');
    document.addEventListener('DOMContentLoaded', mountSwitch);
  }

  window.PRI18N = {
    get lang() { return current; },
    set: function (l) { setLang(l, true); },
    tr: tr, html: trHtml, text: trText, deep: deep, withLang: withLang, loc: loc,
    t: function (id, fr) { return (current === 'en' && dict[id] !== undefined) ? dict[id] : fr; },
    onChange: function (cb) { listeners.push(cb); },
    apply: applyAll
  };
})();
