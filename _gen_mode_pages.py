import io, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# CI 中 DGWEB_DIR 指向 GITHUB_WORKSPACE；本地用 DGWEB_V0.08 版本目录
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('DGWEB_DIR', r'E:\WebProjects\versions\DGWEB_V0.08')
TPL_PATH = os.path.join(HERE, '_mode_template.html')
if not os.path.exists(TPL_PATH):
    TPL_PATH = os.path.join(OUT, '_mode_template.html')
TPL = open(TPL_PATH, encoding='utf-8').read()

PAGES = [
    ('event-stages', 'Event Stages', '活动关卡', '历次 Side Story 活动关卡，含复刻与突袭，点击活动卡片展开全部关卡。'),
    ('story-set', 'Story Set', '故事集', '历次故事集活动关卡，收录于情报处理室，点击活动卡片展开全部关卡。'),
    ('current-event', 'Current Event', '当前活动', '正在进行的活动与关卡，随版本更新。'),
    ('other-events', 'Other Events', '其他活动', '引航者试炼、矢量突破等特殊玩法活动。'),
    ('main-stages', 'Main Stages', '主线关卡', '主线剧情章节关卡，按 ACT 分组，点击章节展开该章全部关卡。'),
    ('crisis-contract', 'Crisis Contract', '危机合约', '危机合约历代行动与尖灭测试作战。'),
    ('resource', 'Resource', '资源收集', '物资筹备与芯片搜索关卡，长期开放。'),
    ('paradox-sim', 'Paradox Simulation', '悖论模拟', '干员悖论模拟关卡，按职业分类。'),
    ('annihilation', 'Annihilation', '剿灭作战', '长期委托与轮换委托剿灭关卡。'),
]

for key, en, name, desc in PAGES:
    path = os.path.join(OUT, f'mode-{key}.html')
    # 保护模式：mode 页面是手工维护的完整内容，若已存在则跳过覆盖
    if os.path.exists(path):
        print('跳过(已存在)', path)
        continue
    html = TPL.replace('{{KEY}}', key).replace('{{EN}}', en).replace('{{NAME}}', name).replace('{{DESC}}', desc).replace('{{TITLE}}', name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('生成', path, len(html), 'bytes')
