// B站最新视频同步 Worker（带 WBI 签名 + buvid3，规避风控）
// ============================================================
// 部署方式：Cloudflare Workers Dashboard → 粘贴本文件内容 → 保存
// 注意：本文件使用 `node:crypto` 计算 MD5，Cloudflare Workers 默认不支持，
//       需在 Worker 设置中开启兼容标志：
//   Workers & Pages → 选中该 Worker → Settings → Compatibility flags
//     → Production / Preview 都添加：nodejs_compat
// 开启后保存即可。不开会报 "crypto.hash is undefined / 无法 import node:crypto"。
// ============================================================

import { createHash } from 'node:crypto';

const UID = '3546373951588920';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const REFERER = `https://space.bilibili.com/${UID}`;

// WBI mixin key 重排表（固定值，B站官方算法）
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
];

// 缓存：同一 isolate 内复用，避免每次请求都打 B站接口拿 keys/buvid
let wbiKeys = null;        // { imgKey, subKey, expire }
let buvidCache = null;     // { value, expire }
const WBI_TTL = 6 * 3600 * 1000;   // wbi keys 缓存 6 小时
const BUVID_TTL = 24 * 3600 * 1000; // buvid3 缓存 24 小时

function basename(url = '') {
  const idx = url.lastIndexOf('/');
  const file = idx >= 0 ? url.slice(idx + 1) : url;
  const dot = file.lastIndexOf('.');
  return dot >= 0 ? file.slice(0, dot) : file;
}

function computeMixinKey(imgKey, subKey) {
  const raw = imgKey + subKey;
  return MIXIN_KEY_ENC_TAB.reduce((s, idx) => s + raw[idx], '').slice(0, 32);
}

async function getWbiKeys() {
  const now = Date.now();
  if (wbiKeys && now < wbiKeys.expire) return wbiKeys;
  const resp = await fetch('https://api.bilibili.com/x/web-interface/nav', {
    headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com/' }
  });
  if (!resp.ok) throw new Error('nav HTTP ' + resp.status);
  const json = await resp.json();
  const imgKey = basename(json?.data?.wbi_img?.img_url || '');
  const subKey = basename(json?.data?.wbi_img?.sub_url || '');
  if (!imgKey || !subKey) throw new Error('获取 WBI keys 失败');
  wbiKeys = { imgKey, subKey, expire: now + WBI_TTL };
  return wbiKeys;
}

async function getBuvid3() {
  const now = Date.now();
  if (buvidCache && now < buvidCache.expire) return buvidCache.value;
  try {
    const resp = await fetch('https://api.bilibili.com/x/frontend/finger/spi', {
      headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com/' }
    });
    if (resp.ok) {
      const json = await resp.json();
      const b3 = json?.data?.b_3 || '';
      if (b3) {
        buvidCache = { value: b3, expire: now + BUVID_TTL };
        return b3;
      }
    }
  } catch (_) { /* 拿不到 buvid3 也继续，很多情况下不需要 */ }
  return '';
}

function signWbi(params, mixinKey) {
  const wts = Math.floor(Date.now() / 1000);
  const all = { ...params, wts };
  const query = Object.keys(all)
    .sort()
    .map(k => `${k}=${encodeURIComponent(String(all[k]).replace(/[!'()*]/g, ''))}`)
    .join('&');
  const wRid = createHash('md5').update(query + mixinKey).digest('hex');
  return `${query}&w_rid=${wRid}`;
}

export default {
  async fetch(request) {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'no-cache'
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      const [{ imgKey, subKey }, buvid3] = await Promise.all([getWbiKeys(), getBuvid3()]);
      const mixinKey = computeMixinKey(imgKey, subKey);
      const query = signWbi({ mid: UID, ps: '8', pn: '1' }, mixinKey);
      const apiUrl = `https://api.bilibili.com/x/space/arc/search?${query}`;

      const resp = await fetch(apiUrl, {
        headers: {
          'User-Agent': UA,
          'Referer': REFERER,
          'Origin': 'https://space.bilibili.com',
          ...(buvid3 ? { 'Cookie': `buvid3=${buvid3}` } : {})
        }
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      if (data.code !== 0) throw new Error(data.message || `B站API错误 code=${data.code}`);

      const vlist = data.data?.list?.vlist || [];
      if (vlist.length === 0) throw new Error('视频列表为空');

      const items = vlist.slice(0, 8).map(v => ({
        title: v.title,
        link: `https://www.bilibili.com/video/${v.bvid}`,
        pubDate: new Date(v.created * 1000).toISOString(),
        media: { thumbnail: v.pic || '' },
        description: v.description || ''
      }));

      return new Response(JSON.stringify({ code: 0, data: items }), { headers });
    } catch (error) {
      return new Response(
        JSON.stringify({ code: -1, message: error?.message || String(error) }),
        { status: 500, headers }
      );
    }
  }
};