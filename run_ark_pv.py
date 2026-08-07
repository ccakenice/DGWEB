# -*- coding: utf-8 -*-
"""本机定时抓取今日方舟「先导PV」高清直链并上传 GitHub（绕过 Actions IP 风控）
每小时由计划任务调用：python run_ark_pv.py
配置：..\\deploy-config.json => { "BILI_SESSDATA": "...", "GH_TOKEN": "..." }
"""
import json, os, subprocess, sys, time

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HERE, 'deploy-config.json')
FETCH = os.path.join(HERE, 'fetch_ark_pv.py')

def main():
    if not os.path.exists(CONFIG):
        print('MISSING deploy-config.json', CONFIG)
        return 1
    cfg = json.load(open(CONFIG, encoding='utf-8'))
    env = dict(os.environ)
    env['BILI_SESSDATA'] = (cfg.get('BILI_SESSDATA') or '').strip()
    env['GH_TOKEN'] = (cfg.get('GH_TOKEN') or '').strip()
    if not env['BILI_SESSDATA']:
        print('ERROR: BILI_SESSDATA empty')
        return 1
    start = time.time()
    r = subprocess.run([sys.executable, 'fetch_ark_pv.py'], cwd=HERE, env=env,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = (r.stdout or '') + (r.stderr or '')
    print(out)
    if r.returncode != 0:
        print('FAILED rc=%s in %.0fs' % (r.returncode, time.time() - start))
        return r.returncode
    print('OK in %.0fs' % (time.time() - start))
    return 0

if __name__ == '__main__':
    sys.exit(main())