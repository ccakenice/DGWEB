# DGWEB 项目进度与规范文档 (AI_PROGRESS.md)

## 项目概览
- **项目名称**: DGWEB - 低配挂机研讨会（明日方舟攻略站）
- **部署地址**: https://dgwebq.pages.dev/（Cloudflare Pages）
- **GitHub 仓库**: `ccakenice/DGWEB`（CF Pages 自动部署，改完上传即上线）
- **技术栈**: 纯静态 HTML/CSS/JS（原生 ES6 + Tailwind CDN），无构建工具
- **数据来源**: B 站视频数据（bili-sync 同步）、PRTS Wiki、B 站 Wiki (biligame)
- **版本管理**: V0.10~V0.21 已定格，当前版本 **V0.22**（草稿，功能开发中）
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

### 9. 主页 hero 官方先导PV 全屏背景 (index.html) 【2026-08-06 V0.22】
- **数据抓取** `fetch_ark_pv.py`：WBI 签名 + BILI_SESSDATA 搜索 UP 主 UID 161775300（明日方舟官方）带「先导PV」关键词的最新视频 → `ark_pv.json`（含 bvid/title/duration/pages/cid），本地运行上传 bili-sync + DGWEB 两仓库，Actions 中只写本地由 workflow commit
- **全屏背景 iframe 播放器**：`https://player.bilibili.com/player.html?bvid=..&page=1&danmaku=0&high_quality=1&autoplay=1&muted=1&t=随机`
- **无 UI 沉浸式**：`.pv-stage` 覆盖整个 hero 区（inset:0，z-index:-1 位于内容之下），无按钮/标签/边框/进度条（iframe pointer-events:none + 暗色渐变遮罩保证文字可读）
- **随机起点**：每次打开在 0:07~2:30（t=7~150 秒）随机开始；按视频时长 `setTimeout` 重载模拟循环（每次重载重新随机 t）
- **静音策略**：默认 `muted=1` 自动静音播放（浏览器策略），监听首次 `pointerdown/keydown/touchstart` 后重建 iframe 去掉 muted（自动开声）
- **移动端适配**：保留全屏背景（inset:-10% 放大裁边），遮罩改为上下渐变
- **light 模式适配**：hero 内文字/统计/装饰强制浅色（#hero 范围覆写），保证深色视频背景下可读
- **数据回退**：`/ark_pv.json` > jsdelivr(bili-sync) > GitHub raw，与 latest.json 加载逻辑一致
- **画质升级（V0.22b）**：`fetch_ark_pv.py` 新增 `fetch_playurl()`——B 站游客只给 480P（dash [16,32]，iframe 源仅 640×294），登录态（Actions BILI_SESSDATA）可拿 1080P+ 直链，写入 `ark_pv.json` 的 `video.stream`（type/quality/url/backup）；直链经实测无 Referer 防盗链（任意站点返回 206）
- **前端高清直链分支**：`pvRender()` 优先 `<video id="pvVideo">` 播放 `stream.url`（muted+playsinline 自动播、`currentTime=pvStart` 随机起点、`timeupdate` 到 `dur-5` 时 seek 回起点模拟循环、交互开声同 iframe 策略）；`video` error（直链过期）自动回退 iframe 分支，iframe 分支逻辑不变（定时提前 6s 重载）
- **循环定时器修复**：原 `Math.max(6000, 秒) * 1000` 单位错误（下限≈100 分钟，播完停在 B 站选视频界面），改为 `Math.max(3000, (dur - t - 6) * 1000)` 提前 6 秒重载
- **高清直链落地（本机定时抓取）**：B 站对 GitHub Actions 数据中心 IP 的 playurl 接口 412 封禁（wbi/plain/intl 三端点实测均不通），改用**本机计划任务 DGArkPVSync 每小时跑 `run_ark_pv.py`**（读 `deploy-config.json` 的 BILI_SESSDATA/GH_TOKEN，运行 fetch_ark_pv.py 抓 1080P 直链 + api.github.com 双仓库上传）；直链约 2 小时有效，每小时刷新保持持续高清，前端 video error 自动回退 iframe
- **CDN 防盗链与代理**：B 站标准 CDN（bilivideo.com/upos-*）只认 `*.bilibili.com` Referer，页面 `<video>` 直接引用必 403（ERR_BLOCKED_BY_ORB）→ 新增 **CF Pages Function `functions/pv.js`（`/pv?url=` 代理）**：Worker 侧代发请求带 B 站 Referer + 转发 Range/206/Content-Type，页面同源播放；线上已验证 1080P（1920×886）正常播放、循环 seek、交互开声全部正常
- **本地实测**：带 SESSDATA 抓取 quality=80（1080P dash），游客仅 32（480P）；mcdn.bilivideo.cn 部分节点不查 Referer（本地 480P 曾直连可播），标准 CDN 必查
- **缓存完成才显示**：`<video>` 以 opacity:0 隐藏（display:none 会被浏览器暂停，无法后台缓冲）+ muted 静音自动 play 触发下载；监听 progress/canplaythrough，`buffered.end >= duration-1`（缓存至片尾可连续播完）才 `pv-video-on` 显示并 seek 到随机起点；60 秒兜底显示防弱网永久黑屏；交互开声后未显示时仅切换静音态，显示时自动有声
- **黑底延迟出现（light 兼容）**：`.pv-stage` 黑底与 `pv-active` 文字浅色覆写不再随 fetch 成功立即出现，改为 `pvStageShow()`（视频缓存完成 / iframe load / 12s 兜底）时触发——视频未加载前 stage 透明、hero 保持白底黑字（light）或默认深色；修复原 `.pv-stage + .max-w` 选择器不匹配（实际类名 `max-w-[1400px]`）导致 light 覆写失效的问题，改用 `body.pv-active` 类控制（线上验证：加载中白底黑字 rgb(20,20,20)，显示后黑底浅字 rgb(244,244,242)）
- **循环黑场过渡**：循环点（dur-6 秒）不再瞬时 seek 跳变——video/iframe 先加 `pv-fade-out`（0.85s 淡出到黑场），黑场停驻 **2 秒**，seek 到新随机起点后移除类淡入（0.8s），整体约 3 秒过渡（线上实测：dur 150.9 时 cur 145.3 淡出 → 黑停 2s → cur 101.2 淡入新起点）
- **计划任务 DGArkPVSync 曾失败**（Result 2147946720）：重建为`可复用 SYSTEM 账户 ServiceAccount + 最高权限`后 Result 0 恢复正常，且 CF Pages 对已有静态 json 有 CDN 缓存（更新时间约延迟 1-2 分钟，实际延迟因 CDN 而定）；直链过期会导致 video error → 自动回退 iframe

## 数据源与素材库
| 文件 | 说明 |
|------|------|
| latest.json | B 站视频数据（512 视频 / 1575 分P），bili-sync 仓库自动同步 |
| ark_pv.json | 明日方舟官方最新「先导PV」视频（fetch_ark_pv.py 每日抓取） |
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
| **V0.21** | 🔒 定格 | 详情页分P/续播 + 搜索高亮 + 干员筛选 + 移动端补强 |
| **V0.22** | 🧪 草稿 | 主页 hero 官方先导PV 副屏（随机起点循环播放） |

**同步流程**：
1. 主目录 (`E:\WebProjects\DGWEB`) 修改
2. 同步到 `E:\WebProjects\versions\DGWEB_V0.22\`
3. 上传 GitHub → CF Pages 自动部署（1~3 分钟）
4. 线上验证（网络波动时多轮重试）
5. 更新 `V0.22\版本说明.txt`

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

### 🧪 V0.22（草稿，开发中）
- [x] 抓取脚本 fetch_ark_pv.py：明日方舟官方空间「先导PV」最新视频 → ark_pv.json（本地已验证抓到 BV1KN3M6wEm9「直到大地变成一颗酸橙」活动先导PV）
- [x] 主页 hero 副屏播放器：iframe + t 随机起点(7~150s) + 定时重载循环 + 默认静音自动播
- [x] 首次交互自动开声（pointerdown/keydown/touchstart 后重建 iframe）
- [x] 静音按钮手动切换 + 边缘 mask 羽化 + 控制条裁剪（无进度条）
- [x] daily.yml 增加 fetch_ark_pv.py 步骤（Actions 定时 04:30 抓取）
- [x] playwright 本地验证：加载/随机t/交互开声/按钮切换全部通过
- [x] 同步 V0.22 + 上传 GitHub + 线上验证通过（git push 网络受阻，改用 api.github.com Contents API 上传）

### ✅ V0.21（已定格）
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
- （V0.22 同步上传 + 线上验证后，待用户确认定格）

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
1. 主目录修改 → 同步到 versions\DGWEB_V0.22\
2. python upload_all.py（批量）或 upload_single.py 文件名（单文件）
3. 等 CF 构建（1~3 分钟），多轮重试验证 https://dgwebq.pages.dev/
```

## 后续 AI 接手指引
1. 先读 `AI_PROGRESS.md`、`ai_handoff/` 同步副本、`V0.22\版本说明.txt`
2. 本地预览 `serve_preview.py`（8844，注意服务的是 Default Project 目录，验证前需先复制页面过去）
3. 改动前遵守项目规范（不扩大范围、先局部后全局）
4. 改完同步 V0.21 → 上传 → 验证 → 更新文档

> **核心原则**：小步快跑，先局部后全局，不扩大问题范围，保留原有设计意图。
