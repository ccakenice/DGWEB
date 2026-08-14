# -*- coding: utf-8 -*-
"""
download_ext.py - 下载外部图片资源到 images/ext/
- B站视频封面 (i*.hdslb.com, 来自 latest.json)      -> images/ext/covers/{md5}.{ext}
- PRTS 干员头像 (media.prts.wiki, 从 html 提取)      -> images/ext/avatars/{解码文件名}
输出: images/ext/ext.json  外部URL -> 本地文件名 映射 (前端做 LQIP 用)
用法: python download_ext.py
"""
import os, re, json, hashlib, urllib.request, urllib.error, urllib.parse, concurrent.futures

ROOT = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.join(ROOT, 'images', 'ext')
COV = os.path.join(EXT, 'covers')
AVA = os.path.join(EXT, 'avatars')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'}

def norm(u):
    """protocol-relative -> https"""
    if u.startswith('//'):
        return 'https:' + u
    return u

def bili_covers():
    urls = {}
    d = json.load(open(os.path.join(ROOT, 'latest.json'), encoding='utf-8'))
    v = d['data'] if isinstance(d.get('data'), list) else d.get('videos') or []
    for it in v:
        c = it.get('cover') or it.get('pic') or (it.get('media') or {}).get('thumbnail')
        if c:
            c = norm(c)
            if re.search(r'hdslb\.com', c):
                urls[c] = None
    return urls

def prts_urls():
    pat = re.compile(r'https://media\.prts\.wiki/[^"\s]+')
    urls = {}
    for fn in ['aliases.html', 'ranking.html']:
        s = open(os.path.join(ROOT, fn), encoding='utf-8').read()
        for u in pat.findall(s):
            urls[u] = None
    return urls

def fetch(url, dst):
    req = urllib.request.Request(url, headers=dict(UA, Referer='https://www.bilibili.com/'))
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

def main():
    os.makedirs(COV, exist_ok=True)
    os.makedirs(AVA, exist_ok=True)
    manifest = {}

    jobs = []
    for u in bili_covers():
        fn = 'c_' + hashlib.md5(u.encode()).hexdigest()[0:12] + '.jpg'
        dst = os.path.join(COV, fn)
        jobs.append((u, dst, 'cover'))
    for u in prts_urls():
        base = os.path.basename(urllib.request.urlparse(u).path)
        m = hashlib.md5(u.encode()).hexdigest()[0:12]
        fn = 'a_' + m + '_' + os.path.basename(base) if base else 'a_' + m + '.png'
        dst = os.path.join(AVA, fn)
        jobs.append((u, dst, 'avatar'))

    done = 0; nfail = 0; fail = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(fetch, u, dst): (u, dst) for u, dst, _ in jobs}
        for fut in concurrent.futures.as_completed(futs):
            u, dst = futs[fut]
            try:
                data = fut.result()
                if len(data) < 200 or b'<html' in data[:2000].lower():
                    raise ValueError('bad payload %d' % len(data))
                with open(dst, 'wb') as f:
                    f.write(data)
                manifest[norm(u)] = os.path.relpath(dst, ROOT).replace('\\', '/')
                done += 1
            except Exception as e:
                nfail += 1
                fail.append((str(e)[:80], u))
                print('FAIL %s  %s' % (u, str(e)[:80]))
            if (done + nfail) % 50 == 0:
                print('  ... %d/%d (fail=%d)' % (done + nfail, len(jobs), nfail))

    mp = os.path.join(EXT, 'ext-manifest.json')
    with open(mp, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=0)
    print('\n=== done: total=%d downloaded=%d fail=%d manifest=%d -> %s' % (len(jobs), done, nfail, len(manifest), mp))

if __name__ == '__main__':
    main()