// CF Pages Function：Spine 动画资源同源代理
// 参考站动画资源位于 HTTP 后端，HTTPS 页面直接 fetch 会被浏览器拦截，
// 本函数把 /spine/* 转发到参考站资源服务。
//
// 2026-08-14 修复：Cloudflare Workers 子请求不允许直接 fetch 裸 IP
// （会返回 403 "error code: 1003" Direct IP Access Not Allowed），
// 必须使用域名。sslip.io / nip.io 通配 DNS 会把 IP 形式的子域解析回原 IP，
// 因此改用 http://152-136-189-98.sslip.io:3000 作为主源。
const BACKEND_HOSTS = [
    'http://152-136-189-98.sslip.io:3000',
    'http://152-136-189-98.nip.io:3000',
    'http://152.136.189.98:3000', // 兜底：裸 IP 在 Workers 中会被 CF 拒绝，仅本地 wrangler dev 可用
];

async function fetchBackend(path, method, bodyText, contentType) {
    let lastErr = null;
    for (const base of BACKEND_HOSTS) {
        const target = base + '/' + path;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        };
        try {
            if (method === 'POST') {
                headers['Content-Type'] = contentType || 'application/json';
                const resp = await fetch(target, { method: 'POST', headers, body: bodyText });
                const out = new Headers(resp.headers);
                out.set('Access-Control-Allow-Origin', '*');
                return new Response(resp.body, { status: resp.status, headers: out });
            }
            const resp = await fetch(target, { headers });
            const out = new Headers();
            out.set('Content-Type', resp.headers.get('Content-Type') || 'application/octet-stream');
            out.set('Cache-Control', 'public, max-age=3600');
            out.set('Access-Control-Allow-Origin', '*');
            return new Response(resp.body, { status: resp.status, headers: out });
        } catch (e) {
            lastErr = e;
        }
    }
    return new Response('spine proxy error: ' + (lastErr && lastErr.message ? lastErr.message : 'unknown'), { status: 502 });
}

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const suffix = url.pathname.replace(/^\/spine\//, '');
    let path;
    if (suffix === 'assets/getMeshsKey' || suffix === 'assets/getTrapsKey' || suffix === 'assets/getTokenCards') {
        // 参考站数据接口（POST JSON）
        path = suffix;
    } else if (suffix.startsWith('trap/')) {
        // 道具 Spine / 贴图资源（trap/spine/...、trap/image/...）
        path = suffix;
    } else {
        // 敌人 Spine 资源（spine/<key>/...）
        path = 'spine/' + suffix;
    }
    const bodyText = request.method === 'POST' ? await request.text() : null;
    return fetchBackend(path, request.method, bodyText, request.headers.get('Content-Type'));
}
