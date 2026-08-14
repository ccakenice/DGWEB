// CF Pages Function：Spine 动画资源同源代理（GitHub 资源版）
//
// 资源源（2026-08-14 确认）：参考站后端开源在 GitHub
//   serine-qing/MapSimulatorBackend（master 分支），
//   敌人 Spine：public/spine/<key>/enemy_<key>.skel|.atlas|.png
//   场地道具：  public/trap/...
// 直接走 jsDelivr / raw.githubusercontent（HTTPS + CORS 全开），
// 不再依赖参考站 HTTP 后端（其防盗链只放行裸 IP Host，Workers 无法伪造）。
// 数据接口（getMeshsKey / getTrapsKey / getTokenCards）仍转发参考站后端：
//   Workers 不能 fetch 裸 IP，但 sslip.io 域名可通（仅数据接口无防盗链）。
const ASSET_HOSTS = [
    'https://cdn.jsdelivr.net/gh/serine-qing/MapSimulatorBackend@master/public',
    'https://raw.githubusercontent.com/serine-qing/MapSimulatorBackend/master/public',
];
const DATA_BACKENDS = [
    'http://152-136-189-98.sslip.io:3000',
    'http://152-136-189-98.nip.io:3000',
];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';

async function fetchAsset(relPath) {
    let lastErr = null;
    for (const base of ASSET_HOSTS) {
        try {
            const resp = await fetch(base + '/' + relPath, {
                headers: { 'User-Agent': UA, 'Accept': '*/*' },
            });
            const out = new Headers();
            out.set('Content-Type', resp.headers.get('Content-Type') || 'application/octet-stream');
            out.set('Cache-Control', 'public, max-age=86400');
            out.set('Access-Control-Allow-Origin', '*');
            return new Response(resp.body, { status: resp.status, headers: out });
        } catch (e) {
            lastErr = e;
        }
    }
    return new Response('asset proxy error: ' + ((lastErr && lastErr.message) || lastErr), { status: 502 });
}

async function fetchData(path, bodyText, contentType) {
    let lastErr = null;
    for (const base of DATA_BACKENDS) {
        try {
            const resp = await fetch(base + '/' + path, {
                method: 'POST',
                headers: {
                    'User-Agent': UA,
                    'Content-Type': contentType || 'application/json',
                    'Accept': '*/*',
                },
                body: bodyText,
            });
            const out = new Headers(resp.headers);
            out.set('Access-Control-Allow-Origin', '*');
            return new Response(resp.body, { status: resp.status, headers: out });
        } catch (e) {
            lastErr = e;
        }
    }
    return new Response('data proxy error: ' + ((lastErr && lastErr.message) || lastErr), { status: 502 });
}

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const suffix = url.pathname.replace(/^\/spine\//, '');
    if (suffix === 'assets/getMeshsKey' || suffix === 'assets/getTrapsKey' || suffix === 'assets/getTokenCards') {
        const bodyText = request.method === 'POST' ? await request.text() : null;
        return await fetchData(suffix, bodyText, request.headers.get('Content-Type'));
    }
    if (suffix.startsWith('trap/')) {
        // suffix 已含 trap/ 前缀，GitHub 路径为 public/trap/...，直接拼接
        return await fetchAsset(suffix);
    }
    return await fetchAsset('spine/' + suffix);
}
