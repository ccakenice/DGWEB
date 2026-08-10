# -*- coding: utf-8 -*-
"""本机定时抓取今日方舟「先导PV」高清直链并上传 GitHub（绕过 Actions IP 风控）
每小时由计划任务调用：python run_ark_pv.py
配置：..\\deploy-config.json => { "BILI_SESSDATA": "...", "GH_TOKEN": "..." }
"""
import json, os, subprocess, sys, time

try:
    sys.stdout.reconfigure(encoding='utf-8')
except (AttributeError, OSError, ValueError):
    pass  # pythonw/计划任务无控制台时 sys.stdout 可能为 None
HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HERE, 'deploy-config.json')
FETCH = os.path.join(HERE, 'fetch_ark_pv.py')
LOG = os.path.join(HERE, 'logs', 'run_ark_pv.log')
PY = r'C:\Program Files\Python312\python.exe'  # 显式用 console python，确保子进程可捕获输出

def log(msg):
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line)
    try:
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except Exception:
        pass

def main():
    if not os.path.exists(CONFIG):
        log('MISSING deploy-config.json ' + CONFIG)
        return 1
    cfg = json.load(open(CONFIG, encoding='utf-8'))
    env = dict(os.environ)
    env['BILI_SESSDATA'] = (cfg.get('BILI_SESSDATA') or '').strip()
    env['GH_TOKEN'] = (cfg.get('GH_TOKEN') or '').strip()
    env['PYTHONIOENCODING'] = 'utf-8'
    if not env['BILI_SESSDATA']:
        log('ERROR: BILI_SESSDATA empty')
        return 1
    start = time.time()
    r = subprocess.run([PY, '-X', 'utf8', 'fetch_ark_pv.py'], cwd=HERE, env=env,
                       capture_output=True, text=True, encoding='utf-8', errors='replace',
                       creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    out = (r.stdout or '') + (r.stderr or '')
    for line in out.splitlines():
        log(line)
    if r.returncode != 0:
        log('FAILED rc=%s in %.0fs' % (r.returncode, time.time() - start))
        return r.returncode
    log('OK in %.0fs' % (time.time() - start))
    return 0

if __name__ == '__main__':
    sys.exit(main())