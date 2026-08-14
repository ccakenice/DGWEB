// CF Pages Function：Spine 动画资源同源代理（raw TCP 版）
//
// 背景（2026-08-14 两次失败后确认）：
//  1. Workers 子请求不允许直接 fetch 裸 IP（返回 403 "error code: 1003"）；
//  2. 改用 sslip.io/nip.io 域名后，数据接口 OK，但静态资源（atlas/skel/png）
//     被后端防盗链按 Host 白名单拦截（HTTP 566），白名单只认 152.136.189.98；
//  3. Workers fetch() 的 Host 头由 URL 决定，无法覆盖。
// 解决：用 cloudflare:sockets 建立原始 TCP 连接，自行构造 HTTP/1.1 请求，
//       Host 写死为 152.136.189.98:3000，绕开上面两条限制。
import { connect } from 'cloudflare:sockets';

const HOST = '152.136.189.98';
const PORT = 3000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';

async function socketFetch(method, path, reqHeaders, bodyText) {
    const socket = connect({ hostname: HOST, port: PORT });
    const encoder = new TextEncoder();
    let timer = null;
    try {
        const head = [
            `${method} ${path} HTTP/1.1`,
            `Host: ${HOST}:${PORT}`,
            'Connection: close',
            'User-Agent: ' + UA,
            'Accept: */*',
        ];
        if (method === 'POST') {
            const body = bodyText || '';
            head.push('Content-Type: ' + (reqHeaders.get('Content-Type') || 'application/json'));
            head.push('Content-Length: ' + encoder.encode(body).length);
            head.push('');
            head.push('');
            const writer = socket.writable.getWriter();
            await writer.write(encoder.encode(head.join('\r\n') + body));
            try { await writer.close(); } catch (e) { /* ignore */ }
        } else {
            head.push('');
            head.push('');
            const writer = socket.writable.getWriter();
            await writer.write(encoder.encode(head.join('\r\n')));
            try { await writer.close(); } catch (e) { /* ignore */ }
        }

        const reader = socket.readable.getReader();
        const chunks = [];
        let size = 0;
        timer = setTimeout(() => { try { socket.close(); } catch (e) { /* ignore */ } }, 15000);
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            chunks.push(value);
            size += value.length;
        }
        clearTimeout(timer);
        timer = null;

        const all = new Uint8Array(size);
        let off = 0;
        for (const c of chunks) {
            all.set(c, off);
            off += c.length;
        }
        const headText = new TextDecoder().decode(all.subarray(0, 65536));
        const sep = headText.indexOf('\r\n\r\n');
        if (sep < 0) {
            throw new Error('bad response: no header separator, got ' + size + 'B: ' +
                new TextDecoder().decode(all.subarray(0, 160)).replace(/[\r\n]/g, ' ') + '...');
        }
        const lines = headText.slice(0, sep).split('\r\n');
        const status = parseInt((lines[0] || '').split(' ')[1], 10) || 502;
        const out = new Headers();
        for (let i = 1; i < lines.length; i++) {
            const idx = lines[i].indexOf(':');
            if (idx > 0) out.append(lines[i].slice(0, idx).trim(), lines[i].slice(idx + 1).trim());
        }
        out.set('Access-Control-Allow-Origin', '*');
        out.delete('Transfer-Encoding');
        out.delete('Connection');
        const body = all.subarray(sep + 4);
        return new Response(body, { status, headers: out });
    } finally {
        if (timer) clearTimeout(timer);
        try { socket.close(); } catch (e) { /* ignore */ }
    }
}

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const suffix = url.pathname.replace(/^\/spine\//, '');
    let path;
    if (suffix === 'assets/getMeshsKey' || suffix === 'assets/getTrapsKey' || suffix === 'assets/getTokenCards') {
        path = '/' + suffix;
    } else if (suffix.startsWith('trap/')) {
        path = '/' + suffix;
    } else {
        path = '/spine/' + suffix;
    }
    const bodyText = request.method === 'POST' ? await request.text() : null;
    try {
        return await socketFetch(request.method, path, request.headers, bodyText);
    } catch (e) {
        return new Response('spine proxy error: ' + (e && e.message ? e.message : 'unknown'), {
            status: 502,
            headers: { 'Access-Control-Allow-Origin': '*' },
        });
    }
}
