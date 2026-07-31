// Cloudflare Pages Function — B站数据代理（WBI签名 + 缓存 + 风控重试）
// 路由: /api/bilibili?mid=UID&action=all|videos|uinfo

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MIXIN_TAB = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];

let WBI = null, WBI_TS = 0;
let BUV = null, BUV_TS = 0;

function md5(s) {
  function L(k, d) { return (k << d) | (k >>> (32 - d)); }
  function K(G, F) { var I = (G & 0xFFFF) + (F & 0xFFFF); var H = (G >> 16) + (F >> 16) + (I >> 16); return (H << 16) | (I & 0xFFFF); }
  function q(C, B, A, y, x, t) { return K(L(K(K(B, C), K(y, t)), x), A); }
  function a(B, A, D, C, y, x, t) { return q((A & D) | ((~A) & C), B, A, y, x, t); }
  function b(B, A, D, C, y, x, t) { return q((A & C) | (D & (~C)), B, A, y, x, t); }
  function c(B, A, D, C, y, x, t) { return q(A ^ D ^ C, B, A, y, x, t); }
  function d(B, A, D, C, y, x, t) { return q(D ^ (A | (~C)), B, A, y, x, t); }
  function e(G) {
    var Y = G.length, X = Y + 8, W = (X - (X % 64)) / 64, V = (W + 1) * 16;
    var U = new Array(V - 1), T = 0, S = 0;
    while (S < Y) { var R = (S - (S % 4)) / 4; T = (S % 4) * 8; U[R] = (U[R] | (G.charCodeAt(S) << T)); S++; }
    var Q = (S - (S % 4)) / 4; T = (S % 4) * 8; U[Q] = U[Q] | (0x80 << T);
    U[V - 2] = Y << 3; U[V - 1] = Y >>> 29; return U;
  }
  function f(x) {
    var k = '', p, m, n;
    for (n = 0; n <= 3; n++) { m = (x >>> (n * 8)) & 255; p = '0' + m.toString(16); k += p.substr(p.length - 2, 2); }
    return k;
  }
  var i = e(s), h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476;
  for (var j = 0; j < i.length; j += 16) {
    var o0 = h0, o1 = h1, o2 = h2, o3 = h3;
    h0 = a(h0,h1,h2,h3,i[j+0],7,0xD76AA478); h3 = a(h3,h0,h1,h2,i[j+1],12,0xE8C7B756); h2 = a(h2,h3,h0,h1,i[j+2],17,0x242070DB); h1 = a(h1,h2,h3,h0,i[j+3],22,0xC1BDCEEE);
    h0 = a(h0,h1,h2,h3,i[j+4],7,0xF57C0FAF); h3 = a(h3,h0,h1,h2,i[j+5],12,0x4787C62A); h2 = a(h2,h3,h0,h1,i[j+6],17,0xA8304613); h1 = a(h1,h2,h3,h0,i[j+7],22,0xFD469501);
    h0 = a(h0,h1,h2,h3,i[j+8],7,0x698098D8); h3 = a(h3,h0,h1,h2,i[j+9],12,0x8B44F7AF); h2 = a(h2,h3,h0,h1,i[j+10],17,0xFFFF5BB1); h1 = a(h1,h2,h3,h0,i[j+11],22,0x895CD7BE);
    h0 = a(h0,h1,h2,h3,i[j+12],7,0x6B901122); h3 = a(h3,h0,h1,h2,i[j+13],12,0xFD987193); h2 = a(h2,h3,h0,h1,i[j+14],17,0xA679438E); h1 = a(h1,h2,h3,h0,i[j+15],22,0x49B40821);
    h0 = b(h0,h1,h2,h3,i[j+1],5,0xF61E2562); h3 = b(h3,h0,h1,h2,i[j+6],9,0xC040B340); h2 = b(h2,h3,h0,h1,i[j+11],14,0x265E5A51); h1 = b(h1,h2,h3,h0,i[j+0],20,0xE9B6C7AA);
    h0 = b(h0,h1,h2,h3,i[j+5],5,0xD62F105D); h3 = b(h3,h0,h1,h2,i[j+10],9,0x02441453); h2 = b(h2,h3,h0,h1,i[j+15],14,0xD8A1E681); h1 = b(h1,h2,h3,h0,i[j+4],20,0xE7D3FBC8);
    h0 = b(h0,h1,h2,h3,i[j+9],5,0x21E1CDE6); h3 = b(h3,h0,h1,h2,i[j+14],9,0xC33707D6); h2 = b(h2,h3,h0,h1,i[j+3],14,0xF4D50D87); h1 = b(h1,h2,h3,h0,i[j+8],20,0x455A14ED);
    h0 = b(h0,h1,h2,h3,i[j+13],5,0xA9E3E905); h3 = b(h3,h0,h1,h2,i[j+2],9,0xFCEFA3F8); h2 = b(h2,h3,h0,h1,i[j+7],14,0x676F02D9); h1 = b(h1,h2,h3,h0,i[j+12],20,0x8D2A4C8A);
    h0 = c(h0,h1,h2,h3,i[j+5],4,0xFFFA3942); h3 = c(h3,h0,h1,h2,i[j+8],11,0x8771F681); h2 = c(h2,h3,h0,h1,i[j+11],16,0x6D9D6122); h1 = c(h1,h2,h3,h0,i[j+14],23,0xFDE5380C);
    h0 = c(h0,h1,h2,h3,i[j+1],4,0xA4BEEA44); h3 = c(h3,h0,h1,h2,i[j+4],11,0x4BDECFA9); h2 = c(h2,h3,h0,h1,i[j+7],16,0xF6BB4B60); h1 = c(h1,h2,h3,h0,i[j+10],23,0xBEBFBC70);
    h0 = c(h0,h1,h2,h3,i[j+13],4,0x289B7EC6); h3 = c(h3,h0,h1,h2,i[j+0],11,0xEAA127FA); h2 = c(h2,h3,h0,h1,i[j+3],16,0xD4EF3085); h1 = c(h1,h2,h3,h0,i[j+6],23,0x04881D05);
    h0 = c(h0,h1,h2,h3,i[j+9],4,0xD9D4D039); h3 = c(h3,h0,h1,h2,i[j+12],11,0xE6DB99E5); h2 = c(h2,h3,h0,h1,i[j+15],16,0x1FA27CF8); h1 = c(h1,h2,h3,h0,i[j+2],23,0xC4AC5665);
    h0 = d(h0,h1,h2,h3,i[j+0],6,0xF4292244); h3 = d(h3,h0,h1,h2,i[j+7],10,0x432AFF97); h2 = d(h2,h3,h0,h1,i[j+14],15,0xAB9423A7); h1 = d(h1,h2,h3,h0,i[j+5],21,0xFC93A039);
    h0 = d(h0,h1,h2,h3,i[j+12],6,0x655B59C3); h3 = d(h3,h0,h1,h2,i[j+3],10,0x8F0CCC92); h2 = d(h2,h3,h0,h1,i[j+10],15,0xFFEFF47D); h1 = d(h1,h2,h3,h0,i[j+1],21,0x85845DD1);
    h0 = d(h0,h1,h2,h3,i[j+8],6,0x6FA87E4F); h3 = d(h3,h0,h1,h2,i[j+15],10,0xFE2CE6E0); h2 = d(h2,h3,h0,h1,i[j+6],15,0xA3014314); h1 = d(h1,h2,h3,h0,i[j+13],21,0x4E0811A1);
    h0 = d(h0,h1,h2,h3,i[j+4],6,0xF7537E82); h3 = d(h3,h0,h1,h2,i[j+11],10,0xBD3AF235); h2 = d(h2,h3,h0,h1,i[j+2],15,0x2AD7D2BB); h1 = d(h1,h2,h3,h0,i[j+9],21,0xEB86D391);
    h0 = K(h0,o0); h1 = K(h1,o1); h2 = K(h2,o2); h3 = K(h3,o3);
  }
  return f(h0) + f(h1) + f(h2) + f(h3);
}

function mixinKey(orig) {
  let s = '';
  for (let i = 0; i < MIXIN_TAB.length; i++) s += orig[MIXIN_TAB[i]];
  return s.slice(0, 32);
}

function encWbi(params, imgKey, subKey) {
  const mk = mixinKey(imgKey + subKey);
  const all = Object.assign({}, params, { wts: Math.floor(Date.now() / 1000) });
  const keys = Object.keys(all).sort();
  const parts = [];
  for (const k of keys) {
    const v = String(all[k]).replace(/[!'()*]/g, '');
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
  }
  const query = parts.join('&');
  return query + '&w_rid=' + md5(query + mk);
}

function fixUrl(u) {
  if (!u) return '';
  if (u.startsWith('//')) return 'https:' + u;
  return u;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function baseHeaders() {
  return {
    'User-Agent': UA,
    'Referer': 'https://www.bilibili.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9'
  };
}

async function getBuvid(force) {
  if (!force && BUV && Date.now() - BUV_TS < 12 * 3600 * 1000) return BUV;
  const r = await fetch('https://api.bilibili.com/x/frontend/finger/spi', { headers: baseHeaders() });
  const j = await r.json();
  BUV = { b3: j.data.b_3, b4: j.data.b_4 };
  BUV_TS = Date.now();
  return BUV;
}

async function apiHeaders(mid, forceBuvid) {
  const buv = await getBuvid(!!forceBuvid);
  return {
    'User-Agent': UA,
    'Referer': 'https://space.bilibili.com/' + mid + '/video',
    'Origin': 'https://space.bilibili.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cookie': 'buvid3=' + buv.b3 + '; buvid4=' + buv.b4
  };
}

async function getWbiKeys() {
  if (WBI && Date.now() - WBI_TS < 24 * 3600 * 1000) return WBI;
  const r = await fetch('https://api.bilibili.com/x/web-interface/nav', { headers: baseHeaders() });
  const j = await r.json();
  const img = j.data.wbi_img.img_url;
  const sub = j.data.wbi_img.sub_url;
  WBI = {
    img: img.slice(img.lastIndexOf('/') + 1, img.lastIndexOf('.')),
    sub: sub.slice(sub.lastIndexOf('/') + 1, sub.lastIndexOf('.'))
  };
  WBI_TS = Date.now();
  return WBI;
}

async function signedQuery(params) {
  const k = await getWbiKeys();
  return encWbi(params, k.img, k.sub);
}

async function fetchJson(url, headers) {
  const r = await fetch(url, { headers });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error('non-json status=' + r.status); }
}

async function fetchRobust(url, mid, retries) {
  let last = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const j = await fetchJson(url, await apiHeaders(mid, i > 0));
      if (j && (j.code === 0 || j.code === -101)) return j;
      if (j && (j.code === -799 || j.code === -412 || j.code === -403 || j.code === 412 || j.code === -352)) {
        last = new Error('risk ' + j.code);
        await sleep(700 + i * 700);
        continue;
      }
      last = new Error('code ' + (j && j.code));
      return j;
    } catch (e) {
      last = e;
      await sleep(700 + i * 700);
    }
  }
  throw last || new Error('fetch failed');
}

async function getFollower(mid) {
  const j = await fetchJson(
    'https://api.bilibili.com/x/relation/stat?vmid=' + mid + '&jsonp=jsonp',
    baseHeaders()
  );
  if (j && j.code === 0) return { follower: j.data.follower, following: j.data.following };
  return null;
}

async function getAccInfo(mid) {
  try {
    const q = await signedQuery({ mid: mid });
    const j = await fetchRobust('https://api.bilibili.com/x/space/acc/info?' + q, mid, 1);
    if (j && j.code === 0 && j.data) {
      return {
        name: j.data.name,
        face: fixUrl(j.data.face),
        videos: j.data.videos,
        sign: j.data.sign || ''
      };
    }
  } catch (e) {}
  return null;
}

async function getUinfo(mid) {
  const [rel, acc] = await Promise.all([getFollower(mid), getAccInfo(mid)]);
  if (!rel && !acc) throw new Error('uinfo unavailable');
  return {
    mid: mid,
    name: acc ? acc.name : null,
    face: acc ? acc.face : null,
    follower: rel ? rel.follower : null,
    following: rel ? rel.following : null,
    videos: acc ? acc.videos : null,
    sign: acc ? acc.sign : null
  };
}

async function getVideos(mid) {
  async function page(pn) {
    const q = await signedQuery({
      mid: mid, ps: 30, pn: pn, order: 'pubdate',
      platform: 'web', web_location: 1550101,
      dm_img_list: '[]', dm_img_str: 'V2ViR0wgMS', dm_cover_img_str: 'V2ViR0wgMS',
      dm_img_inter: '{"ds":[],"wh":[0,0,0],"of":[0,0,0]}'
    });
    return fetchRobust('https://api.bilibili.com/x/space/arc/search?' + q, mid, 2);
  }
  const j1 = await page(1);
  if (!j1 || j1.code !== 0 || !j1.data || !j1.data.list) {
    throw new Error('arc/search failed code=' + (j1 && j1.code));
  }
  const total = j1.data.page.total;
  const list = j1.data.list.vlist.slice();
  if (total > 30) {
    try {
      const j2 = await page(2);
      if (j2 && j2.code === 0 && j2.data && j2.data.list) {
        list.push.apply(list, j2.data.list.vlist);
      }
    } catch (e) {}
  }
  return {
    total: total,
    videos: list.map(function (v) {
      return {
        bvid: v.bvid,
        title: v.title,
        cover: fixUrl(v.pic),
        play: v.play,
        duration: v.length,
        created: v.created
      };
    })
  };
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function jsonResp(obj, status, maxAge) {
  const h = Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=' + (maxAge == null ? 300 : maxAge)
  }, cors());
  return new Response(JSON.stringify(obj), { status: status || 200, headers: h });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function onRequestGet(context) {
  const { request, waitUntil } = context;
  const url = new URL(request.url);
  const mid = url.searchParams.get('mid');
  const action = url.searchParams.get('action') || 'all';

  if (!mid || !/^\d+$/.test(mid)) {
    return jsonResp({ code: -1, message: 'missing or invalid mid' }, 400, 0);
  }

  const cache = caches.default;
  const cacheKey = new Request(new URL('/_cache/bilibili/' + mid + '/' + action, url.origin).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    let data;
    let degraded = false;

    if (action === 'videos') {
      const v = await getVideos(mid);
      data = { code: 0, videos: v.videos, total: v.total };
    } else if (action === 'uinfo') {
      data = { code: 0, uinfo: await getUinfo(mid) };
    } else {
      const pair = await Promise.all([
        getUinfo(mid).catch(function () { degraded = true; return null; }),
        getVideos(mid).catch(function () { degraded = true; return null; })
      ]);
      const uinfo = pair[0];
      const v = pair[1];
      if (!uinfo && !v) throw new Error('all upstream failed');
      data = {
        code: 0,
        uinfo: uinfo,
        videos: v ? v.videos : [],
        total: v ? v.total : 0,
        degraded: degraded
      };
    }

    data.updated = Math.floor(Date.now() / 1000);
    const res = jsonResp(data, 200, degraded ? 60 : 600);
    if (!degraded) waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch (e) {
    return jsonResp({ code: -500, message: String(e && e.message ? e.message : e) }, 502, 30);
  }
}
