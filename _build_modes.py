import json, io, sys, re, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 工作目录：优先环境变量 DGWEB_DIR（CI 中设为 GITHUB_WORKSPACE），否则本地路径
BASE = os.environ.get('DGWEB_DIR', r'E:\WebProjects\DGWEB')

# ============ 保护模式 ============
# modes.json 是手工维护的数据（含完整 stages 聚合与 12 个模式），
# 自动构建只抓取近期视频，重建会丢失手工数据。若已存在则跳过重建。
EXISTING = os.path.join(BASE, 'modes.json')
if os.path.exists(EXISTING):
    print('modes.json 已存在（手工维护），跳过自动重建')
    sys.exit(0)

latest = json.load(open(os.path.join(BASE, 'latest.json'), encoding='utf-8'))
items = latest['data']

# ============ 静态模式结构数据（人工整理自参考站） ============
MODES = {
  'event-stages': {
    'name': '活动关卡', 'code': 'event-stages',
    'desc': '历次 Side Story 活动关卡，含复刻。',
    'groups': [
      {'name': '2026', 'items': [
        {'code': 'TO', 'name': '直到大地变成一颗酸橙', 'img': 'images/modes/活动名称_直到大地变成一颗酸橙.png'},
        {'code': 'TD', 'name': '泡影苍霆', 'img': 'images/modes/活动名称_泡影苍霆.png'},
        {'code': 'PA', 'name': '人们，我们', 'img': 'images/modes/活动名称_人们，我们.png'},
        {'code': 'TA', 'name': '辞岁行', 'img': 'images/modes/活动名称_辞岁行.png'},
        {'code': 'ME', 'name': '雅赛努斯复仇记', 'img': 'images/modes/活动名称_雅赛努斯复仇记.png'},
      ]},
      {'name': '2025', 'items': [
        {'code': 'UR', 'name': '未许之地', 'img': 'images/modes/活动名称_未许之地.png'},
        {'code': 'OS', 'name': '雪山降临1101', 'img': 'images/modes/活动名称_雪山降临1101.png'},
        {'code': 'SS', 'name': '无忧梦呓', 'img': 'images/modes/活动名称_无忧梦呓.png'},
        {'code': 'AT', 'name': '墟', 'img': 'images/modes/活动名称_墟.png'},
        {'code': 'AD', 'name': '红丝绒', 'img': 'images/modes/活动名称_红丝绒.png'},
        {'code': 'MT', 'name': '众生行记', 'img': 'images/modes/活动名称_众生行记.png'},
        {'code': 'EA', 'name': '挽歌燃烧殆尽', 'img': 'images/modes/活动名称_挽歌燃烧殆尽.png'},
        {'code': 'OR', 'name': '相见欢', 'img': 'images/modes/活动名称_相见欢.png'},
      ]},
      {'name': '2024', 'items': [
        {'code': 'EP', 'name': '出苍白海', 'img': 'images/modes/活动名称_出苍白海.png'},
        {'code': 'PV', 'name': '揭幕者们', 'img': 'images/modes/活动名称_揭幕者们.png'},
        {'code': 'GO', 'name': '追迹日落以西', 'img': 'images/modes/活动名称_追迹日落以西.png'},
        {'code': 'DT', 'name': '泰拉饭', 'img': 'images/modes/活动名称_泰拉饭.png'},
        {'code': 'AS', 'name': '太阳甩在身后', 'img': 'images/modes/活动名称_太阳甩在身后.png'},
        {'code': 'BP', 'name': '生路', 'img': 'images/modes/活动名称_生路.png'},
        {'code': 'BB', 'name': '巴别塔', 'img': 'images/modes/活动名称_巴别塔.png'},
        {'code': 'CR', 'name': '水晶箭行动', 'img': 'images/modes/活动名称_水晶箭行动.png'},
        {'code': 'HS', 'name': '怀黍离', 'img': 'images/modes/活动名称_怀黍离.png'},
      ]},
      {'name': '2023', 'items': [
        {'code': 'RS', 'name': '银心湖列车', 'img': 'images/modes/活动名称_银心湖列车.png'},
        {'code': 'ZT', 'name': '崔林特尔梅之金', 'img': 'images/modes/活动名称_崔林特尔梅之金.png'},
        {'code': 'DS', 'name': '纷争演绎', 'img': 'images/modes/活动名称_纷争演绎.png'},
        {'code': 'CV', 'name': '不义之财', 'img': 'images/modes/活动名称_不义之财.png'},
        {'code': 'SL', 'name': '火山旅梦', 'img': 'images/modes/活动名称_火山旅梦.png'},
        {'code': 'HE', 'name': '空想花庭', 'img': 'images/modes/活动名称_空想花庭.png'},
        {'code': 'CW', 'name': '孤星', 'img': 'images/modes/活动名称_孤星.png'},
        {'code': 'CF', 'name': '落叶逐火', 'img': 'images/modes/活动名称_落叶逐火.png'},
        {'code': 'WB', 'name': '登临意', 'img': 'images/modes/活动名称_登临意.png'},
      ]},
      {'name': '2022', 'items': [
        {'code': 'FC', 'name': '照我以火', 'img': 'images/modes/活动名称_照我以火.png'},
        {'code': 'IS', 'name': '叙拉古人', 'img': 'images/modes/活动名称_叙拉古人.png'},
        {'code': 'IC', 'name': '理想城：长夏狂欢季', 'img': 'images/modes/活动名称_理想城长夏狂欢季.png'},
        {'code': 'DV', 'name': '绿野幻梦', 'img': 'images/modes/活动名称_绿野幻梦.png'},
        {'code': 'LE', 'name': '尘影余音', 'img': 'images/modes/活动名称_尘影余音.png'},
        {'code': 'SN', 'name': '愚人号', 'img': 'images/modes/活动名称_愚人号.png'},
        {'code': 'GA', 'name': '吾导先路', 'img': 'images/modes/活动名称_吾导先路.png'},
        {'code': 'IW', 'name': '将进酒', 'img': 'images/modes/活动名称_将进酒.png'},
      ]},
      {'name': '2021', 'items': [
        {'code': 'BI', 'name': '风雪过境', 'img': 'images/modes/活动名称_风雪过境.png'},
        {'code': 'NL', 'name': '长夜临光', 'img': 'images/modes/活动名称_长夜临光.png'},
        {'code': 'DH', 'name': '多索雷斯假日', 'img': 'images/modes/活动名称_多索雷斯假日.png'},
        {'code': 'SV', 'name': '覆潮之下', 'img': 'images/modes/活动名称_覆潮之下.png'},
        {'code': 'WD', 'name': '遗尘漫步', 'img': 'images/modes/活动名称_遗尘漫步.png'},
        {'code': 'OD', 'name': '源石尘行动', 'img': 'images/modes/活动名称_源石尘行动.png'},
        {'code': 'WR', 'name': '画中人', 'img': 'images/modes/活动名称_画中人.png'},
      ]},
      {'name': '2020', 'items': [
        {'code': 'MB', 'name': '孤岛风云', 'img': 'images/modes/活动名称_孤岛风云.png'},
        {'code': 'MN', 'name': '玛莉娅·临光', 'img': 'images/modes/活动名称_玛莉娅·临光.png'},
        {'code': 'RI', 'name': '密林悍将归来', 'img': 'images/modes/活动名称_密林悍将归来.png'},
        {'code': 'TW', 'name': '沃伦姆德的薄暮', 'img': 'images/modes/活动名称_沃伦姆德的薄暮.png'},
        {'code': 'DM', 'name': '生于黑夜', 'img': 'images/modes/活动名称_生于黑夜.png'},
      ]},
      {'name': '2019', 'items': [
        {'code': 'CB', 'name': '喧闹法则', 'img': 'images/modes/活动名称_喧闹法则.png'},
        {'code': 'OF', 'name': '火蓝之心', 'img': 'images/modes/活动名称_火蓝之心.png'},
        {'code': 'GT', 'name': '骑兵与猎人', 'img': 'images/modes/活动名称_骑兵与猎人.png'},
      ]},
    ]
  },
  'story-set': {
    'name': '故事集', 'code': 'story-set',
    'desc': '历次故事集活动关卡，收录于情报处理室。',
    'groups': [
      {'name': '2026', 'items': [
        {'code': 'BD', 'name': '丛林症结', 'img': 'images/modes/活动名称_丛林症结.png'},
        {'code': 'CG', 'name': '十字路口', 'img': 'images/modes/活动名称_十字路口.png'},
      ]},
      {'name': '2025', 'items': [
        {'code': 'FM', 'name': '镜中集', 'img': 'images/modes/活动名称_镜中集.png'},
        {'code': 'SE', 'name': '我们明日见', 'img': 'images/modes/活动名称_我们明日见.png'},
      ]},
      {'name': '2024', 'items': [
        {'code': 'TG', 'name': '去咧嘴谷', 'img': 'images/modes/活动名称_去咧嘴谷.png'},
        {'code': 'KR', 'name': '熔炉"还魂"记', 'img': 'images/modes/活动名称_熔炉“还魂”记.png'},
      ]},
      {'name': '2023', 'items': [
        {'code': 'DC', 'name': '春分', 'img': 'images/modes/活动名称_春分.png'},
        {'code': 'FD', 'name': '眠于树影之中', 'img': 'images/modes/活动名称_眠于树影之中.png'},
      ]},
      {'name': '2022', 'items': [
        {'code': 'BW', 'name': '好久不见', 'img': 'images/modes/活动名称_好久不见.png'},
        {'code': 'AW', 'name': '日暮寻路', 'img': 'images/modes/活动名称_日暮寻路.png'},
        {'code': 'TC', 'name': '未尽篇章', 'img': 'images/modes/活动名称_未尽篇章.png'},
        {'code': 'TB', 'name': '阴云火花', 'img': 'images/modes/活动名称_阴云火花.png'},
      ]},
      {'name': '2021', 'items': [
        {'code': 'PS', 'name': '红松林', 'img': 'images/modes/活动名称_红松林.png'},
        {'code': '', 'name': '如我所见', 'img': 'images/modes/活动名称_如我所见.png'},
        {'code': 'PL', 'name': '灯火序曲', 'img': 'images/modes/活动名称_灯火序曲.png'},
        {'code': 'BH', 'name': '此地之外', 'img': 'images/modes/活动名称_此地之外.png'},
      ]},
      {'name': '2020', 'items': [
        {'code': 'FA', 'name': '踏寻往昔之风', 'img': 'images/modes/活动名称_踏寻往昔之风.png'},
        {'code': '', 'name': '乌萨斯的孩子们', 'img': 'images/modes/活动名称_乌萨斯的孩子们.png'},
        {'code': 'SA', 'name': '午间逸话', 'img': 'images/modes/活动名称_午间逸话.png'},
        {'code': 'AF', 'name': '洪炉示岁', 'img': 'images/modes/活动名称_洪炉示岁.png'},
      ]},
      {'name': '2019', 'items': [
        {'code': 'SW', 'name': '战地秘闻', 'img': 'images/modes/活动名称_战地秘闻.png'},
      ]},
    ]
  },
  'main-stages': {
    'name': '主线关卡', 'code': 'main-stages',
    'desc': '主线剧情章节关卡。',
    'groups': [
      {'name': 'Ⅲ 裂变', 'items': [
        {'code': '15', 'name': '离解复合', 'img': 'images/modes/章节名称_第十五章.png'},
        {'code': '16', 'name': '反常光谱', 'img': 'images/modes/章节名称_第十六章.png'},
        {'code': '17', 'name': '相变临界', 'img': 'images/modes/章节名称_第十七章.png'},
      ]},
      {'name': 'Ⅱ 残阳', 'items': [
        {'code': '9', 'name': '风暴瞭望', 'img': 'images/modes/章节名称_第九章.png'},
        {'code': '10', 'name': '破碎日冕', 'img': 'images/modes/章节名称_第十章.png'},
        {'code': '11', 'name': '淬火尘霾', 'img': 'images/modes/章节名称_第十一章.png'},
        {'code': '12', 'name': '惊霆无声', 'img': 'images/modes/章节名称_第十二章.png'},
        {'code': '13', 'name': '恶兆湍流', 'img': 'images/modes/章节名称_第十三章.png'},
        {'code': '14', 'name': '慈悲灯塔', 'img': 'images/modes/章节名称_第十四章.png'},
      ]},
      {'name': 'Ⅰ 幻灭', 'items': [
        {'code': '4', 'name': '急性衰竭', 'img': 'images/modes/章节名称_第四章.png'},
        {'code': '5', 'name': '靶向药物', 'img': 'images/modes/章节名称_第五章.png'},
        {'code': '6', 'name': '局部坏死', 'img': 'images/modes/章节名称_第六章.png'},
        {'code': '7', 'name': '苦难摇篮', 'img': 'images/modes/章节名称_第七章.png'},
        {'code': '8', 'name': '怒号光明', 'img': 'images/modes/章节名称_第八章.png'},
      ]},
      {'name': 'init. 觉醒', 'items': [
        {'code': '1', 'name': '黑暗时代·上', 'img': 'images/modes/章节名称_第一章.png'},
        {'code': '2', 'name': '黑暗时代·下', 'img': 'images/modes/章节名称_第二章.png'},
        {'code': '3', 'name': '异卵同生', 'img': 'images/modes/章节名称_第三章.png'},
        {'code': '0', 'name': '二次呼吸', 'img': 'images/modes/章节名称_序章.png'},
      ]},
    ]
  },
  'crisis-contract': {
    'name': '危机合约', 'code': 'crisis-contract',
    'desc': '危机合约历代行动与尖灭测试。',
    'groups': [
      {'name': '危机合约2.0', 'items': [
        {'code': 'CC', 'name': '#5 涤墨作战', 'img': 'images/modes/活动名称_涤墨作战.png'},
        {'code': 'CC', 'name': '#4 弧光作战', 'img': 'images/modes/活动名称_弧光作战.png'},
        {'code': 'CC', 'name': '#3 净罪作战', 'img': 'images/modes/活动名称_净罪作战.png'},
        {'code': 'CC', 'name': '#2 潮曦作战', 'img': 'images/modes/活动名称_潮曦作战.png'},
        {'code': 'CC', 'name': '#1 浊燃作战', 'img': 'images/modes/活动名称_浊燃作战.png'},
        {'code': 'CC', 'name': '尖灭测试作战', 'img': 'images/modes/活动名称_尖灭测试作战.png'},
      ]},
      {'name': '危机合约1.0', 'items': [
        {'code': 'CC', 'name': '#12 起源行动', 'img': 'images/modes/活动名称_起源行动.png'},
        {'code': 'CC', 'name': '#11 赝波行动', 'img': 'images/modes/活动名称_赝波行动.png'},
        {'code': 'CC', 'name': '#10 尘环行动', 'img': 'images/modes/活动名称_尘环行动.png'},
        {'code': 'CC', 'name': '#9 渊默行动', 'img': 'images/modes/活动名称_渊默行动.png'},
        {'code': 'CC', 'name': '#8 寻昼行动', 'img': 'images/modes/活动名称_寻昼行动.png'},
        {'code': 'CC', 'name': '#7 松烟行动', 'img': 'images/modes/活动名称_松烟行动.png'},
        {'code': 'CC', 'name': '#6 蛮鳞行动', 'img': 'images/modes/活动名称_蛮鳞行动.png'},
        {'code': 'CC', 'name': '#5 光谱行动', 'img': 'images/modes/活动名称_光谱行动.png'},
        {'code': 'CC', 'name': '#4 铅封行动', 'img': 'images/modes/活动名称_铅封行动.png'},
        {'code': 'CC', 'name': '#3 燃灰行动', 'img': 'images/modes/活动名称_燃灰行动.png'},
        {'code': 'CC', 'name': '#2 利刃行动', 'img': 'images/modes/活动名称_利刃行动.png'},
        {'code': 'CC', 'name': '#1 黄铁行动', 'img': 'images/modes/活动名称_黄铁行动.png'},
        {'code': 'CC', 'name': '#0 荒芜行动', 'img': 'images/modes/活动名称_荒芜行动.png'},
      ]},
      {'name': '危机合约β', 'items': [
        {'code': 'CC', 'name': '全息作战矩阵', 'img': 'images/modes/活动名称_危机合约.png'},
        {'code': 'CC', 'name': '训练场', 'img': 'images/modes/活动名称_训练场.png'},
      ]},
    ]
  },
  'resource': {
    'name': '资源收集', 'code': 'resource',
    'desc': '物资筹备与芯片搜索关卡。',
    'groups': [
      {'name': '物资筹备', 'items': [
        {'code': 'LS', 'name': '战术演习 · 作战记录', 'img': None},
        {'code': 'CE', 'name': '货物运送 · 龙门币', 'img': None},
        {'code': 'AP', 'name': '粉碎防御 · 采购凭证', 'img': None},
        {'code': 'SK', 'name': '物资保障 · 碳', 'img': None},
        {'code': 'CA', 'name': '空中威胁 · 技巧概要', 'img': None},
      ]},
      {'name': '芯片搜索', 'items': [
        {'code': 'PR', 'name': '固若金汤 · 盾奶', 'img': None},
        {'code': 'PR', 'name': '摧枯拉朽 · 术狙', 'img': None},
        {'code': 'PR', 'name': '势不可挡 · 辅锋', 'img': None},
        {'code': 'PR', 'name': '身先士卒 · 近特', 'img': None},
      ]},
    ]
  },
  'other-events': {
    'name': '其他活动', 'code': 'other-events',
    'desc': '引航者试炼、矢量突破等特殊活动。',
    'groups': [
      {'name': '引航者试炼', 'items': [
        {'code': 'TN', 'name': '「引航者试炼」#06', 'img': 'images/modes/活动名称_引航者试炼_06.png'},
        {'code': 'TN', 'name': '「引航者试炼」#05', 'img': 'images/modes/活动名称_引航者试炼_05.png'},
        {'code': 'TN', 'name': '「引航者试炼」#04', 'img': 'images/modes/活动名称_引航者试炼_04.png'},
        {'code': 'TN', 'name': '「引航者试炼」#03', 'img': 'images/modes/活动名称_引航者试炼_03.png'},
        {'code': 'TN', 'name': '「引航者试炼」#02', 'img': 'images/modes/活动名称_引航者试炼_02.png'},
        {'code': 'TN', 'name': '「引航者试炼」#01', 'img': 'images/modes/活动名称_引航者试炼_01.png'},
      ]},
      {'name': '矢量突破', 'items': [
        {'code': 'VEC', 'name': '矢量突破#2 巫术之夜', 'img': 'images/modes/活动名称_矢量突破_01.png'},
        {'code': 'VEC', 'name': '矢量突破：无机物', 'img': 'images/modes/活动名称_矢量突破.png'},
      ]},
    ]
  },
  'annihilation': {
    'name': '剿灭作战', 'code': 'annihilation',
    'desc': '长期委托与轮换委托剿灭关卡。',
    'groups': [
      {'name': '轮换委托', 'items': [
        {'code': 'ANN', 'name': '朱墙食府', 'img': None},
      ]},
      {'name': '乌萨斯', 'items': [
        {'code': 'ANN', 'name': '切尔诺伯格', 'img': None},
        {'code': 'ANN', 'name': '北原冰封废城', 'img': None},
        {'code': 'ANN', 'name': '废弃矿区', 'img': None},
      ]},
      {'name': '炎国', 'items': [
        {'code': 'ANN', 'name': '龙门外环', 'img': None},
        {'code': 'ANN', 'name': '龙门市区', 'img': None},
        {'code': 'ANN', 'name': '盘桓蜀道', 'img': None},
        {'code': 'ANN', 'name': '龙门商业街', 'img': None},
        {'code': 'ANN', 'name': '千嶂边城', 'img': None},
        {'code': 'ANN', 'name': '壬午号水稻田', 'img': None},
      ]},
      {'name': '卡西米尔', 'items': [
        {'code': 'ANN', 'name': '大骑士领郊外', 'img': None},
        {'code': 'ANN', 'name': '黑夜锦标秀', 'img': None},
      ]},
      {'name': '汐斯塔', 'items': [
        {'code': 'ANN', 'name': '潮没海滨', 'img': None},
        {'code': 'ANN', 'name': '新旅店大道', 'img': None},
      ]},
      {'name': '伊比利亚', 'items': [
        {'code': 'ANN', 'name': '积水潮窟', 'img': None},
        {'code': 'ANN', 'name': '昏黑造船厂', 'img': None},
        {'code': 'ANN', 'name': '鳞骸盐漠', 'img': None},
      ]},
      {'name': '萨尔贡', 'items': [
        {'code': 'ANN', 'name': '长泉镇郊野', 'img': None},
        {'code': 'ANN', 'name': '"特制小水坑"', 'img': None},
        {'code': 'ANN', 'name': '大巴扎', 'img': None},
      ]},
      {'name': '玻利瓦尔', 'items': [
        {'code': 'ANN', 'name': '多索雷斯换水口', 'img': None},
      ]},
      {'name': '哥伦比亚', 'items': [
        {'code': 'ANN', 'name': '南方监狱', 'img': None},
        {'code': 'ANN', 'name': '实验基地机库', 'img': None},
        {'code': 'ANN', 'name': '"离心率"实验室', 'img': None},
        {'code': 'ANN', 'name': '66号航道', 'img': None},
      ]},
      {'name': '维多利亚', 'items': [
        {'code': 'ANN', 'name': '小丘郡郊野', 'img': None},
        {'code': 'ANN', 'name': '灰暗泥沼', 'img': None},
        {'code': 'ANN', 'name': '腐烂荒野', 'img': None},
        {'code': 'ANN', 'name': '燃烧街区', 'img': None},
      ]},
      {'name': '莱塔尼亚', 'items': [
        {'code': 'ANN', 'name': '休止符街道', 'img': None},
        {'code': 'ANN', 'name': '选帝侯广场', 'img': None},
      ]},
      {'name': '谢拉格', 'items': [
        {'code': 'ANN', 'name': '冰封雪谷', 'img': None},
      ]},
      {'name': '拉特兰', 'items': [
        {'code': 'ANN', 'name': '巧克力大街', 'img': None},
      ]},
      {'name': '阿戈尔', 'items': [
        {'code': 'ANN', 'name': '暗流巢窟', 'img': None},
      ]},
      {'name': '卡兹戴尔', 'items': [
        {'code': 'ANN', 'name': '炽灼车间', 'img': None},
      ]},
    ]
  },
  'paradox-sim': {
    'name': '悖论模拟', 'code': 'paradox-sim',
    'desc': '干员悖论模拟关卡（按职业分类）。',
    'groups': [
      {'name': '职业分类', 'items': [
        {'code': 'PRTS', 'name': '先锋', 'img': None},
        {'code': 'PRTS', 'name': '近卫', 'img': None},
        {'code': 'PRTS', 'name': '狙击', 'img': None},
        {'code': 'PRTS', 'name': '重装', 'img': None},
        {'code': 'PRTS', 'name': '医疗', 'img': None},
        {'code': 'PRTS', 'name': '辅助', 'img': None},
        {'code': 'PRTS', 'name': '术师', 'img': None},
        {'code': 'PRTS', 'name': '特种', 'img': None},
      ]},
    ]
  },
  'current-event': {
    'name': '当前活动', 'code': 'current-event',
    'desc': '正在进行的活动与关卡。',
    'groups': [
      {'name': '活动关卡', 'items': [
        {'code': 'TO', 'name': '直到大地变成一颗酸橙', 'img': 'images/modes/活动名称_直到大地变成一颗酸橙.png'},
      ]},
    ]
  },
  'integrated-strategies': {
    'name': '集成战略', 'code': 'integrated-strategies',
    'desc': '集成战略（肉鸽）历代主题。',
    'groups': [
      {'name': '历届主题', 'items': [
        {'name': '傀影与猩红孤钻', 'img': 'images/modes/活动名称_傀影与猩红孤钻.png', 'year': 2021},
        {'name': '水月与深蓝之树', 'img': 'images/modes/活动名称_水月与深蓝之树.png', 'year': 2022},
        {'name': '探索者的银凇止境', 'img': 'images/modes/活动名称_探索者的银凇止境.png', 'year': 2023},
        {'name': '萨卡兹的无终奇语', 'img': 'images/modes/活动名称_萨卡兹的无终奇语.png', 'year': 2024},
        {'name': '岁的界园志异', 'img': 'images/modes/活动名称_岁的界园志异.png', 'year': 2025},
        {'name': '沉沦者的黑流树海', 'img': 'images/modes/活动名称_沉沦者的黑流树海.png', 'year': 2026},
      ]},
    ]
  },
  'stationary-security': {
    'name': '保全派驻', 'code': 'stationary-security',
    'desc': '保全派驻模式（常驻玩法）。',
    'groups': [
      {'name': '保全派驻', 'items': [
        {'code': 'SS', 'name': '保全派驻', 'img': 'images/modes/保全派驻_头图.png'},
      ]},
    ]
  },
  'reclamation-algorithm': {
    'name': '生息演算', 'code': 'reclamation-algorithm',
    'desc': '生息演算模式（生存经营）。',
    'groups': [
      {'name': '历届主题', 'items': [
        {'code': 'RA', 'name': '沙中之火', 'img': 'images/modes/图标_沙中之火.png'},
        {'code': 'RA', 'name': '沙洲遗闻', 'img': 'images/modes/图标_沙洲遗闻.png'},
        {'code': 'RA', 'name': '重启锚点', 'img': 'images/modes/图标_重启锚点.png'},
      ]},
    ]
  },
}

# ============ 从 B 站数据聚合每个活动代号的关卡 ============
# 提取所有分P的关卡代码
stage_map = {}  # code -> [(bvid, page, part, duration, vtitle)]
CODE_RE = re.compile(r'^((?:[A-Za-z]{1,4}-?\d+[A-Za-z]?|[A-Za-z]{1,4}|\d{1,2}-\d{1,2}[A-Za-z]?))')

def extract_code(part):
    part2 = part.strip()
    # 跳过不以字母或数字开头的（避免把"11-15章"这类章节标题当关卡）
    m = CODE_RE.match(part2.upper())
    if m:
        return m.group(1)
    return None

# 旧版/不用看过滤
def is_obsolete(part):
    return any(k in part for k in ['旧版', '不用看', '参考版', '（旧版', '(旧版'])

for it in items:
    bvid = it['bvid']
    vtitle = it['title']
    for p in it.get('pages') or []:
        part = p['part'].strip()
        if is_obsolete(part):
            continue
        code = extract_code(part)
        if code:
            stage_map.setdefault(code, []).append({
                'bvid': bvid, 'page': p['page'], 'part': part,
                'duration': p.get('duration', 0), 'vtitle': vtitle
            })

# 输出模式数据（含每模式的关卡列表）
def norm_code(code):
    m = re.match(r'^([A-Z]+)-?0+(\d+[A-Z]?)$', code.upper())
    if m:
        return m.group(1) + '-' + m.group(2)
    return code.upper()

out = {'modes': []}
for mode_key, mode in MODES.items():
    groups = []
    for g in mode['groups']:
        items_out = []
        for it in g['items']:
            it_code = it.get('code', '')
            # 主线：章节号（数字）-> 匹配 15-1 / 17-10 这类
            if it_code.isdigit():
                stages = []
                seen = set()
                for code, sols in stage_map.items():
                    m = re.match(r'^(\d{1,2})-\d', code)
                    if m and m.group(1) == it_code:
                        norm = norm_code(code)
                        if norm in seen:
                            continue
                        seen.add(norm)
                        stages.append({'code': code, 'solutions': len(sols)})
                stages.sort(key=lambda s: (len(s['code']), s['code']))
                items_out.append({'name': it['name'], 'img': it['img'], 'stages': stages})
                continue
            # 活动代号（如 TO / TN / VEC），收集该活动下的所有关卡代码
            stages = []
            if it_code and it_code not in ('ANN', 'PRTS', 'PR', 'CC'):
                prefix = it_code
                seen = set()
                for code, sols in stage_map.items():
                    if code.upper() == prefix.upper():
                        continue
                    if code.upper().startswith(prefix.upper()):
                        norm = norm_code(code)
                        if norm in seen:
                            continue
                        seen.add(norm)
                        stages.append({'code': code, 'solutions': len(sols)})
                stages.sort(key=lambda s: (len(s['code']), s['code']))
                items_out.append({'name': it['name'], 'img': it['img'], 'stages': stages})
                continue
            # 其余（剿灭/合约/资源/悖论/引航者/矢量）：按名称匹配视频数，stages 留空
            item_out = {'name': it['name'], 'img': it['img'], 'stages': []}
            # 集成战略保留 year（modes.html 据此自动同步最新主题封面）
            if 'year' in it:
                item_out['year'] = it['year']
            items_out.append(item_out)
        groups.append({'name': g['name'], 'items': items_out})
    out['modes'].append({'key': mode_key, 'name': mode['name'], 'desc': mode['desc'], 'groups': groups})

# 保存 modes.json
with open(os.path.join(BASE, 'modes.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print('modes.json saved')
print('modes:', len(out['modes']))
for m in out['modes']:
    gcount = sum(len(g['items']) for g in m['groups'])
    print(f"  {m['key']}: {m['name']} - {gcount} 项")
