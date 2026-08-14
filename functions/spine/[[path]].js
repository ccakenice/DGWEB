// CF Pages Function：Spine 动画资源同源代理（resolveOverride 版）
//
// 链路约束（2026-08-14 排查结论）：
//  1. Workers fetch 不允许裸 IP URL（1003）；
//  2. 后端防盗链按 Host 白名单放行，仅接受 152.136.189.98 / localhost，
//     其它域名 Host 一律 302 到腾讯云域名拦截页；
//  3. Workers fetch 的 Host 头由 URL 决定，无法覆盖；
//  4. cloudflare:sockets 在本 Pages 项目下收不到任何数据（0 字节）。
// 方案：URL 用 http://localhost:3000（Host 头为 localhost:3000，被后端放行），
//       再通过 cf.resolveOverride 把 DNS 解析强制指向 152.136.189.98。
const BACKEND_IP = '152.136.189.98';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';

async function fetchBackend(path, method, bodyText, contentType) {
    const url = 'http://localhost:3000/' + path;
    const headers = {
        'User-Agent': UA,
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
    };
    const init = {
        method,
        headers,
        cf: { resolveOverride: BACKEND_IP },
    };
    if (method === 'POST') {
        headers['Content-Type'] = contentType || 'application/json';
        init.body = bodyText;
    }
    const resp = await fetch(url, init);
    const out = new Headers(resp.headers);
    out.set('Access-Control-Allow-Origin', '*');
    out.delete('Set-Cookie');
    out.delete('set-cookie');
    return new Response(resp.body, { status: resp.status, headers: out });
}

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const suffix = url.pathname.replace(/^\/spine\//, '');
    let path;
    if (suffix === 'assets/getMeshsKey' || suffix === 'assets/getTrapsKey' || suffix === 'assets/getTokenCards') {
        path = suffix;
    } else if (suffix.startsWith('trap/')) {
        path = suffix;
    } else {
        path = 'spine/' + suffix;
    }
    const bodyText = request.method === 'POST' ? await request.text() : null;
    try {
        return await fetchBackend(path, request.method, bodyText, request.headers.get('Content-Type'));
    } catch (e) {
        return new Response('spine proxy error: ' + ((e && e.message) || e), {
            status: 502,
            headers: { 'Access-Control-Allow-Origin': '*' },
        });
    }
}
