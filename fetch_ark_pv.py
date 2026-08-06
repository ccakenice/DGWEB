# -*- coding: utf-8 -*-
"""抓取明日方舟官方空间(161775300)最新带「先导PV」关键词的视频，写入 ark_pv.json
用法：python fetch_ark_pv.py [--keyword 先导PV]
依赖：环境变量 BILI_SESSDATA（可选，建议提供以降低风控）
输出：ark_pv.json { code:0, video:{...} } 或 { code:-1, message }
"""
import json, hashlib, time, urllib.request, urllib.parse, urllib.error, http.cookiejar, sys, os, re, base64

UID = '161775300'  # 明日方舟官方
KEYWORD = sys.argv[sys.argv.index('--keyword') + 1] if '--keyword' in sys.argv else '先导PV'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
SESSDATA = os.environ.get('BILI_SESSDATA', '')
GITHUB_TOKEN = os.environ.get('GH_TOKEN', '')
GITHUB_OWNER = 'ccakenice'
GITHUB_REPO = 'bili-sync'
GITHUB_PATH = 'ark_pv.json'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ark_pv.json')

MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
]

def basename(url):
    p = url.rsplit('/', 1)[-1]
    return p.rsplit('.', 1)[0] if '.' in p else p

def http_get(url, headers=None, timeout=25):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8')

def clean_html(s):
    return re.sub(r'<[^>]+>', '', s or '').strip()

def github_upload(content_bytes, repo=None):
    if not GITHUB_TOKEN:
        print('skip github upload (no GH_TOKEN)')
        return False
    repo = repo or GITHUB_REPO
    b64 = base64.b64encode(content_bytes).decode()
    sha = None
    req = urllib.request.Request(
        f'https://api.github.com/repos/{GITHUB_OWNER}/{repo}/contents/{GITHUB_PATH}',
        headers={'Authorization': f'token {GITHUB_TOKEN}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'ark-sync'}
    )
    try:
        r = urllib.request.urlopen(req, timeout=25)
        sha = json.loads(r.read().decode()).get('sha')
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print('github get sha error:', e.code)
    body = json.dumps({'message': 'chore: update ark pv ' + time.strftime('%Y-%m-%d %H:%M'), 'content': b64, 'sha': sha}).encode()
    req2 = urllib.request.Request(
        f'https://api.github.com/repos/{GITHUB_OWNER}/{repo}/contents/{GITHUB_PATH}',
        data=body, method='PUT',
        headers={'Authorization': f'token {GITHUB_TOKEN}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'ark-sync', 'Content-Type': 'application/json'}
    )
    r2 = urllib.request.urlopen(req2, timeout=25)
    return r2.status in (200, 201)

def build_cookie_str():
    """完整指纹 cookie：cookie jar warm-up 首页 + spi buvid3/4 + SESSDATA（复刻 fetch_bili.py 成功策略）"""
    parts = []
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener.addheaders = [('User-Agent', UA), ('Accept', 'text/html,application/xhtml+xml')]
    try:
        opener.open('https://www.bilibili.com/', timeout=20).read()
    except Exception:
        pass
    extra = '; '.join(f'{c.name}={c.value}' for c in cj)
    if extra:
        parts.append(extra)
    try:
        spi = json.loads(http_get('https://api.bilibili.com/x/frontend/finger/spi', {'User-Agent': UA}))
        d = spi.get('data', {})
        if d.get('b_3'):
            parts.append(f"buvid3={d['b_3']}; buvid4={d.get('b_4','')}")
    except Exception:
        pass
    if SESSDATA:
        parts.append('SESSDATA=' + SESSDATA)
    return '; '.join(parts)

def get_mixin_key(cookie_str):
    headers = {'User-Agent': UA, 'Referer': 'https://www.bilibili.com/'}
    if cookie_str: headers['Cookie'] = cookie_str
    j = json.loads(http_get('https://api.bilibili.com/x/web-interface/nav', headers))
    img = basename(j['data']['wbi_img']['img_url'])
    sub = basename(j['data']['wbi_img']['sub_url'])
    s = img + sub
    return ''.join(s[i] for i in MIXIN_KEY_ENC_TAB)[:32]

def sign(params, mixin):
    p = dict(params)
    p['wts'] = int(time.time())
    q = '&'.join(k + '=' + urllib.parse.quote(str(v), safe='') for k, v in sorted(p.items()))
    wrid = hashlib.md5((q + mixin).encode('utf-8')).hexdigest()
    return q + '&w_rid=' + wrid

def fetch_latest_pv():
    cookie_str = build_cookie_str()
    mixin = get_mixin_key(cookie_str)
    headers = {'User-Agent': UA, 'Referer': 'https://space.bilibili.com/' + UID,
               'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'zh-CN,zh;q=0.9'}
    if cookie_str: headers['Cookie'] = cookie_str

    # 搜索该 UP 的视频，关键词+mid 过滤
    kw = urllib.parse.quote(KEYWORD)
    last_err = ''
    for pn in range(1, 4):
        for attempt in range(3):
            try:
                q = sign({'search_type': 'video', 'keyword': KEYWORD, 'order': 'pubdate',
                          'page': str(pn), 'page_size': '50'}, mixin)
                raw = http_get('https://api.bilibili.com/x/web-interface/wbi/search/type?' + q, headers)
                d = json.loads(raw)
                if d.get('code') == 0:
                    for v in (d.get('data', {}).get('result') or []):
                        if str(v.get('mid')) == UID and v.get('bvid'):
                            return v
                    last_err = 'no match in page ' + str(pn)
                    break
                last_err = f"code={d.get('code')} {d.get('message','')}"
            except urllib.error.HTTPError as e:
                last_err = f"HTTP {e.code}"
                if e.code in (412, 403):
                    break
            except Exception as e:
                last_err = str(e)
            time.sleep(3 * (attempt + 1))
        time.sleep(1.5)
    raise RuntimeError('搜索失败: ' + last_err)

def fetch_playurl(bvid, cid, quality='112'):
    """抓取视频直链（登录态可拿高清；游客降级）。quality: 112=1080P+ / 80=1080P / 64=720P / 32=480P"""
    cookie_str = build_cookie_str()
    headers = {'User-Agent': UA, 'Referer': 'https://www.bilibili.com/video/' + bvid,
               'Accept': 'application/json, text/plain, */*'}
    if cookie_str: headers['Cookie'] = cookie_str
    last = 'unknown'
    mixin = None
    try:
        mixin = get_mixin_key(cookie_str)
    except Exception as e:
        last = 'mixin:' + str(e)
    for qn in (quality, '80', '64', '32'):
        endpoints = []
        if mixin:
            params = {'bvid': bvid, 'cid': cid, 'fnval': '4048', 'fnver': 0, 'fourk': 1, 'qn': qn}
            endpoints.append(('wbi', 'https://api.bilibili.com/x/player/wbi/playurl?' + sign(params, mixin)))
        endpoints.append(('plain', 'https://api.bilibili.com/x/player/playurl?bvid=%s&cid=%s'
                          '&fnval=4048&fnver=0&fourk=1&qn=%s' % (bvid, cid, qn)))
        for tag, url in endpoints:
            try:
                raw = http_get(url, headers)
                d = json.loads(raw)
                if d.get('code') != 0:
                    last = f"[{tag}] code={d.get('code')} {d.get('message','')}"
                    continue
                data = d.get('data') or {}
                durls = data.get('durl') or []
                if durls:
                    return {'type': 'durl', 'quality': data.get('quality'),
                            'url': durls[0].get('url', ''), 'backup': [x.get('url') for x in durls[1:] or []],
                            'size': durls[0].get('size')}
                dash = data.get('dash') or {}
                vids = dash.get('video') or []
                if vids:
                    best = max(vids, key=lambda x: x.get('id', 0))
                    return {'type': 'dash', 'quality': best.get('id'),
                            'url': best.get('baseUrl', ''), 'backup': best.get('backupUrl') or [],
                            'bandwidth': best.get('bandwidth')}
            except Exception as e:
                last = f"[{tag}] {e}"
        time.sleep(1)
    print('playurl failed:', last)
    return None

def main():
    try:
        v = fetch_latest_pv()
        pages = []
        try:
            raw = http_get(f"https://api.bilibili.com/x/player/pagelist?bvid={v['bvid']}",
                           {'User-Agent': UA, 'Referer': 'https://www.bilibili.com/'})
            d = json.loads(raw)
            if d.get('code') == 0:
                pages = [{'page': p.get('page', 1), 'part': clean_html(p.get('part', '')),
                          'duration': p.get('duration', 0), 'cid': p.get('cid', 0)} for p in (d.get('data') or [])]
        except Exception:
            pass
        # 抓直链（用第一个 P 的 cid）
        stream = None
        if pages:
            try:
                stream = fetch_playurl(v['bvid'], pages[0]['cid'])
                if stream:
                    print('stream OK: quality=%s type=%s' % (stream.get('quality'), stream.get('type')))
            except Exception as e:
                print('stream failed:', e)
        video = {
            'bvid': v['bvid'],
            'aid': v.get('aid', 0),
            'title': clean_html(v.get('title', '')),
            'link': 'https://www.bilibili.com/video/' + v['bvid'],
            'pubDate': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(v.get('pubdate', 0))),
            'media': {'thumbnail': v.get('pic', '')},
            'duration': v.get('duration', 0),
            'pages': pages,
            'stream': stream,
        }
        content = json.dumps({'code': 0, 'video': video, 'updated': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                              'keyword': KEYWORD, 'uid': UID}, ensure_ascii=False, indent=2)
        with open(OUT, 'w', encoding='utf-8') as f:
            f.write(content)
        print('OK:', video['bvid'], video['title'][:60])
        if pages:
            print('pages:', len(pages), 'first cid:', pages[0].get('cid'))
        if os.environ.get('GITHUB_REPO_SYNC', '1') != '0':
            for repo in ('bili-sync', 'DGWEB'):
                try:
                    ok = github_upload(content.encode('utf-8'), repo=repo)
                    print(f'github upload [{repo}]:', 'OK' if ok else 'FAIL')
                except Exception as e:
                    print(f'github upload [{repo}] error:', e)
    except Exception as e:
        content = json.dumps({'code': -1, 'message': str(e)}, ensure_ascii=False)
        with open(OUT, 'w', encoding='utf-8') as f:
            f.write(content)
        print('FAILED:', e)
        sys.exit(1)

if __name__ == '__main__':
    main()