import json, hashlib, time, urllib.request, urllib.parse, urllib.error, http.cookiejar, sys, os, base64, re, tempfile, ctypes

LOCK_FILE = os.path.join(tempfile.gettempdir(), 'dgweb_fetch_bili.lock')

def _pid_alive(pid):
    """Windows 下检查进程是否存活（os.kill(pid,0) 在 Win 不支持）。"""
    try:
        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        h = ctypes.windll.kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, int(pid))
        if h:
            ctypes.windll.kernel32.CloseHandle(h)
            return True
        return False
    except Exception:
        return False

def acquire_lock():
    """单实例锁：已有一个实例在跑则返回 None（本实例直接退出），否则返回锁描述符。"""
    try:
        fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode())
        return fd
    except FileExistsError:
        # 检查持有者是否还活着（避免异常退出残留死锁）
        try:
            with open(LOCK_FILE) as f:
                pid = int(f.read().strip())
            if _pid_alive(pid):
                return None
        except (OSError, ValueError):
            pass
        try:
            os.unlink(LOCK_FILE)
        except OSError:
            pass
        try:
            fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode())
            return fd
        except FileExistsError:
            return None

def release_lock(fd):
    if fd is not None:
        try:
            os.close(fd)
            os.unlink(LOCK_FILE)
        except OSError:
            pass

UID = '3546373951588920'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

# 安全：所有密钥从环境变量读取，不硬编码。
#   BILI_SESSDATA - B站登录 Cookie 中的 SESSDATA（留空则匿名请求，限流风险更高）
#   GH_TOKEN      - GitHub 上传 token（留空则跳过上传）
SESSDATA = os.environ.get('BILI_SESSDATA', '')
GITHUB_TOKEN = os.environ.get('GH_TOKEN', '')
GITHUB_OWNER = 'ccakenice'
GITHUB_REPO = 'bili-sync'
GITHUB_PATH = 'latest.json'

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'latest.json')

MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
]

def basename(url):
    p = url.rsplit('/', 1)[-1]
    return p.rsplit('.', 1)[0] if '.' in p else p

def http_get(opener, url, headers=None, timeout=30):
    req = urllib.request.Request(url, headers=headers or {})
    with opener.open(req, timeout=timeout) as r:
        return r.read().decode('utf-8')

def get_mixin_key(cookie_str):
    opener = urllib.request.build_opener()
    headers = {'User-Agent': UA, 'Referer': 'https://www.bilibili.com/'}
    if cookie_str:
        headers['Cookie'] = cookie_str
    raw = http_get(opener, 'https://api.bilibili.com/x/web-interface/nav', headers)
    j = json.loads(raw)
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

def fetch_videos(max_items=600):
    # get buvid3/buvid4 from spi
    opener = urllib.request.build_opener()
    b3 = b4 = ''
    try:
        raw = http_get(opener, 'https://api.bilibili.com/x/frontend/finger/spi', {'User-Agent': UA})
        spi = json.loads(raw)
        b3 = spi.get('data', {}).get('b_3', '')
        b4 = spi.get('data', {}).get('b_4', '')
    except Exception:
        pass
    # warm up homepage using cookie jar
    cj = http.cookiejar.CookieJar()
    opener2 = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    opener2.addheaders = [('User-Agent', UA), ('Accept', 'text/html,application/xhtml+xml')]
    try:
        opener2.open('https://www.bilibili.com/', timeout=20).read()
    except Exception:
        pass
    extra_cookies = '; '.join(f'{c.name}={c.value}' for c in cj)
    cookie_parts = []
    if b3:
        cookie_parts.append(f'buvid3={b3}; buvid4={b4}')
    if extra_cookies:
        cookie_parts.append(extra_cookies)
    if SESSDATA:
        cookie_parts.append('SESSDATA=' + SESSDATA)
    cookie_str = '; '.join(cookie_parts)
    # get wbi mixin key
    mixin = get_mixin_key(cookie_str)
    headers = {
        'User-Agent': UA,
        'Referer': 'https://www.bilibili.com/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cookie': cookie_str if cookie_str else ''
    }
    all_videos = {}
    last_err = ''
    stop_all = False
    kw = urllib.parse.quote('低配挂机研讨会')
    # use search API to page through ALL videos of this up (arc/search caps at 180)
    for pn in range(1, 13):
        q = sign({'search_type': 'video', 'keyword': '低配挂机研讨会', 'order': 'pubdate', 'page': str(pn), 'page_size': '50'}, mixin)
        url = 'https://api.bilibili.com/x/web-interface/wbi/search/type?' + q
        page_done = False
        for attempt in range(3):
            try:
                raw = http_get(opener2, url, headers, timeout=30)
                d = json.loads(raw)
                if d.get('code') == 0:
                    page = d['data'].get('result') or []
                    for v in page:
                        if str(v.get('mid')) == UID and v.get('bvid'):
                            all_videos[v['bvid']] = v
                    page_done = True
                    if not page or len(page) < 50 or len(all_videos) >= max_items:
                        stop_all = True
                    break
                last_err = f"code={d.get('code')} {d.get('message', '')}"
                print(f"[pn{pn} attempt {attempt+1}] {last_err}")
            except urllib.error.HTTPError as e:
                last_err = f"HTTP {e.code}"
                print(f"[pn{pn} attempt {attempt+1}] {last_err}")
                if e.code == 412:
                    stop_all = True
                    break
            except Exception as e:
                last_err = str(e)
                print(f"[pn{pn} attempt {attempt+1}] {last_err}")
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
        if stop_all or not page_done:
            break
        if len(all_videos) >= max_items or len(page) < 50:
            break
        time.sleep(1.5)
    if len(all_videos) == 0 and last_err:
        raise RuntimeError(last_err)
    vlist = list(all_videos.values())
    vlist.sort(key=lambda x: x.get('pubdate', 0), reverse=True)
    return vlist[:max_items]

def github_upload(content_bytes, repo=None):
    if not GITHUB_TOKEN:
        print('skip github upload (no GH_TOKEN)')
        return False
    repo = repo or GITHUB_REPO
    b64 = base64.b64encode(content_bytes).decode()
    # get existing sha (needed to overwrite)
    sha = None
    req = urllib.request.Request(
        f'https://api.github.com/repos/{GITHUB_OWNER}/{repo}/contents/{GITHUB_PATH}',
        headers={'Authorization': f'token {GITHUB_TOKEN}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'bili-sync'}
    )
    try:
        r = urllib.request.urlopen(req, timeout=25)
        sha = json.loads(r.read().decode()).get('sha')
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print('github get sha error:', e.code)
    body = json.dumps({'message': 'chore: update latest videos ' + time.strftime('%Y-%m-%d %H:%M'), 'content': b64, 'sha': sha}).encode()
    req2 = urllib.request.Request(
        f'https://api.github.com/repos/{GITHUB_OWNER}/{repo}/contents/{GITHUB_PATH}',
        data=body, method='PUT',
        headers={'Authorization': f'token {GITHUB_TOKEN}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'bili-sync', 'Content-Type': 'application/json'}
    )
    r2 = urllib.request.urlopen(req2, timeout=25)
    return r2.status == 201 or r2.status == 200

def fetch_pages(vlist, max_workers=6):
    # fetch pagelist for each video (multi-P info)
    pages_map = {}
    import threading
    from concurrent.futures import ThreadPoolExecutor, as_completed

    def get_pages(v):
        bvid = v.get('bvid', '')
        if not bvid:
            return bvid, []
        for attempt in range(3):
            try:
                opener = urllib.request.build_opener()
                headers = {'User-Agent': UA, 'Referer': 'https://www.bilibili.com/'}
                if SESSDATA:
                    headers['Cookie'] = 'SESSDATA=' + SESSDATA
                raw = http_get(opener, f'https://api.bilibili.com/x/player/pagelist?bvid={bvid}', headers, timeout=20)
                d = json.loads(raw)
                if d.get('code') == 0:
                    pages = [{'page': p.get('page', 1), 'part': clean_html(p.get('part', '')), 'duration': p.get('duration', 0)} for p in (d.get('data') or [])]
                    return bvid, pages
            except urllib.error.HTTPError as e:
                if e.code == 412:
                    return bvid, []
            except Exception:
                pass
            time.sleep(2 * (attempt + 1))
        return bvid, []

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        futures = {ex.submit(get_pages, v): v for v in vlist}
        for i, fut in enumerate(as_completed(futures), 1):
            try:
                bvid, pages = fut.result()
                if pages:
                    pages_map[bvid] = pages
            except Exception:
                pass
            if i % 100 == 0:
                print(f'pages fetched {i}/{len(vlist)}')
            time.sleep(0.15)
    return pages_map

def fetch_stats():
    # returns dict with fans / videos / likes counts
    stats = {}
    opener = urllib.request.build_opener()
    headers = {'User-Agent': UA, 'Referer': 'https://space.bilibili.com/' + UID}
    if SESSDATA:
        headers['Cookie'] = 'SESSDATA=' + SESSDATA
    try:
        raw = http_get(opener, f'https://api.bilibili.com/x/web-interface/card?mid={UID}&photo=false', headers)
        d = json.loads(raw)
        if d.get('code') == 0 and d.get('data'):
            card = d['data'].get('card', {})
            stats['fans'] = card.get('fans', 0)
            stats['videos'] = d['data'].get('archive_count', 0)
            stats['likes'] = d['data'].get('like_num', 0)
    except Exception as e:
        print('stats card error:', e)
    return stats

def clean_html(s):
    if not s:
        return ''
    s = re.sub(r'<[^>]+>', '', s)
    return s.strip()

def load_cache():
    try:
        return json.load(open(OUT, encoding='utf-8'))
    except Exception:
        return None

def main():
    lock_fd = acquire_lock()
    if lock_fd is None:
        print('another fetch_bili.py instance is running, skip')
        sys.exit(0)
    try:
        _main_inner()
    finally:
        release_lock(lock_fd)

def _main_inner():
    # 上次成功的数据作为兜底缓存
    cache = load_cache() or {}
    old_stats = cache.get('stats') or {}
    old_items = cache.get('data') or []
    # 获取统计（失败则用缓存）
    stats = fetch_stats() or old_stats
    items = []
    try:
        vlist = fetch_videos()
        print('fetching pagelist for', len(vlist), 'videos...')
        pages_map = fetch_pages(vlist)
        fresh = [{
            'title': clean_html(v.get('title', '')),
            'link': 'https://www.bilibili.com/video/' + v.get('bvid', ''),
            'bvid': v.get('bvid', ''),
            'pubDate': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(v.get('pubdate', v.get('created', 0)))),
            'media': {'thumbnail': v.get('pic', '')},
            'description': clean_html(v.get('description', '') or v.get('desc', '')),
            'stat': {
                'play': v.get('play', 0),
                'danmaku': v.get('danmaku', 0),
                'review': v.get('review', 0),
                'favorite': v.get('favorites', 0),
                'like': v.get('like', 0),
            },
            'duration': v.get('duration', 0),
            'typename': v.get('typename', ''),
            'tags': (v.get('tag') or '').split(',') if v.get('tag') else [],
            'pages': pages_map.get(v.get('bvid', ''), []),
        } for v in vlist]
        print('fetched', len(fresh), 'videos')
        # 与旧缓存合并去重，避免分页抖动导致数据缩量
        by_link = {}
        for it in (old_items + fresh):
            by_link[it['link']] = it
        items = sorted(by_link.values(), key=lambda x: x.get('pubDate', ''), reverse=True)
        print('merged to', len(items), 'videos (cache was', len(old_items), ')')
    except Exception as e:
        print('fetch_videos FAILED:', e)
        items = old_items
        print('kept', len(items), 'cached videos')
    if not items:
        print('no videos to publish, skip')
        sys.exit(0)
    content = json.dumps({'code': 0, 'data': items, 'stats': stats}, ensure_ascii=False, indent=2).encode('utf-8')
    # save local copy
    with open(OUT, 'wb') as f:
        f.write(content)
    # 上传：本地手工运行时把 GH_TOKEN 设为环境变量即可。
    #   CI（GitHub Actions）模式：GITHUB_REPO_SYNC=0 时只写本地，由 workflow 统一提交。
    if os.environ.get('GITHUB_REPO_SYNC', '1') != '0':
        # upload to github (bili-sync repo for CDN, plus DGWEB repo for site hosting)
        for repo in ('bili-sync', 'DGWEB'):
            try:
                ok = github_upload(content, repo=repo)
                print(f'github upload [{repo}]:', 'OK' if ok else 'FAIL')
            except Exception as e:
                print(f'github upload [{repo}] error:', e)

if __name__ == '__main__':
    main()