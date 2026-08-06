// CF Pages Function：B 站高清直链代理
// 用途：<video> 直链播放需要 Referer=*.bilibili.com，浏览器无法伪造，
//       由本函数代发请求（Worker 侧可设 Referer），页面同源播放 1080P。
export async function onRequestGet(context) {
    const { request } = context;
    const url = new URL(request.url);
    const target = url.searchParams.get('url') || '';
    if (!/^https:\/\/[a-z0-9.-]+\.(bilivideo\.com|bilivideo\.cn|mcdn\.bilivideo\.cn|mountaintoys\.cn)\//i.test(target)) {
        return new Response('bad url', { status: 403 });
    }
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' };
    const range = request.headers.get('Range');
    if (range) headers['Range'] = range;
    headers['Referer'] = 'https://www.bilibili.com/';
    let resp;
    try {
        resp = await fetch(target, { headers });
    } catch (e) {
        return new Response('proxy error', { status: 502 });
    }
    const out = new Headers();
    const ct = resp.headers.get('Content-Type');
    out.set('Content-Type', ct || 'video/mp4');
    out.set('Accept-Ranges', 'bytes');
    out.set('Cache-Control', 'public, max-age=300');
    const cr = resp.headers.get('Content-Range');
    if (cr) out.set('Content-Range', cr);
    const cl = resp.headers.get('Content-Length');
    if (cl) out.set('Content-Length', cl);
    return new Response(resp.body, { status: resp.status, headers: out });
}
