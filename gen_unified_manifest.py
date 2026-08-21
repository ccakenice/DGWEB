# -*- coding: utf-8 -*-
"""gen_unified_manifest.py - 合并 __internal__ lowres + 外部 ext 成前端单一 manifest.json
输出 images/lowres/manifest.json
  { "外部URL或本地图片路径": {"hi": "images/ext/xx.jpg", "lo": "lowres/..."} }
外部URL(hdslb/prts) -> hi=本地高清文件, lo=对应低清
本地图片路径         -> hi=图片本身(NS), lo=低清
"""
import os, json, re

ROOT = os.path.dirname(os.path.abspath(__file__))
LOW = os.path.join(ROOT, 'images', 'lowres')
lowres = json.load(open(os.path.join(LOW, 'lowres.json'), encoding='utf-8'))
ext = json.load(open(os.path.join(ROOT, 'images', 'ext', 'ext-manifest.json'), encoding='utf-8'))

def lo_for(path):
    """path 是 images/xxx -> lowres/xxx，若命中内部映射返回 lowres 路径，否则 None"""
    return lowres.get(path)

out = {}
# 外部: URL -> {hi, lo}
for url, hi in ext.items():
    lo = lo_for(hi)
    out[url] = {'hi': hi, 'lo': ('images/' + lo) if lo else None}
# 本地: images/xxx -> {hi=xxx, lo=lowres}
for p, lo in lowres.items():
    if p in out:
        continue
    out[p] = {'hi': p, 'lo': ('images/' + lo) if lo else None}

mp = os.path.join(LOW, 'manifest.json')
with open(mp, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print('unified manifest entries:', len(out), '->', mp)
ext_count = sum(1 for u in ext)
print('external mapped:', ext_count)