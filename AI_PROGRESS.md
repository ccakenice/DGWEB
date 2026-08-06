# DGWEB 项目进度与规范文档 (AI_PROGRESS.md)

## 项目概览
- **项目名称**: DGWEB - 低配挂机研讨会（明日方舟攻略站）
- **部署地址**: https://dgwebq.pages.dev/（Cloudflare Pages）
- **GitHub 仓库**: `ccakenice/DGWEB`（CF Pages 自动部署，改完上传即上线）
- **技术栈**: 纯静态 HTML/CSS/JS（原生 ES6 + Tailwind CDN），无构建工具
- **数据来源**: B 站视频数据（bili-sync 同步）、PRTS Wiki、B 站 Wiki (biligame)
- **版本管理**: V0.10~V0.20 已定格，当前版本 **V0.21**（草稿，功能已完成，待用户确认后定格）
- **本地预览**: `serve_preview.py`（端口 8844，服务 Default Project 目录）

## 核心页面结构
| 页面 | 功能 | 状态 |
|------|------|------|
| index.html | 主页 + 归档 | ✅ |
| search.html | 视频搜索 (封面/分P/模糊搜索) | ✅ |
| ranking.html | 核心使用率 (总榜 + 年榜) | ✅ |
| aliases.html | 干员别名页面 (136 个 6 星) | ✅ |
| modes.html | 模式列表页 (12 模式) | ✅ |
| mode-*.html (14个) | 各模式详情页 | ✅ |
| detail.html | 视频详情页 | ✅ |
| stage.html | 关卡详情 | ✅ |

## 各功能实现逻辑

### 1. 核心使用率 (ranking.html)
**统计口径**（用户确认，见页面「统计规则」折叠面板）：
- 只统计 **6 星干员**（`prts_rarity.json` 中 rarity=5）
- 只统计标题含 **「单核」或「单挂」** 的攻略视频（单 P 视频并查主标题；「单核挂机」含单核也命中）
- **同一干员同一关卡只计 1 次**（按 stageKey 去重，详情面板按关卡分组展示全部来源）
- **排除剧情体验难度**：剧情模式（如"剧情模式9-2"）与 TR 教程关（TO-TR-1 等），`isPlotPart()` 判断
- **排除过时关卡**：旧版/初版/参考版/不用看（「删除」是系列名不排除），`isOldPart()` 判断
- **剿灭关豁免**单核/单挂限制（MO 代号 `[A-Z]{1,3}-MO-\d` + 45 个剿灭地图关键词），`isMiePart()` 判断
- **年榜**：按 pubDate 年份自动分桶（2023-2026 + 总榜），tab 新年份在左
- 关卡代号识别 `STAGE_RE`：支持 `SS-EX-8`、`H10-4` 等多字母前缀；代号后跟 `～~-至—` 的跳过（防止"1-7～1-8"范围误识别）

**匹配逻辑**（`parts_logic.js`）：
- ASCII 名（如 Logos）：词边界 `(?<!\w)name(?!\w)`
- 单字中文名：左侧非汉字 + 右侧为白名单字（单核挂人等双三）或分隔符
- 多字名：子串匹配；**长名优先**（命中后从文本移除再匹配短名，避免"水陈"吃掉"赤刃明霄陈"）
- 匹配后统一映射为 **PRTS 官方名**（`ALIAS[n] || n`，如 42→温蒂、初雪→圣聆初雪）
- 干员池 `POOL`：47+ 个干员有别名，数字别名后不能紧跟汉字防误匹配（"42分钟"不算 42）

### 2. 干员别名页 (aliases.html)
- 136 个 6 星干员卡片 + 实时搜索
- 别名数据 `aliases_reviewed.json`（105 条，用户 Excel 审查确认）
- 别名并入泛用榜匹配池（gen_data_js.py 生成 parts_data.js 时合并）

### 3. 模式列表页 (modes.html) + 详情页 (mode-*.html)
- 数据在 `modes.json`：12 模式，每模式含 key/name/desc/groups/items（item 有 name/img/stages）
- 列表页缩略图：活动名称图/章节名称图/头图，`grayscale(0.4) contrast(0.95)` 灰化 + hover 恢复彩色是**站点设计风格**
- 详情页按 `MODE_KEY` 从 modes.json 取数据渲染：
  - 活动类（有 stages）：act-card 图片卡片，点击展开关卡列表（stage-chip 链到 stage.html）
  - 名称类（无 stages）：zone-card 文字卡片，链到 stage.html?name=
- 数据加载多源降级：本地 `/modes.json` > jsdelivr > GitHub raw

### 4. 集成战略详情页 (mode-integrated-strategies.html) 【2026-08-05 重写】
- 6 主题卡片：**固定比例缩略图**（aspect-ratio 2.05/1，object-fit:contain）+ 灰度滤镜 + hover 恢复彩色并放大
- 顶部标注 `Integrated Strategies`（此前误写为 Crisis Contract，已修正）
- 6 主题：傀影与猩红孤钻/水月与深蓝之树/探索者的银凇止境/萨卡兹的无终奇语/岁的界园志异/沉沦者的黑流树海
- 主题图源：PRTS「活动名称_」彩色原图（images/modes/）

### 5. 保全派驻 / 生息演算详情页
- 保全派驻：mode-stationary-security.html（头图 1170×375）
- 生息演算：mode-reclamation-algorithm.html（沙中之火/沙洲遗闻/重启锚点）

### 6. 底部工具栏 (全站 footer)
- 「社区常用工具」：公招计算（跳转 PRTS 公开招募页）/ PRTS WIKI / 企鹅物流 / 一图流 / 图米米
- 公招计算器独立页已移除（recruit.html 已删除）

### 7. 干员星级数据 (prts_rarity.json)
- 136 个 6 星（rarity=5），来自 PRTS 干员一览页

### 8. 视频详情页 分P / 续播 (detail.html) 【2026-08-06 V0.21】
- **B 站 iframe 播放器**：`playerSrc(api, bvid, cid, p)` 拼 `https://player.bilibili.com/player.html?bvid=..&cid=..&page=..&high_quality=1&autoplay=1`
- **分P导航 p-nav**：点击 P 后重建 iframe src + 更新 URL 查询参数 `?p=N`（历史记录），支持键盘/翻P
- **续播**：localStorage `PLAY_KEY` 保存视频→当前播放 P，同一 bvid 再次进入自动跳到上次 P
- **跨域限制已知**：B 站 iframe 禁止 postMessage 实时进度回传（已实测不可行），因此「续播」=记住上次播放的 P，非秒级进度
- **播放器优化已验证**：分P切换 / URL同步 / autoplay 均已生效

## 数据源与素材库
| 文件 | 说明 |
|------|------|
| latest.json | B 站视频数据（512 视频 / 1575 分P），bili-sync 仓库自动同步 |
| modes.json | 12 模式完整数据 |
| aliases_reviewed.json | 干员别名（用户审查） |
| prts_rarity.json | 干员星级 |
| ops_tags.json | 干员 tag 映射（公招遗留数据，可复用） |
| recruit_data.json | 81 个 5/6 星干员公招锁定 TAG 数据（页面已删，数据保留） |

## 版本管理规范 (重要)
| 版本 | 状态 | 说明 |
|------|------|------|
| V0.10 / V0.11 / V0.12 | 🔒 定格 | 历史存档，不再修改 |
| V0.13 ~ V0.16 | 🔒 定格 | 历史存档 |
| **V0.17** | 🔒 定格 | 核心使用率/模式/主题/彩蛋/性能优化 |
| **V0.20** | 🔒 定格 | 备份修复 + 全量 git 同步 + CDN 缓存刷新 |
| **V0.21** | 🧪 草稿 | 详情页分P/续播 + 搜索高亮 + 干员筛选 + 移动端补强 |

**同步流程**：
1. 主目录 (`E:\WebProjects\DGWEB`) 修改
2. 同步到 `E:\WebProjects\versions\DGWEB_V0.21\`
3. 上传 GitHub → CF Pages 自动部署（1~3 分钟）
4. 线上验证（网络波动时多轮重试）
5. 更新 `V0.21\版本说明.txt`

**版本变更历史（自动汇总）**：
- 管理器「理解AI」每次点击时，自动扫描 versions 下**所有已定格版本**的版本说明.txt，
  汇总生成 `ai_handoff\版本变更历史.md`（按版本号旧→新排列，含各版改动说明）
- 每次「定格版本」后，点一次「理解AI」即可让 AI 文档包包含最新定格改动
- 草稿版本（状态=草稿）不会进入历史文档

## 项目规范 (用户要求，必须遵守)
1. **不扩大问题范围**: 修改只针对出问题的页面/功能，禁止全站批量改动（样式/滤镜/结构），除非用户明确批准
2. **先局部后全局**: 先改单页验证，通过后再请示是否推广
3. **改动前确认影响面**: 批量操作（正则替换、多文件修改）前先评估涉及文件数
4. **版本同步优先（随时确认最新版本）**: 每次改动前先确认 `E:\WebProjects\versions\` 下最新版本（最高版本号）为工作目标；核对最新版本目录的项目文件是否完整（与主目录对比，页面/数据/脚本齐全）；**完整则只在最新版本目录中修改并同步**；**不完整则先从主目录补齐文件到最新版本，再在最新版本上修改**；改动完成后同步更新项目文档（`AI_PROGRESS.md`、最新版本 `版本说明.txt`）
5. **保留原始风格**: 灰度滤镜等是站点设计风格非 bug，不得随意修改，除非用户要求
6. **中文交流**: 与用户交流一律简体中文
7. **文档同步**: 每次重大改动后更新 `AI_PROGRESS.md` 和 `版本说明.txt`

## 当前进度 (2026-08-06)

### 🧪 V0.21（草稿，功能完成待定格）
- [x] 视频详情页分 P 播放器优化（p-nav 翻P + iframe src 同步 + URL `?p=N` + autoplay=1）
- [x] 播放进度本地存储（localStorage 记住上次播放 P，`PLAY_KEY`，再次进入自动续播该 P）
- [x] 验证 B 站 postMessage 跨域通信：**不可行**，降级为「记住上次播放的 P」
- [x] 搜索高亮优化（search.html）
- [x] 干员筛选面板（ranking.html，按名字/别名过滤榜单）
- [x] 移动端适配补强（detail/search/ranking）
- [x] 同步 V0.21 + 上传 GitHub + 线上验证通过

### ✅ V0.17~V0.20
- [x] 模式入口/数据完好性核对（12 模式、CDN 缓存 purge）
- [x] versions 备份目录修复（V0.17~V0.19 补全）
- [x] git 全量历史合并与安全配置（.gitignore 排除 token 文件）
- [x] 创建 V0.20 完整备份

### ✅ 已完成
- [x] 泛用榜 ranking.html（总榜+年榜+详情面板+统计规则折叠）
- [x] 别名页 aliases.html（136 干员 + 105 别名并入匹配池）
- [x] modes 页 3 新常驻模式（集成战略 6 主题 / 保全派驻 / 生息演算）+ 详情页
- [x] 集成战略详情页重写：固定比例缩略图 + 灰度 hover 动效
- [x] 底部工具栏（社区常用工具 5 链接，全站统一）
- [x] 公招计算器独立页移除（改跳转 PRTS）
- [x] 集成战略主题自动同步脚本 sync_themes_auto.py

### 待办
- （无，当前版本功能已完成，待用户确认定格 V0.21）

## 常见问题与解决方案
| 问题 | 解决方案 |
|------|----------|
| 图片显示差异/暗淡 | 优先检查是否浏览器缓存旧 CSS（强刷验证）；本站无覆盖层/遮罩，图片原样渲染 |
| 图片加载慢 | CF CDN 缓存、懒加载 |
| 模式列表不显示新模式 | 检查 modes.json ORDER 数组、THUMBS 映射 |
| 模式入口“消失/数据不变” | 浏览器 localStorage 缓存（TTL 3h）或 jsDelivr CDN 缓存旧版；console 执行 localStorage.removeItem('dgdata_modesjson') 或 purge.jsdelivr.net |
| 详情页跳转 404 | 检查 mode-{key}.html 是否存在、MODE_KEY 是否匹配 |
| CF Pages 线上验证超时 | 网络波动，多轮重试或改用 playwright 本地渲染验证 |

## 关键文件路径速查
| 功能 | 核心文件 |
|------|----------|
| 泛用榜逻辑/数据 | `parts_logic.js` / `parts_data.js`（在 Default Project 零件目录，gen_data_js.py 生成） |
| 模式列表/详情 | `modes.html` + `modes.json` + `mode-*.html` |
| 干员别名 | `aliases.html` + `aliases_reviewed.json` |
| 公共件 | `parts_head.txt` / `parts_nav.txt` / `parts_footer.txt`（Default Project） |
| 页面组装脚本 | `build_ranking.py` / `gen_aliases_page.py` / `rebuild_is.py` |
| 部署脚本 | `upload_all.py` / `upload_single.py` / `upload_mode_pages.py` |
| 主题同步 | `sync_themes_auto.py` |
| 本地预览 | `serve_preview.py` (端口 8844) |

## 部署流程
```
1. 主目录修改 → 同步到 versions\DGWEB_V0.21\
2. python upload_all.py（批量）或 upload_single.py 文件名（单文件）
3. 等 CF 构建（1~3 分钟），多轮重试验证 https://dgwebq.pages.dev/
```

## 后续 AI 接手指引
1. 先读 `AI_PROGRESS.md`、`ai_handoff/` 同步副本、`V0.21\版本说明.txt`
2. 本地预览 `serve_preview.py`（8844，注意服务的是 Default Project 目录，验证前需先复制页面过去）
3. 改动前遵守项目规范（不扩大范围、先局部后全局）
4. 改完同步 V0.21 → 上传 → 验证 → 更新文档

> **核心原则**：小步快跑，先局部后全局，不扩大问题范围，保留原有设计意图。
