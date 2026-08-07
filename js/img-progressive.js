/* img-progressive.js - 低清占位 + 后台高清替换 (DGWEB v0.23)
 * 原理:
 *   1) 异步拉取 images/lowres/manifest.json
 *      { "images/xx.png":        {"hi":"images/xx.png","lo":"lowres/xx.png"},
 *        "https://外部URL.jpg":  {"hi":"images/ext/...","lo":"lowres/ext/..."} }
 *   2) 命中清单的 <img> 立即切到低清(lo), 并后台预载高清(hi)
 *   3) 高清就绪后淡入替换; 未命中的沿用原 URL
 * 支持: 静态 <img>、动态渲染(JS innerHTML), MutationObserver 全程接管
 */
(function () {
  'use strict';
  var MANIFEST_URL = 'images/lowres/manifest.json';
  var touch = 'data-lqpro';      // 处理标记
  var map = null;                // 清单
  var pending = [];              // 清单就绪前收集的 <img>

  /* 把任意 src 规范为可查 key:
   *   外部URL(含 protocol-relative) -> 完整 URL (与 manifest 的 key 一致)
   *   本地 images/xxx               -> "images/xxx"
   */
  function norm(u) {
    if (!u) return '';
    u = String(u).trim();
    if (u.indexOf('data:') === 0) return u;
    if (u.indexOf('blob:') === 0) return u;
    if (u.indexOf('//') === 0) u = location.protocol + u;
    // weserv 代理 → 还原原始 hdslb URL, 命中本地高清
    if (u.indexOf('images.weserv.nl') !== -1) {
      try {
        var q = new URL(u).searchParams.get('url');
        if (q) return norm(q);
      } catch (e) { /* ignore */ }
    }
    try {
      var a = new URL(u, document.baseURI);
      if (a.host === location.host) {
        // 本地: images/xxx (解码中文)
        return decodeURIComponent(a.pathname).replace(/^\/+/, '');
      }
      return a.href;
    } catch (e) {
      return u;
    }
  }

  /* 处理单个 img */
  function run(img) {
    if (!img || img.getAttribute(touch)) return;
    if (img.dataset.skip) return;
    var src = (img.currentSrc || img.getAttribute('src') || '').trim();
    if (!src || src.indexOf('data:') === 0 || src.indexOf('blob:') === 0) return;
    img.setAttribute(touch, '1');           // 标记防止重复

    var k = norm(src);
    var e = map !== null ? map[k] : null;
    if (map !== null && !e) return;          // 清单不可知: 保持原图
    var hi = e ? e.hi : src;
    var lo = e ? e.lo : hi;
    if (!hi || !lo) return;

    // 需要低清替换吗
    var needSwap = (lo !== src);
    if (!needSwap) return;                   // lo 即原图, 无需处理

    img.dataset.hi = hi;
    img.dataset.lo = lo;

    var done = function () {
      if (img.getAttribute('data-fade') || img.getAttribute('src') === hi) return;
      img.setAttribute('data-fade', '1');
      window.setTimeout(function () {
        img.src = hi;                        // 高清替换
      }, 0);
    };

    // 立即切低清
    img.src = lo;
    if (img.complete && img.naturalWidth > 0) {
      preload(hi, done);
    } else {
      img.addEventListener('load', function () { preload(hi, done); }, { once: true });
    }
  }

  var inflight = {};
  function preload(hi, done) {
    var p = inflight[hi];
    if (!p) {
      p = new Promise(function (resolve) {
        var I = new Image();
        I.onload = function () { resolve(true); };
        I.onerror = function () { resolve(false); };
        I.src = hi;
      });
      inflight[hi] = p;
    }
    p.then(function (ok) { if (ok) done(); });
  }

  function scan(root) {
    var list = (root || document).querySelectorAll('img');
    for (var i = 0; i < list.length; i++) {
      if (list[i].getAttribute(touch)) continue;
      if (map !== null) run(list[i]);
      else pending.push(list[i]);
    }
  }

  function flush() {
    for (var i = 0; i < pending.length; i++) run(pending[i]);
    pending.length = 0;
  }

  /* 观察动态渲染 */
  var mo = new MutationObserver(function (muts) {
    if (map === null) {
      // 清单未就绪: 依然收进 pending
      for (var i = 0; i < muts.length; i++) {
        var ns = muts[i].addedNodes;
        for (var j = 0; j < ns.length; j++) {
          var n = ns[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'IMG') pending.push(n);
          else if (n.querySelectorAll) {
            var sub = n.querySelectorAll('img');
            for (var k = 0; k < sub.length; k++) pending.push(sub[k]);
          }
        }
      }
      return;
    }
    for (var a = 0; a < muts.length; a++) {
      var ns2 = muts[a].addedNodes;
      for (var b = 0; b < ns2.length; b++) {
        var node = ns2[b];
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'IMG') run(node);
        else if (node.querySelectorAll) {
          var imgs = node.querySelectorAll('img');
          for (var c = 0; c < imgs.length; c++) run(imgs[c]);
        }
      }
    }
  });

  function boot() {
    mo.observe(document.body, { childList: true, subtree: true });
    scan(document);
    fetch(MANIFEST_URL + '?v=' + Date.now())
      .then(function (r) { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); })
      .then(function (j) {
        map = j;
        flush();            // 处理清单前的全部图片
        scan(document);
      })
      .catch(function () { map = null; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();