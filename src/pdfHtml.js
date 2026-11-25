import { PDFJS_LIB, PDFJS_WORKER } from './pdfjsSource';

// Makes a string safe to place inside a <script> tag.
const esc = (str) =>
  JSON.stringify(str)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export function buildPdfHtml(base64, options = {}) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
<style>
  body { margin: 0; background: #777; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
  #status { color: #fff; text-align: center; padding: 14px; font-family: sans-serif; font-size: 15px; }
  #pages { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 0; }
  .pg { position: relative; line-height: 0; }
  canvas { background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
  .hl { position: absolute; z-index: 1; border-radius: 2px; }
  .hl.live { left: 0; top: 0; will-change: transform; pointer-events: none; }
  body.hlmode, body.hlmode .pg { touch-action: none; }
  body.hlmode .hl, body.hlmode .mk { pointer-events: none; }
  .mk { z-index: 2; position: absolute; transform: translate(-50%, -50%); width: 30px; height: 30px; line-height: 30px;
        text-align: center; font-size: 18px; background: #fde047; border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.5); }
</style>
</head>
<body>
<div id="status">Loading PDF...</div>
<div id="pages"></div>
<script>
  function post(m) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
  }
  function fail(e) {
    var msg = (e && e.message) ? e.message : String(e);
    document.getElementById('status').textContent = 'Could not show this PDF: ' + msg;
    post({ type: 'error', message: msg });
  }
  window.onerror = function (msg) { fail(msg); };

  // ----- sticky note markers -----
  window.NOTES = [];
  function addMarker(wrap, n) {
    var m = document.createElement('div');
    m.className = 'mk';
    m.textContent = '\\uD83D\\uDCDD';
    m.style.left = (n.x * 100) + '%';
    m.style.top = (n.y * 100) + '%';
    m.addEventListener('click', function (ev) {
      ev.stopPropagation();
      post({ type: 'openNote', id: n.id });
    });
    wrap.appendChild(m);
  }
  function renderMarkers() {
    var old = document.querySelectorAll('.mk');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    for (var j = 0; j < window.NOTES.length; j++) {
      var n = window.NOTES[j];
      var wrap = document.getElementById('pg' + n.page);
      if (wrap) addMarker(wrap, n);
    }
  }
  window.setNotes = function (list) {
    window.NOTES = list || [];
    renderMarkers();
  };

  // ----- highlights: swipe over text while highlight mode is on -----
  var HL_COLORS = {
    yellow: 'rgba(255, 221, 0, 0.42)',
    green: 'rgba(74, 222, 128, 0.42)',
    pink: 'rgba(244, 114, 182, 0.42)',
    blue: 'rgba(96, 165, 250, 0.42)',
    orange: 'rgba(251, 146, 60, 0.45)'
  };
  window.HL_MODE = false;
  window.HL_COLOR = 'yellow';
  window.HL_SIZE = 12;
  window.ERASER = false;
  window.HLS = [];
  function colorOf(name) { return HL_COLORS[name] || HL_COLORS.yellow; }
  function addHl(wrap, h) {
    var d = document.createElement('div');
    d.className = 'hl';
    d.setAttribute('data-id', h.id);
    d.style.left = (h.x * 100) + '%';
    d.style.top = (h.y * 100) + '%';
    d.style.width = (h.w * 100) + '%';
    d.style.height = (h.h * 100) + '%';
    d.style.background = colorOf(h.color);
    d.addEventListener('click', function (ev) {
      ev.stopPropagation();
      post({ type: 'openHighlight', id: h.id });
    });
    wrap.appendChild(d);
    return d;
  }
  function renderHighlights() {
    var old = document.querySelectorAll('.hl');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    for (var j = 0; j < window.HLS.length; j++) {
      var h = window.HLS[j];
      var wrap = document.getElementById('pg' + h.page);
      if (wrap) addHl(wrap, h);
    }
  }
  window.setHighlights = function (list) {
    window.HLS = list || [];
    renderHighlights();
  };
  window.setHighlightMode = function (on) {
    window.HL_MODE = !!on;
    document.body.className = on ? 'hlmode' : '';
  };
  window.setEraser = function (on) {
    window.ERASER = !!on;
  };
  window.setHighlightSize = function (px) {
    window.HL_SIZE = Math.min(Math.max(Number(px) || 12, 4), 30);
  };
  window.setHighlightColor = function (name) {
    window.HL_COLOR = HL_COLORS[name] ? name : 'yellow';
  };

  var erase = null;
  function startErase(e) {
    if (e.touches.length !== 1) { erase = null; return; }
    var wrap = e.target && e.target.closest ? e.target.closest('.pg') : null;
    if (!wrap) { erase = null; return; }
    erase = { wrap: wrap, ids: [] };
    eraseAt(e.touches[0]);
  }
  function eraseAt(t) {
    var els = erase.wrap.querySelectorAll('.hl[data-id]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.style.display === 'none') continue;
      var b = el.getBoundingClientRect();
      if (t.clientX >= b.left - 6 && t.clientX <= b.right + 6 && t.clientY >= b.top - 6 && t.clientY <= b.bottom + 6) {
        el.style.display = 'none';
        erase.ids.push(el.getAttribute('data-id'));
      }
    }
  }

  var drag = null;
  var raf = 0;
  // Works out the highlight box from the swipe. One line: locked to where the finger started.
  function dragRect(d) {
    var r = d.r;
    var left = Math.max(d.minX - r.left, 0);
    var right = Math.min(d.maxX - r.left, r.width);
    var top, bottom;
    var size = window.HL_SIZE;
    if (d.maxY - d.minY < size * 1.8) {
      top = d.startY - r.top - size / 2;
      bottom = top + size;
    } else {
      top = d.minY - r.top;
      bottom = d.maxY - r.top;
    }
    top = Math.max(top, 0);
    bottom = Math.min(bottom, r.height);
    return { px: left, py: top, pw: right - left, ph: bottom - top,
             x: left / r.width, y: top / r.height, w: (right - left) / r.width, h: (bottom - top) / r.height };
  }
  function paint() {
    raf = 0;
    if (!drag || !drag.el) return;
    var q = dragRect(drag);
    drag.el.style.transform = 'translate(' + q.px + 'px,' + q.py + 'px)';
    drag.el.style.width = q.pw + 'px';
    drag.el.style.height = q.ph + 'px';
  }
  function startDrag(e) {
    if (e.touches.length !== 1) { drag = null; return; }
    var t = e.touches[0];
    var wrap = e.target && e.target.closest ? e.target.closest('.pg') : null;
    if (!wrap) { drag = null; return; }
    var el = document.createElement('div');
    el.className = 'hl live';
    el.style.background = colorOf(window.HL_COLOR);
    el.style.width = '0px';
    el.style.height = '0px';
    wrap.appendChild(el);
    drag = { wrap: wrap, r: wrap.getBoundingClientRect(), el: el, startY: t.clientY,
             minX: t.clientX, maxX: t.clientX, minY: t.clientY, maxY: t.clientY };
  }
  document.addEventListener('touchmove', function (e) {
    if (erase && window.HL_MODE) {
      eraseAt(e.touches[0]);
      if (e.cancelable) e.preventDefault();
      return;
    }
    if (!drag || !window.HL_MODE) return;
    var t = e.touches[0];
    if (t.clientX < drag.minX) drag.minX = t.clientX;
    if (t.clientX > drag.maxX) drag.maxX = t.clientX;
    if (t.clientY < drag.minY) drag.minY = t.clientY;
    if (t.clientY > drag.maxY) drag.maxY = t.clientY;
    if (!raf) raf = requestAnimationFrame(paint);
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', function () {
    if (erase) {
      var ids = erase.ids;
      erase = null;
      if (ids.length) post({ type: 'eraseHighlights', ids: ids });
      return;
    }
    if (!drag) return;
    var d = drag;
    drag = null;
    var q = dragRect(d);
    if (q.pw < 12) {
      if (d.el.parentNode) d.el.parentNode.removeChild(d.el);
      return;
    }
    // show the final shape right away; the app then saves it and redraws it
    d.el.style.transform = 'translate(' + q.px + 'px,' + q.py + 'px)';
    d.el.style.width = q.pw + 'px';
    d.el.style.height = q.ph + 'px';
    post({ type: 'addHighlight', page: Number(d.wrap.dataset.page), x: q.x, y: q.y, w: q.w, h: q.h, color: window.HL_COLOR });
  }, { passive: true });

  // ----- long-press on a page = new sticky note there -----
  var lpTimer = null, sx = 0, sy = 0;
  document.addEventListener('touchstart', function (e) {
    clearTimeout(lpTimer);
    if (window.HL_MODE) { if (window.ERASER) startErase(e); else startDrag(e); return; }
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    sx = t.clientX; sy = t.clientY;
    var target = e.target;
    lpTimer = setTimeout(function () {
      var wrap = target && target.closest ? target.closest('.pg') : null;
      if (!wrap || (target.className && String(target.className).indexOf('mk') >= 0)) return;
      var r = wrap.getBoundingClientRect();
      var x = Math.min(Math.max((sx - r.left) / r.width, 0.03), 0.97);
      var y = Math.min(Math.max((sy - r.top) / r.height, 0.03), 0.97);
      if (navigator.vibrate) navigator.vibrate(40);
      post({ type: 'addNote', page: Number(wrap.dataset.page), x: x, y: y });
    }, 600);
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length !== 1) { clearTimeout(lpTimer); return; }
    var t = e.touches[0];
    if (Math.abs(t.clientX - sx) > 12 || Math.abs(t.clientY - sy) > 12) clearTimeout(lpTimer);
  }, { passive: true });
  document.addEventListener('touchend', function () { clearTimeout(lpTimer); }, { passive: true });
  document.addEventListener('touchcancel', function () { clearTimeout(lpTimer); }, { passive: true });

  // ----- tell the app which page is on screen -----
  var scrollTimer = null;
  window.addEventListener('scroll', function () {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function () {
      scrollTimer = null;
      var wraps = document.querySelectorAll('.pg');
      var cur = 1;
      for (var i = 0; i < wraps.length; i++) {
        if (wraps[i].getBoundingClientRect().bottom > window.innerHeight * 0.35) {
          cur = Number(wraps[i].dataset.page);
          break;
        }
      }
      post({ type: 'page', page: cur });
    }, 200);
  }, { passive: true });

  // ----- reading aloud support: get the text of a page, scroll to a page -----
  window.getPageText = function (n) {
    var pdf = window.__pdf;
    if (!pdf) { post({ type: 'pageText', page: n, text: '', pages: 0, loading: true }); return; }
    pdf.getPage(n).then(function (p) { return p.getTextContent(); }).then(function (tc) {
      var out = '';
      var items = tc.items;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        out += it.str;
        var nx = items[i + 1];
        if (!nx) break;
        if (it.hasEOL) { out += '\\n'; continue; }
        if (!it.str || !nx.str || !it.transform || !nx.transform) continue;
        var h = it.height || 10;
        if (Math.abs(nx.transform[5] - it.transform[5]) > h * 0.5) { out += '\\n'; continue; }
        var gap = nx.transform[4] - (it.transform[4] + it.width);
        if (gap > h * 0.15 && !/\\s$/.test(it.str) && !/^\\s/.test(nx.str)) out += ' ';
      }
      post({ type: 'pageText', page: n, text: out, pages: pdf.numPages });
    }).catch(function () {
      post({ type: 'pageText', page: n, text: '', pages: pdf.numPages });
    });
  };
  // Text of the whole document (up to maxChars), used to make questions.
  function extractText(items) {
    var out = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      out += it.str;
      var nx = items[i + 1];
      if (!nx) break;
      if (it.hasEOL) { out += '\\n'; continue; }
      if (!it.str || !nx.str || !it.transform || !nx.transform) continue;
      var h = it.height || 10;
      if (Math.abs(nx.transform[5] - it.transform[5]) > h * 0.5) { out += '\\n'; continue; }
      var gap = nx.transform[4] - (it.transform[4] + it.width);
      if (gap > h * 0.15 && !/\\s$/.test(it.str) && !/^\\s/.test(nx.str)) out += ' ';
    }
    return out;
  }
  window.getAllText = function (maxChars) {
    var pdf = window.__pdf;
    if (!pdf) { post({ type: 'allText', text: '', loading: true }); return; }
    var out = '';
    var n = 1;
    function next() {
      if (n > pdf.numPages || out.length >= maxChars) {
        post({ type: 'allText', text: out.slice(0, maxChars), pages: pdf.numPages });
        return;
      }
      pdf.getPage(n).then(function (p) { return p.getTextContent(); }).then(function (tc) {
        out += extractText(tc.items) + '\\n\\n';
        n++;
        next();
      }).catch(function () { n++; next(); });
    }
    next();
  };
  window.goToPage = function (n) {
    var el = document.getElementById('pg' + n);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  post({ type: 'ready' });
</script>
<script>
  var LIB = ${esc(PDFJS_LIB)};
  var WORKER = ${esc(PDFJS_WORKER)};
  var B64 = ${esc(base64)};
  var TEXT_ONLY = ${options.textOnly ? 'true' : 'false'};
  (function () {
    try {
      var s = document.createElement('script');
      s.textContent = LIB;
      document.head.appendChild(s);
      var lib = window['pdfjs-dist/build/pdf'];
      lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' }));

      var bin = atob(B64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      B64 = null;

      lib.getDocument({ data: bytes }).promise.then(async function (pdf) {
        window.__pdf = pdf;
        if (TEXT_ONLY) { post({ type: 'done', pages: pdf.numPages }); return; }
        var status = document.getElementById('status');
        var holder = document.getElementById('pages');
        var width = document.documentElement.clientWidth - 16;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (var n = 1; n <= pdf.numPages; n++) {
          status.textContent = 'Loading page ' + n + ' of ' + pdf.numPages + '...';
          var page = await pdf.getPage(n);
          var base = page.getViewport({ scale: 1 });
          var scale = width / base.width;
          var vp = page.getViewport({ scale: scale * dpr });
          var canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          canvas.style.width = (vp.width / dpr) + 'px';
          canvas.style.height = (vp.height / dpr) + 'px';
          var wrap = document.createElement('div');
          wrap.className = 'pg';
          wrap.id = 'pg' + n;
          wrap.dataset.page = String(n);
          wrap.appendChild(canvas);
          holder.appendChild(wrap);
          for (var q2 = 0; q2 < window.HLS.length; q2++) {
            if (window.HLS[q2].page === n) addHl(wrap, window.HLS[q2]);
          }
          for (var k = 0; k < window.NOTES.length; k++) {
            if (window.NOTES[k].page === n) addMarker(wrap, window.NOTES[k]);
          }
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        }
        status.textContent = 'Tip: long-press a page to add a sticky note';
        setTimeout(function () { status.style.display = 'none'; }, 5000);
        post({ type: 'done', pages: pdf.numPages });
      }).catch(fail);
    } catch (e) {
      fail(e);
    }
  })();
</script>
</body>
</html>`;
}
