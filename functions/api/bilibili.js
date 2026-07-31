/**
 * DGWEB — B站数据接口（Cloudflare Pages Function）
 *
 * 路由: GET /api/bilibili?mid=<B站UID>
 * 返回: { code:0, uinfo:{name,face,follower}, videos:[{bvid,title,cover,play,duration,created,url}], total, updated }
 *
 * 说明:
 *  - 使用新版 WBI 签名接口 (/x/space/wbi/arc/search)
 *  - 内置 10 分钟缓存 + 风控自动重试
 *  - 无需任何环境变量
 */

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CACHE_TTL = 600; // 秒

let gBuvid = null;
let gWbi = null;

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const mid = url.searchParams.get('mid') || '';
  if (!/^\d{1,20}$/.test(mid)) {
    return json({ code: -1, message: 'missing or invalid param: mid' }, 400);
  }

  const cache = caches.default;
  const cacheKey = new Request('https://dgweb.internal/api/bilibili?mid=' + mid);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    const uinfo = await getUinfo(mid);
    const videos = await getVideos(mid);
    const res = json({
      code: 0,
      uinfo,
      videos: videos.list,
      total: videos.total,
      updated: Math.floor(Date.now() / 1000)
    }, CACHE_TTL);
    context.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch (e) {
    return json({ code: -500, message: String((e && e.message) || e) }, 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/* ---------------- B站数据 ---------------- */

async function getUinfo(mid) {
  let follower = null, name = null, face = null;
  try {
    const s = await biliJson('https://api.bilibili.com/x/relation/stat?vmid=' + mid, false);
    if (s.code === 0 && s.data) follower = s.data.follower;
  } catch (e) { /* 容忍失败 */ }
  try {
    const i = await biliJson('https://api.bilibili.com/x/space/acc/info?mid=' + mid + '&platform=web&web_location=1550101', true);
    if (i.code === 0 && i.data) { name = i.data.name; face = fixProto(i.data.face); }
  } catch (e) { /* 容忍失败 */ }
  if (follower === null && !name) throw new Error('uinfo unavailable');
  return { name, face, follower };
}

async function getVideos(mid) {
  const list = [];
  let total = 0;
  // 只抓前 2 页，够用
  for (let pn = 1; pn <= 2; pn++) {
    // 构建参数对象（新版接口需要的参数）
    const params = {
      mid: mid,
      ps: 30,
      pn: pn,
      order: 'pubdate',
      platform: 'web',
      web_location: '1550101'
    };
    // 获取 WBI keys 并签名
    const buvid = await getBuvid();
    const keys = await getWbiKeys(buvid);
    const signedQuery = wbiSign(params, keys.imgKey, keys.subKey);
    const url = 'https://api.bilibili.com/x/space/wbi/arc/search?' + signedQuery;

    const j = await biliJsonRaw(url, buvid);
    if (j.code !== 0 || !j.data || !j.data.list) {
      if (pn === 1) throw new Error('arc/search rejected, code=' + j.code);
      break;
    }
    total = j.data.page ? j.data.page.total : total;
    for (const v of j.data.list.vlist || []) {
      list.push({
        bvid: v.bvid,
        title: v.title,
        cover: fixProto(v.pic),
        play: v.play,
        duration: v.length,
        created: v.created,
        url: 'https://www.bilibili.com/video/' + v.bvid
      });
    }
    if (pn < 2) await sleep(250);
  }
  if (!list.length) throw new Error('empty video list');
  return { list, total };
}

/* ---------------- 请求与签名 ---------------- */

// 通用请求（带签名）
async function biliJson(url, needSign, retryLeft = 1) {
  const buvid = await getBuvid();
  let finalUrl = url;
  if (needSign) {
    const keys = await getWbiKeys(buvid);
    const u = new URL(url);
    const params = {};
    u.searchParams.forEach((v, k) => { params[k] = v; });
    finalUrl = u.origin + u.pathname + '?' + wbiSign(params, keys.imgKey, keys.subKey);
  }
  return biliJsonRaw(finalUrl, buvid, retryLeft);
}

// 原始请求（带重试和风控处理）
async function biliJsonRaw(url, buvid, retryLeft = 1) {
  const resp = await fetch(url, { headers: biliHeaders(buvid) });
  if (resp.status === 412 || resp.status === 403) {
    if (retryLeft > 0) { gBuvid = null; await sleep(800); return biliJsonRaw(url, buvid, retryLeft - 1); }
    throw new Error('bilibili risk control, HTTP ' + resp.status);
  }
  const data = await resp.json();
  if (data.code === -799 || data.code === -412) {
    if (retryLeft > 0) { gBuvid = null; await sleep(800); return biliJsonRaw(url, buvid, retryLeft - 1); }
    throw new Error('bilibili rate limited, code=' + data.code);
  }
  return data;
}

async function getBuvid() {
  if (gBuvid && Date.now() - gBuvid.ts < 12 * 3600 * 1000) return gBuvid;
  const r = await fetch('https://api.bilibili.com/x/frontend/finger/spi', {
    headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com' }
  });
  const j = await r.json();
  if (j.code !== 0 || !j.data) throw new Error('finger/spi failed');
  gBuvid = { b3: j.data.b_3, b4: j.data.b_4, ts: Date.now() };
  return gBuvid;
}

async function getWbiKeys(buvid) {
  if (gWbi && Date.now() - gWbi.ts < 3600 * 1000) return gWbi;
  const r = await fetch('https://api.bilibili.com/x/web-interface/nav', {
    headers: biliHeaders(buvid)
  });
  const j = await r.json();
  const wbi = j.data && j.data.wbi_img;
  if (!wbi) throw new Error('wbi keys unavailable');
  gWbi = {
    imgKey: fileKey(wbi.img_url),
    subKey: fileKey(wbi.sub_url),
    ts: Date.now()
  };
  return gWbi;
}

function wbiSign(params, imgKey, subKey) {
  const mixin = getMixinKey(imgKey + subKey);
  const data = Object.assign({}, params, { wts: Math.floor(Date.now() / 1000) });
  const query = Object.keys(data).sort().map(k => {
    const v = String(data[k]).replace(/[!'()*]/g, '');
    return encodeURIComponent(k) + '=' + encodeURIComponent(v);
  }).join('&');
  return query + '&w_rid=' + md5(query + mixin);
}

function getMixinKey(orig) {
  let s = '';
  for (let i = 0; i < MIXIN_KEY_ENC_TAB.length; i++) s += orig[MIXIN_KEY_ENC_TAB[i]];
  return s.slice(0, 32);
}

function fileKey(u) {
  const f = u.substring(u.lastIndexOf('/') + 1);
  return f.substring(0, f.lastIndexOf('.'));
}

function fixProto(u) {
  if (!u) return '';
  return u.indexOf('//') === 0 ? 'https:' + u : u;
}

function biliHeaders(buvid) {
  return {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': 'https://space.bilibili.com/',
    'Origin': 'https://space.bilibili.com',
    'Cookie': 'buvid3=' + buvid.b3 + '; buvid4=' + buvid.b4
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(obj, ttl) {
  const h = { 'Content-Type': 'application/json; charset=utf-8' };
  const c = corsHeaders();
  for (const k in c) h[k] = c[k];
  if (ttl) h['Cache-Control'] = 'public, max-age=' + ttl;
  return new Response(JSON.stringify(obj), { status: 200, headers: h });
}

/* ---------------- MD5 ---------------- */

function md5(s) {
  function L(k, d) { return (k << d) | (k >>> (32 - d)); }
  function K(G, F) { const I = (G & 0xFFFF) + (F & 0xFFFF); const H = (G >> 16) + (F >> 16) + (I >> 16); return (H << 16) | (I & 0xFFFF); }
  function q(C, B, A, y, x, t) { return K(L(K(K(B, C), K(y, t)), x), A); }
  function a(B, A, D, C, y, x, t) { return q((A & D) | ((~A) & C), B, A, y, x, t); }
  function b(B, A, D, C, y, x, t) { return q((A & C) | (D & (~C)), B, A, y, x, t); }
  function c(B, A, D, C, y, x, t) { return q(A ^ D ^ C, B, A, y, x, t); }
  function d(B, A, D, C, y, x, t) { return q(D ^ (A | (~C)), B, A, y, x, t); }
  function e(G) {
    const Y = G.length; const X = Y + 8; const W = (X - (X % 64)) / 64; const V = (W + 1) * 16;
    const U = new Array(V - 1); let T = 0; let S = 0;
    while (S < Y) { const R = (S - (S % 4)) / 4; T = (S % 4) * 8; U[R] = (U[R] | (G.charCodeAt(S) << T)); S++; }
    const Q = (S - (S % 4)) / 4; T = (S % 4) * 8; U[Q] = U[Q] | (0x80 << T);
    U[V - 2] = Y << 3; U[V - 1] = Y >>> 29;
    return U;
  }
  function f(x) { let k = '', p = '', m, n; for (n = 0; n <= 3; n++) { m = (x >>> (n * 8)) & 255; p = '0' + m.toString(16); k = k + p.substr(p.length - 2, 2); } return k; }
  const i = e(s);
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476;
  for (let j = 0; j < i.length; j += 16) {
    const o0 = h0, o1 = h1, o2 = h2, o3 = h3;
    h0 = a(h0, h1, h2, h3, i[j + 0], 7, 0xD76AA478); h3 = a(h3, h0, h1, h2, i[j + 1], 12, 0xE8C7B756); h2 = a(h2, h3, h0, h1, i[j + 2], 17, 0x242070DB); h1 = a(h1, h2, h3, h0, i[j + 3], 22, 0xC1BDCEEE);
    h0 = a(h0, h1, h2, h3, i[j + 4], 7, 0xF57C0FAF); h3 = a(h3, h0, h1, h2, i[j + 5], 12, 0x4787C62A); h2 = a(h2, h3, h0, h1, i[j + 6], 17, 0xA8304613); h1 = a(h1, h2, h3, h0, i[j + 7], 22, 0xFD469501);
    h0 = a(h0, h1, h2, h3, i[j + 8], 7, 0x698098D8); h3 = a(h3, h0, h1, h2, i[j + 9], 12, 0x8B44F7AF); h2 = a(h2, h3, h0, h1, i[j + 10], 17, 0xFFFF5BB1); h1 = a(h1, h2, h3, h0, i[j + 11], 22, 0x895CD7BE);
    h0 = a(h0, h1, h2, h3, i[j + 12], 7, 0x6B901122); h3 = a(h3, h0, h1, h2, i[j + 13], 12, 0xFD987193); h2 = a(h2, h3, h0, h1, i[j + 14], 17, 0xA679438E); h1 = a(h1, h2, h3, h0, i[j + 15], 22, 0x49B40821);
    h0 = b(h0, h1, h2, h3, i[j + 1], 5, 0xF61E2562); h3 = b(h3, h0, h1, h2, i[j + 6], 9, 0xC040B340); h2 = b(h2, h3, h0, h1, i[j + 11], 14, 0x265E5A51); h1 = b(h1, h2, h3, h0, i[j + 0], 20, 0xE9B6C7AA);
    h0 = b(h0, h1, h2, h3, i[j + 5], 5, 0xD62F105D); h3 = b(h3, h0, h1, h2, i[j + 10], 9, 0x02441453); h2 = b(h2, h3, h0, h1, i[j + 15], 14, 0xD8A1E681); h1 = b(h1, h2, h3, h0, i[j + 4], 20, 0xE7D3FBC8);
    h0 = b(h0, h1, h2, h3, i[j + 9], 5, 0x21E1CDE6); h3 = b(h3, h0, h1, h2, i[j + 14], 9, 0xC33707D6); h2 = b(h2, h3, h0, h1, i[j + 3], 14, 0xF4D50D87); h1 = b(h1, h2, h3, h0, i[j + 8], 20, 0x455A14ED);
    h0 = b(h0, h1, h2, h3, i[j + 13], 5, 0xA9E3E905); h3 = b(h3, h0, h1, h2, i[j + 2], 9, 0xFCEFA3F8); h2 = b(h2, h3, h0, h1, i[j + 7], 14, 0x676F02D9); h1 = b(h1, h2, h3, h0, i[j + 12], 20, 0x8D2A4C8A);
    h0 = c(h0, h1, h2, h3, i[j + 5], 4, 0xFFFA3942); h3 = c(h3, h0, h1, h2, i[j + 8], 11, 0x8771F681); h2 = c(h2, h3, h0, h1, i[j + 11], 16, 0x6D9D6122); h1 = c(h1, h2, h3, h0, i[j + 14], 23, 0xFDE5380C);
    h0 = c(h0, h1, h2, h3, i[j + 1], 4, 0xA4BEEA44); h3 = c(h3, h0, h1, h2, i[j + 4], 11, 0x4BDECFA9); h2 = c(h2, h3, h0, h1, i[j + 7], 16, 0xF6BB4B60); h1 = c(h1, h2, h3, h0, i[j + 10], 23, 0xBEBFBC70);
    h0 = c(h0, h1, h2, h3, i[j + 13], 4, 0x289B7EC6); h3 = c(h3, h0, h1, h2, i[j + 0], 11, 0xEAA127FA); h2 = c(h2, h3, h0, h1, i[j + 3], 16, 0xD4EF3085); h1 = c(h1, h2, h3, h0, i[j + 6], 23, 0x04881D05);
    h0 = c(h0, h1, h2, h3, i[j + 9], 4, 0xD9D4D039); h3 = c(h3, h0, h1, h2, i[j + 12], 11, 0xE6DB99E5); h2 = c(h2, h3, h0, h1, i[j + 15], 16, 0x1FA27CF8); h1 = c(h1, h2, h3, h0, i[j + 2], 23, 0xC4AC5665);
    h0 = d(h0, h1, h2, h3, i[j + 0], 6, 0xF4292244); h3 = d(h3, h0, h1, h2, i[j + 7], 10, 0x432AFF97); h2 = d(h2, h3, h0, h1, i[j + 14], 15, 0xAB9423A7); h1 = d(h1, h2, h3, h0, i[j + 5], 21, 0xFC93A039);
    h0 = d(h0, h1, h2, h3, i[j + 12], 6, 0x655B59C3); h3 = d(h3, h0, h1, h2, i[j + 3], 10, 0x8F0CCC92); h2 = d(h2, h3, h0, h1, i[j + 10], 15, 0xFFEFF47D); h1 = d(h1, h2, h3, h0, i[j + 1], 21, 0x85845DD1);
    h0 = d(h0, h1, h2, h3, i[j + 8], 6, 0x6FA87E4F); h3 = d(h3, h0, h1, h2, i[j + 15], 10, 0xFE2CE6E0); h2 = d(h2, h3, h0, h1, i[j + 6], 15, 0xA3014314); h1 = d(h1, h2, h3, h0, i[j + 13], 21, 0x4E0811A1);
    h0 = d(h0, h1, h2, h3, i[j + 4], 6, 0xF7537E82); h3 = d(h3, h0, h1, h2, i[j + 11], 10, 0xBD3AF235); h2 = d(h2, h3, h0, h1, i[j + 2], 15, 0x2AD7D2BB); h1 = d(h1, h2, h3, h0, i[j + 9], 21, 0xEB86D391);
    h0 = K(h0, o0); h1 = K(h1, o1); h2 = K(h2, o2); h3 = K(h3, o3);
  }
  return f(h0) + f(h1) + f(h2) + f(h3);
}
