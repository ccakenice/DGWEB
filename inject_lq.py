# -*- coding: utf-8 -*-
"""inject_lq.js.py - 全站 html 注入 img-progressive.js"""
import os, re, glob, io

ROOT = r'E:\WebProjects\DGWEB'
MARK = '<script src="js/img-progressive.js"></script>'
r = re.compile(r'<js-img-progressive>', re.I)

htmls = sorted(glob.glob(os.path.join(ROOT, '*.html')))
changed = []
for h in htmls:
    s = open(h, encoding='utf-8').read()
    if 'img-progressive.js' in s:
        done.append((h, 'already'))
        continue
    # 插到 </body> 之前
    i = s.rfind('</body>')
    if i == -1:
        s += '\n' + MARK + '\n'
    else:
        s = s[:i] + MARK + '\n' + s[i:]
    with open(h, 'w', encoding='utf-8') as f:
        f.write(s)
    changed.append((h, 'injected'))

print('changed:', len(changed))
for h, st in changed: print('  ', st, os.path.basename(h))