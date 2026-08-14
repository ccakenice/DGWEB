# -*- coding: utf-8 -*-
"""
gen_lowres.py - 为 images/ 下所有图片生成低分辨率占位版本（LQIP）
输出目录: images/lowres/<同目录结构>/<同文件名同扩展>
- 无透明像素: 调小并转 JPG (quality=72)
- 有透明像素: 调小保留 PNG (optimize)
- 保持与原图完全相同的宽高比 -> 页面 CSS width/height:100% 拉回原显示尺寸, 无变形/闪烁
- 跳过 < 25KB 的小图 (收益低)
用法: python gen_lowres.py
"""
import os
import json
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'images')
OUT = os.path.join(SRC, 'lowres')
MAX_W = 480          # 低清占位最大宽度
JPEG_Q = 72
SKIP_BYTES = 25 * 1024
IMAGE_EXT = {'.png', '.jpg', '.jpeg'}

def has_alpha(img):
    if img.mode in ('RGBA', 'LA', 'PA'):
        if 'A' in img.getbands():
            alpha = img.getchannel('A')
            if alpha.getextrema()[0] < 255:
                return True
    if img.mode == 'P':
        if 'transparency' in img.info:
            return True
    return False

def process(src_path, rel):
    base, ext = os.path.splitext(src_path)
    ext = ext.lower()
    if ext not in IMAGE_EXT:
        return None
    size = os.path.getsize(src_path)
    if size < SKIP_BYTES:
        return ('skip-small', rel, size)
    try:
        img = Image.open(src_path)
        img.load()
    except Exception as e:
        return ('error-open', rel, str(e))

    w, h = img.size
    if w <= MAX_W * 0.6 and h <= MAX_W * 0.6 and size <= 120 * 1024:
        return ('skip-small', rel, size)

    scale = min(1.0, MAX_W / w)
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    img2 = img.resize((nw, nh), Image.LANCZOS)

    dst = os.path.join(OUT, rel)
    out_dir = os.path.dirname(dst)
    os.makedirs(out_dir, exist_ok=True)

    alpha = has_alpha(img)
    if alpha:
        try:
            img2 = img2.quantize(colors=240, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
        except Exception:
            pass
        img2.save(dst, 'PNG', optimize=True)
        fmt = 'png(alpha)'
    else:
        if img2.mode not in ('RGB', 'L'):
            img2 = img2.convert('RGB')
        jpg = os.path.splitext(dst)[0] + '.jpg'
        img2.save(jpg, 'JPEG', quality=JPEG_Q, optimize=True, progressive=True)
        dst = jpg
        fmt = 'jpg'
    newsize = os.path.getsize(dst)
    img.close(); img2.close()
    return ('ok', rel, size, newsize, (w, h), (nw, nh), fmt, dst)

def main():
    hits = {'ok': [], 'skip': [], 'fail': []}
    manifest = {}
    for dp, _, fn in os.walk(SRC):
        if 'lowres' in dp.split(os.sep):
            continue
        for f in fn:
            ext = os.path.splitext(f)[1].lower()
            if ext not in IMAGE_EXT:
                continue
            src_path = os.path.join(dp, f)
            rel = os.path.relpath(src_path, SRC)
            dst = os.path.join(OUT, rel)
            if os.path.exists(dst) or os.path.exists(os.path.splitext(dst)[0] + '.jpg'):
                continue
            r = process(src_path, rel)
            if r[0] == 'ok':
                hits['ok'].append(r)
            elif r[0] == 'skip-small':
                hits['skip'].append(r)
            else:
                hits['fail'].append(r)

    for r in hits['ok']:
        _, rel, _, ns, ow, nw, fmt, dst_path = r
        low_rel = 'lowres/' + os.path.relpath(dst_path, OUT).replace('\\', '/')
        manifest['images/' + rel.replace('\\', '/')] = low_rel
        print('GEN[%s] %-75s -> %7d bytes  (%dx%d -> %dx%d)' % (fmt, rel, ns, ow[0], ow[1], nw[0], nw[1]))
    for r in hits['skip']:
        print('SKIP %-85s (%.1fKB)' % (r[1], r[2] / 1024))
    for r in hits['fail']:
        print('FAIL %-85s %s' % (r[1], r[2]))

    # 重建完整清单(含 skips 用原图)
    for dp, _, fn in os.walk(SRC):
        if 'lowres' in dp.split(os.sep):
            continue
        for f in fn:
            ext = os.path.splitext(f)[1].lower()
            if ext not in IMAGE_EXT:
                continue
            src_path = os.path.join(dp, f)
            rel = os.path.relpath(src_path, SRC).replace('\\', '/')
            src_rel = 'images/' + rel
            if src_rel in manifest:
                continue
            # 已存在?.png 或 .jpg
            dst = os.path.join(OUT, rel)
            cand = dst if os.path.exists(dst) else os.path.splitext(dst)[0] + '.jpg'
            if os.path.exists(cand):
                manifest[src_rel] = 'lowres/' + os.path.relpath(cand, OUT).replace('\\', '/')
            else:
                manifest[src_rel] = rel  # 无低清则映射自身(原图)

    mpath = os.path.join(OUT, 'lowres.json')
    with open(mpath, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print('\n=== done: generated=%d skipped=%d failed=%d manifest=%d' % (
        len(hits['ok']), len(hits['skip']), len(hits['fail']), len(manifest)))

if __name__ == '__main__':
    main()