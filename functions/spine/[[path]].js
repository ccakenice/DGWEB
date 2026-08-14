// CF Pages Function：Spine 动画资源同源代理
// 参考站动画资源位于 HTTP 后端，HTTPS 页面直接 fetch 会被浏览器拦截，
// 本函数把 /spine/* 转发到参考站资源服务。
const BACKEND = 'http://152.136.189.98:3000';

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const suffix = url.pathname.replace(/^\/spine\//, '');
    let target;
    if (suffix === 'assets/getMeshsKey' || suffix === 'assets/getTrapsKey' || suffix === 'assets/getTokenCards') {
        // 参考站数据接口（POST JSON）
        target = BACKEND + '/' + suffix;
    } else if (suffix.startsWith('trap/')) {
        // 道具 Spine / 贴图资源（trap/spine/...、trap/image/...）
        target = BACKEND + '/' + suffix;
    } else {
        // 敌人 Spine 资源（spine/<key>/...）
        target = BACKEND + '/spine/' + suffix;
    }
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
    };
    try {
        if (request.method === 'POST') {
            const contentType = request.headers.get('Content-Type') || 'application/json';
            const body = await request.text();
            const resp = await fetch(target, { method: 'POST', headers: { ...headers, 'Content-Type': contentType }, body });
            const out = new Headers(resp.headers);
            out.set('Access-Control-Allow-Origin', '*');
            return new Response(resp.body, { status: resp.status, headers: out });
        }
        const resp = await fetch(target, { headers });
        const out = new Headers();
        out.set('Content-Type', resp.headers.get('Content-Type') || 'application/octet-stream');
        out.set('Cache-Control', 'public, max-age=3600');
        return new Response(resp.body, { status: resp.status, headers: out });
    } catch (e) {
        return new Response('spine proxy error', { status: 502 });
    }
}
