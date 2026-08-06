# -*- coding: utf-8 -*-
"""自动同步工具：从 biligame wiki 同步集成战略/生息演算主题到 modes.json
用法：python sync_themes_auto.py [integrated-strategies|reclamation-algorithm|all]
"""
import io, json, sys, os, re, time
import urllib.request as u, urllib.parse, hashlib, subprocess
sys.stdout.reconfigure(encoding='utf-8')

HEADERS = {'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'zh-CN,zh;q=0.9'}
MODES_JSON = r'E:\WebProjects\DGWEB\modes.json'
IMG_DIR = r'E:\WebProjects\DGWEB\images\modes'

# 模式 -> biligame 页面
PAGES = {
    'integrated-strategies': ('集成战略', '集成战略'),
    'reclamation-algorithm': ('生息演算', '生息演算'),
}

def fetch_biligame(page):
    url = 'https://wiki.biligame.com/arknights/' + urllib.parse.quote(page)
    return u.urlopen(u.Request(url, headers=HEADERS), timeout=25).read().decode('utf-8', 'ignore')

def extract_titles(html):
    titles = []
    seen = set()
    for t in re.findall(r'Title_([^"\'/]+)\.png', html):
        t2 = urllib.parse.unquote(t)
        if t2 not in seen and len(t2) >= 2:
            seen.add(t2)
            titles.append(t2)
    return titles

def prts_media_url(filename):
    h = hashlib.md5(filename.encode('utf-8')).hexdigest()
    return 'https://media.prts.wiki/%s/%s/%s' % (h[0], h[:2], urllib.parse.quote(filename))

def download_icon(name):
    """从 PRTS 下载 图标_<name>.png，失败则从 biligame 的 patchwiki 下载"""
    fn = '图标_%s.png' % name
    dest = os.path.join(IMG_DIR, fn)
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        return True
    # 1. PRTS media 规则
    try:
        d = u.urlopen(u.Request(prts_media_url(fn), headers=HEADERS), timeout=12).read()
        if len(d) > 10000:
            open(dest, 'wb').write(d)
            print('  [PRTS]', fn, len(d))
            return True
    except Exception:
        pass
    return False

def sync_mode(key):
    page, _ = PAGES[key]
    print('== 同步', key, '（页面:', page, '）==')
    try:
        html = fetch_biligame(page)
    except Exception as e:
        print('  页面抓取失败:', str(e)[:50])
        return
    titles = extract_titles(html)
    print('  提取主题:', titles)
    if not titles:
        return
    # 读取 modes.json
    d = json.loads(io.open(MODES_JSON, encoding='utf-8').read())
    mode = next((m for m in d['modes'] if m['key'] == key), None)
    if not mode:
        print('  模式不存在:', key)
        return
    items = mode['groups'][0]['items']
    existing = [i['name'] for i in items]
    # 集成战略每年实装一期：新主题年份 = 现有最大年份 + 1
    max_year = max((i.get('year', 0) for i in items), default=0)
    added = 0
    for t in titles:
        if t not in existing:
            ok = download_icon(t)
            if ok:
                new_item = {"name": t, "img": "images/modes/图标_%s.png" % t, "stages": []}
                if key == 'integrated-strategies':
                    max_year = max_year + 1
                    new_item['year'] = max_year
                items.append(new_item)
                added += 1
                print('  + 添加:', t, '（year=%s）' % new_item.get('year', '-'))
            else:
                print('  ! 图标下载失败，跳过:', t)
        time.sleep(0.5)
    if added:
        json.dump(d, io.open(MODES_JSON, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('  modes.json 已更新（+%d）' % added)
    else:
        print('  无新增')
    return added

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'all'
    total = 0
    if target == 'all':
        for k in PAGES:
            total += sync_mode(k) or 0
    else:
        total += sync_mode(target) or 0
    print('完成，新增', total, '个主题')