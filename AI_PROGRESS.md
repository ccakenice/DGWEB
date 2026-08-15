# DGWEB 项目进度与规范文档 (AI_PROGRESS.md)

## 项目概览
- **项目名称**: DGWEB - 低配挂机研讨会（明日方舟攻略站）
- **部署地址**: https://dgwebq.pages.dev/（Cloudflare Pages）
- **GitHub 仓库**: `ccakenice/DGWEB`（CF Pages 自动部署，改完上传即上线）
- **技术栈**: 纯静态 HTML/CSS/JS（原生 ES6 + Tailwind CDN），无构建工具
- **数据来源**: B 站视频数据（bili-sync 同步）、PRTS Wiki、B 站 Wiki (biligame)
- **版本管理**: 已定格至 **V0.25**（🔒），当前工作版本 **V0.29**（草稿）
- **本地预览**: `serve_preview.py`（端口 8844，服务 Default Project 目录）
- **目录说明（2026-08-07 迁移）**: 原 C 盘项目管理文件 `C:\DGWEB`（管理器/日志/配置/脚本/备份）已全部迁至 `E:\WebProjects\DGWEB\c_drive_mirror\`，与源码同盘；该目录已加入 .gitignore，不会上传

## 核心页面结构
| 页面 | 功能 | 状态 |
|------|------|------|
| index.html | 主页 + 归档 | ✅ |
| search.html | 视频搜索 (封面/分P/模糊搜索) | ✅ |
| ranking.html | 核心使用率 (总榜 + 年榜) | ✅ |
| aliases.html | 干员别名页面 (136 个 6 星) | ✅ |
| map-sim.html | 3D 关卡地图模拟 (Three.js 地形/路线/波次，数据源 ArknightsGameData) | ✅ |
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
- **缓存完成才显示（V0.22 方案，已由 V0.24 blob 分段下载取代）**：`<video>` 以 opacity:0 隐藏（display:none 会被浏览器暂停，无法后台缓冲）+ muted 静音自动 play 触发下载；监听 progress/canplaythrough，`buffered.end >= duration-1`（缓存至片尾可连续播完）才 `pv-video-on` 显示并 seek 到随机起点；60 秒兜底显示防弱网永久黑屏；交互开声后未显示时仅切换静音态，显示时自动有声
- **黑底延迟出现（light 兼容）**：`.pv-stage` 黑底与 `pv-active` 文字浅色覆写不再随 fetch 成功立即出现，改为 `pvStageShow()`（视频缓存完成 / iframe load / 12s 兜底）时触发——视频未加载前 stage 透明、hero 保持白底黑字（light）或默认深色；修复原 `.pv-stage + .max-w` 选择器不匹配（实际类名 `max-w-[1400px]`）导致 light 覆写失效的问题，改用 `body.pv-active` 类控制（线上验证：加载中白底黑字 rgb(20,20,20)，显示后黑底浅字 rgb(244,244,242)）
- **循环黑场过渡**：循环点（dur-6 秒）不再瞬时 seek 跳变——video/iframe 先加 `pv-fade-out`（0.85s 淡出到黑场），黑场停驻 **2 秒**，seek 到新随机起点后移除类淡入（0.8s），整体约 3 秒过渡（线上实测：dur 150.9 时 cur 145.3 淡出 → 黑停 2s → cur 101.2 淡入新起点）
- **【V0.24 定制】分段下载+blob 播放（当前线上方案）**：前端 `pvBlobLoad()` 经 `/pv` 用 Range 每 2MB 分段 fetch 下载**全量** → 累积 bytes 驱动 `#pvProgress` 宽度=已下载/总长(%)，满 100% → `new Blob + createObjectURL` 赋给 `<video>` → `currentTime=9s` 窗口内从头线性播放（弃用 native buffered，因 CF 代理转发的 buffered 报告失真；播放不再随机 seek 跨段以免卡顿）
- **【V0.24 定制】播放窗口裁剪**：`PV_WIN_START=9` / `PV_WIN_END=148`——跳过开头 0-9s LOGO 与结尾 02:28(148s) 之后 LOGO，仅循环 `[9s,148s]`；`pvVideoTick()` 到尾窗 `pvWinEnd()` 即 fade 回绕到 9s，`pvVideoCard()` 卡顿续播上限、`pvRandomStart()` 起点均受窗口约束
- **【V0.24】段失败不退让**：段下载遇 ERR_CONNECTION_CLOSED 等瞬时错误→段内 3 次重试(1.5s/3s/4.5s 退避)+整体 stalled 上限 4 次才放弃，**进度条不再中途消失**、不再丢弃已下字节重来
- **【V0.24】卡顿兜底**：blob 播放时 `waiting` 事件>3s → `pvVideoCard()` 强制 `currentTime+0.15` 续播，播到尾窗回绕 9s；播放线性从头，消除随机起点跨段 seek 卡死
- **【V0.25 定制】下载期无白屏 + 白昼白场过渡**：灰层根因=blob 完成瞬间 `pvStageShow()` 早于视频画面渲染（黑/灰场过渡）；改为 `pvBlobLoad` 完成后不再直接点亮 stage，由 `<video>` 的 `playing` 事件触发 `pvStageShow()`（画面已渲染才显示），**并加 4s `pvStageTimer` 兜底**（自动播放被拒/`playing` 不触发时也准时点亮），iframe 兜底延迟 1200ms→5000ms 避开 B 站白底加载页+黑遮罩成灰雾
- **【V0.25】进度条消失回归修复**：诊断定位=用户交互（滚动/点击）触发 `pvUnlock→pvRender` 时其开头无条件重置 `#pvProgress`（清 loading + 宽 0%），且 stage 依赖 `playing` 事件在自动播放被拒时永不触发；修复=`pvRender` 重置进度条前判断 `window.__pvBlobLoading`（blob 分段下载中不重置），`playing` 监听里取消 `pvStageTimer`；线上验证（Playwright 模拟交互）：blob 下载中点击/滚动后进度条保持 loading 不归零，blob 满 100% 后 stage 点亮、视频实际播放无 error
- **【V0.25】白昼过曝修复**：上一轮把白昼 `.pv-stage::after` 常驻遮罩也改成了 `rgba(244,244,242)` 白渐变(opacity:1)，该遮罩持续叠在视频画面上→画面被冲白=过曝且白字不可读；修复=移除白昼白色 `::after` 覆写，恢复黑渐变（`rgba(0,0,0,.86→.55→.18→.42)`）opacity .72，白场只保留在真正的过渡时刻（fade 期间遮罩透明、露出 `#f4f4f2` 背景）；线上 diag 验证=白昼下 `::after` 为黑渐变，画面中央像素 RGB(87,86,87)、亮度动态 0–255 无过曝
- **【V0.24】白昼无黑块**：`.pv-stage/.pv-frame` 背景 `#000`→`transparent`（light 下透出白底黑字，night 下透出深色），移除 12s 强制显示兜底改 iframe load 触发
- **【V0.24】白昼进度条可见**：进度条移到 hero 独立层（不进 .pv-stage，避免 stage opacity 遮挡），`html.light` 下轨道背景 rgba(127,127,127,.25)→rgba(0,0,0,.15)
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
| **V0.22** | 🔒 定格 | 主页 hero 官方先导PV 全屏背景（缓存完成后随机起点循环播放+静音交互+每日抓取） |
| **V0.23** | 🔒 定格 | 全站图片低清占位(LQIP)加速：站内154+外部647张低清图 + manifest 统一清单 + img-progressive.js（低清→高清淡入替换） |
| **V0.24** | 🔒 定格 | PV 播放链路全面修复+定制：模式缓存修复(9卡→12模式)、PV blob 分段下载进度条、白昼黑块/进度条中途消失修复、播放卡顿修复、播放窗口裁剪 9s~148s(去除首尾 LOGO) |
| **V0.25** | 🔒 定格 | PV 下载期无灰层（playing 才亮 stage + 4s 兜底）；进度条消失回归修复（blob 下载中不重置）；白昼过曝修复（遮罩恢复黑渐变） |
| **V0.26** | 草稿 | PV 质量降级保护 + BILI_SESSDATA 更新（恢复 1080P） |
| **V0.27** | 草稿 | API 验证 |
| **V0.28** | 草稿 | 本地头像修复（141 张官方头像）/ 社区工具修正（特米米、公招计算）/ PV 质量降级保护 |
| **V0.29** | 🔒 定格（2026-08-15） | 3D 关卡地图模拟 map-sim.html（Three.js + ArknightsGameData + Spine 动画） |
| **V0.30** | 草稿（当前） | 官方地块固有色：地图模拟切换官方配色（data/tile_colors.json） |

**同步流程**：
1. 主目录 (`E:\WebProjects\DGWEB`) 修改
2. 同步到 `E:\WebProjects\versions\DGWEB\DGWEB_V0.30\`
3. 上传 GitHub → CF Pages 自动部署（1~3 分钟）
4. 线上验证（网络波动时多轮重试）
5. 更新 `V0.30\版本说明.txt`

**版本变更历史（自动汇总）**：
- 管理器「理解AI」每次点击时，自动扫描 versions 下**所有已定格版本**的版本说明.txt，
  汇总生成 `ai_handoff\版本变更历史.md`（按版本号旧→新排列，含各版改动说明）
- 每次「定格版本」后，点一次「理解AI」即可让 AI 文档包包含最新定格改动
- 草稿版本（状态=草稿）不会进入自动汇总；「定格+复刻」会额外把草稿段落（改动说明）追加到历史文档与 AI_PROGRESS.md 末尾

## 项目规范 (用户要求，必须遵守)
1. **不扩大问题范围**: 修改只针对出问题的页面/功能，禁止全站批量改动（样式/滤镜/结构），除非用户明确批准
2. **先局部后全局**: 先改单页验证，通过后再请示是否推广
3. **改动前确认影响面**: 批量操作（正则替换、多文件修改）前先评估涉及文件数
4. **版本同步优先（随时确认最新版本）**: 每次改动前先确认 `E:\WebProjects\versions\` 下最新版本（最高版本号）为工作目标；核对最新版本目录的项目文件是否完整（与主目录对比，页面/数据/脚本齐全）；**完整则只在最新版本目录中修改并同步**；**不完整则先从主目录补齐文件到最新版本，再在最新版本上修改**；改动完成后同步更新项目文档（`AI_PROGRESS.md`、最新版本 `版本说明.txt`）
5. **保留原始风格**: 灰度滤镜等是站点设计风格非 bug，不得随意修改，除非用户要求
6. **中文交流**: 与用户交流一律简体中文
7. **文档同步**: 每次重大改动后更新 `AI_PROGRESS.md` 和 `版本说明.txt`

## 当前进度 (2026-08-15)

### V0.30（草稿）
- 【2026-08-15 V0.30 创建】V0.29 经用户确认定格并复刻为 V0.30（草稿）继续开发
- 【2026-08-15 官方地块固有色】新增 data/tile_colors.json（61 条，覆盖本地关卡 36 种地块）：官方 gamedata 无配色字段，颜色取自参考站 MapSimulator 源码硬编码固有色（ref_solid）+ 官方地图纹理图集 tiles1.png 单元格采样（atlas）+ 参考站默认规则（ref_default，官方无专色的 creep/mire/rope 等）；红蓝门/绿门用官方描边色保持可见（v.border 优先）
- 【2026-08-15 地图模拟官方配色】map-sim.html 新增 TILE_COLOR_URLS，init 时加载 tile_colors.json 覆盖默认深色 TILE_COLORS（失败保留原色兜底）：高台 #c1c1c1、路面 #747474、禁行 #191919、地面 #555146、深水 #086e8d、红门 #e03253、蓝门 #359dde；本地+线上验证 v20260815a，0-1 渲染采样到官方路面/高台色；版本标记 v20260814g→v20260815a
- 【2026-08-15 官方配色回退】用户反馈纯色平涂难看、无场景模型衬托；撤掉 TILE_COLOR_URLS 与 init 覆盖逻辑，恢复 V0.29 深色 TILE_COLORS（road #333333 / wall #4b4b4b / floor #202020 等）；tile_colors.json 保留作数据参考不再应用；版本标记 v20260815a→b，已部署
- 【2026-08-15 飞行敌人高度修复】飞行敌人原逐帧 tileSurfaceY 贴地，过高低台会上下起伏；改为路线构建时计算固定飞行高度 routeFlyY = 全程最高地形顶（检查点+线段 0.25 格采样，覆盖墙顶）+0.25，飞行脚底恒定、阴影投影脚下地面，地面敌人贴地不变；camp_01 妖怪 route 68 脚底恒定 0.92，本地+线上 v20260815c 验证通过
- 【2026-08-15 时间轴标记点】关卡进度条新增「打点1/打点2」双标记（黄/青双刻度 + 清除按钮）：「重播」从最早标记开始，「重置」仍从 0，换关卡自动清空；两个标记同时存在时在两点间循环播放（到后点自动回前点并复位片段状态：敌人重播/击杀重置/兔洞切路线还原；暂停拖拽不回绕）；本地+线上 v20260815d/e 验证通过
- 【2026-08-15 重置缩放】点「重置」同时恢复关卡初始缩放（build3D 保存 camHome 初始相机位姿，resetZoom 恢复）；「重播」保持当前缩放；本地+线上 v20260815f 验证通过
- 【2026-08-15 部署干员（参考 PRTS.Map）】「部署格」打开部署面板（官方 operator_table 425 名干员 + range_table 73 范围模板）：搜索干员→点可部署格放置（稀有度色圈+名字+朝向箭头）→点干员弹菜单调 4 向朝向、点技能查看技能开启后的攻击范围（橙色高亮）、撤离；范围按官方 grids（col=前方/row=侧向）随朝向旋转；换关卡清空；本地+线上 v20260815g 验证
- 【2026-08-15 部署干员增强】面板新增职业/星级筛选 + 官方头像（Aceship avatars，失败回退色圈）；部署后场上生成干员 Spine 模型（isHarryh/Ark-Models 官方模型 425 名全覆盖，复用敌人 Spine 离屏管线，脚底贴地+稀有度底座圆环+白色朝向箭头，朝左镜像）；本地+线上 v20260815h 验证

### V0.29（定格 2026-08-15）
- 【2026-08-15 定格】V0.29 经用户确认定格，复刻为 V0.30 继续开发
- 【2026-08-14 部署上线】V0.29 全量上线：map-sim.html / enemy.html / data 索引与 36 个剿灭关卡本地数据 / functions/spine 代理 / Spine 库 / 官方地图贴图；补齐 camp_r_20、camp_r_23 本地关卡 JSON（此前 0 字节）；单次提交推送 GitHub，CF Pages 自动构建
  - 【2026-08-14 敌人模型修复】Spine 资源源改从 GitHub 公开仓库（参考站后端 serine-qing/MapSimulatorBackend 的 public/）经 jsDelivr / raw.githubusercontent 直接加载（敌人 spine/<key>/*、道具 trap/*）；/spine 代理仅保留数据接口（getMeshsKey/getTrapsKey）。原因：CF Worker 不能 fetch 裸 IP（1003）、sslip/nip 域名被参考站防盗链按 Host 白名单拦截、socket 在本项目不可用。线上验证：默祷圣祠 401/401 敌人应用 Spine 模型、0-1 11/11，资源全部 200
  - 【2026-08-14 回退占位贴地】Spine 资源加载失败时的回退占位（敌人头像/圆形标记）原为居中贴在 1:1 平面上导致悬浮；改为内容底部对齐画布底部（bottomAlignAvatar + 圆标下移），缓存命中路径同步修复；Spine 模型不受影响（实测仍 401/401 贴地）
  - 【2026-08-14 头像回退移除】按用户要求：Spine 加载失败时不再显示头像立绘（动作立绘易显悬浮），只保留位置标记（底部对齐圆标 + 阴影）；makeEnemySprite 移除 TextureLoader 头像加载与 bottomAlignAvatar；Spine 正常路径不变（401/401 贴地）
  - 【2026-08-14 脚底锚点改全程最低点】跑动/弹跳动画的脚底最低点会上下浮动，原锚定首帧导致模型大部分帧悬空；改为动画循环内持续取全程最低点（跑完 1.3 圈锁定，与参考站根节点锚地等价）。0-1 验证：剑士 bodyBottom 0.855→0.891、史莱姆 0.773 不变；GROUND_SINK 调至 0.02 防压扁
  - 【2026-08-14 跑动空隙压平】跑动/弹跳帧脚底会离地（0-1 剑士约 0.05 格），高分辨率下呈 2-3px 空隙像悬浮；GROUND_SINK 0.02→0.045 压住空隙（最低帧脚底微入贴图层吸收），深放大验证贴地且底部完整无压扁
  - 【2026-08-14 身体后仰补偿（定位错误根因）】纸片模型倾斜导致身体整体偏移到格子后方（z 减小），放大后呈“飘在格子后方/上方”；新增 modelLeanShift（-0.45*scl*sin(tilt)）把模型前移使身体对齐格心（参考站 -0.15 深度偏移同思路），敌人/道具/占位全部应用；参考环改为每个敌人一个并逐帧跟随；验证：模型脚底贴合黄色参考环、身体居中
  - 【2026-08-14 倾斜恢复】ENEMY_MODEL_TILT 恢复 -0.5（-0.35 会压低模型观感），身体对齐由 modelLeanShift 自动适配（0.30-0.38 格前移）；验证：高度正常不压扁、脚贴环、身体居中
  - 【2026-08-14 模型放大】数据核对：本站 57.5° 视角下模型显高仅 0.31 格、参考站约 0.5 格；新增 MODEL_SCALE_MULT=1.55（敌人/道具/占位统一），实测比例升至 0.49，不再压扁
  - 【2026-08-14 相机对齐参考站】模型尺寸恢复官方值（MODEL_SCALE_MULT=1.0，世界尺寸与参考站/官方一致 0.15×骨架高）；"压扁"实为 57.5° 陡视角所致，相机俯仰改为 40°（拉远补偿保证地图完整），官方尺寸下模型显示比例 0.52 对齐参考站；0-1 与默祷圣祠验证无报错
  - 【2026-08-14 罚站切待机动画】WAIT 检查点/移速 0 罚站期间敌人动画切换为 Idle（参考站同款），恢复移动切回 Move；pickIdleAnimation 按 Idle/Idile 匹配；验证 1212_mtrfol 罚站窗口内 Idle、出窗后 Move
  - 【2026-08-14 模型清晰度】Spine 离屏渲染画布 128→256（输出画布+共享渲染器画布+缩放公式 19.2→38.4+归一化 /256）；萨科塔之翼显示小所以原来清晰、大模型贴图被放大所以糊；升级后全模型清晰
  - 【2026-08-14 模型裁剪修复】256 升级遗留行拷贝错误：putImageData 前每行只复制 src+512 字节（128 像素），256 画布右半恒为透明，模型视觉上「被裁剪成一半/半透明」；改为 src+1024 整行复制。本地 Playwright 验证：19 敌人 Spine + 3 道具 Spine 全部全宽渲染（enemy_1212_mtrfol bbox [48,32,127,218]→[48,28,252,217]，右半 7778 不透明像素）；状态栏版本标记 v20260814f→g
- 新增 `map-sim.html` 3D 关卡地图模拟：支持 `?id=关卡代号`，Three.js 地形 + 路线 + 敌人波次动画，数据源 ArknightsGameData，本地索引 `data/stage_index.json/.js` / `data/enemy_index.json/.js`
- 接入官方美术资源：关卡「官方地图」预览与敌人头像，源为 yuanyan3060/ArknightsGameResource，fexli/ArknightsResource 兜底
- 3D 视觉精致化：ACES 色调映射、软阴影、半球光/轮廓光、路线点阵光带、敌人 Sprite 贴图
- 红蓝门方向明确：敌人从红门出生（`gate_red.png`）、进入蓝门消失（`gate_blue.png`）
- 场景贴图优化：接入官方 `tiles1` 图集，地板/草地/楼梯/传送点/火山/治疗等格子使用官方顶部贴图
- 路线数据修复：只使用 `MOVE` 检查点，忽略 `WAIT_FOR_SECONDS` 的 `(0,0)` 占位，避免路线乱跳
- 路线寻路：使用明日方舟 Stage-Viewer 同款 A* + 视线优化，路线起点对齐红门、终点对齐蓝门，不再穿墙
- 敌人动画：场景内敌人从静态头像改为官方 Spine 3.8 动画，WebGL 离屏渲染后贴入 3D 场景，加载失败自动回退头像
- 修复动画透明/闪烁：WebGL 帧经 `readPixels` 快照到 2D 画布，并按加载时固定比例和中心渲染，避免动画过程中忽大忽小
- 修复模型垂直翻转：动画贴图恢复默认 `flipY`，敌人头朝上显示
- HTTPS 适配：`functions/spine/[[path]].js` 同源代理仅代理数据接口（getMeshsKey/getTrapsKey/getTokenCards）；敌人/道具 Spine 资源由页面直接加载 GitHub 公开仓库 serine-qing/MapSimulatorBackend 的 public/（jsDelivr 主 + raw 兜底），避免混合内容拦截与参考站防盗链
- 官方地图预览保留在独立弹窗；「叠图」改为与地图格子严格对齐的示意底图，不再把透视截图的官方地图平铺到 3D 地面
- 修复 3D 模型与底图错位：地形/路线/敌人坐标统一到地图坐标系
- 相机锁定旋转与平移，仅保留缩放
- 使用官方相机数据（map_camera_views/summary.json）设置并锁定官方视角
- 官方视角统一使用 `view_default`，Unity Y/Z 映射为 Three.js 深度/高度，呈现高视角 3/4 视图，避免 `view_by_side` 把部分关卡带成侧视歪斜
- 红蓝门左右校准：对照参考站确认 `0-1` 红门右、蓝门左，相机投影矩阵做 X 镜像，缩放保留、旋转锁定不变
- 版本回退保障：`c_drive_mirror\tools\version-mgmt\` 提供 manifest / 版本清单 / 完整性校验 / 回退脚本；新版本自动生成 `codex-会话.md`
- 选关「活动」模式活动名修正：活动名改用官方 activity_table `basicInfo`（`zoneToActivity` 关联 zone→活动），不再显示子区域名/zoneId；按活动开始时间倒序排列（最新活动「奇象巡展」置顶）；隐藏带「不展示」标记的 RPG 关卡区
- 场地道具渲染：解析关卡 `predefines.tokenInsts` 预置部署物（如「直到大地变成一颗酸橙」的信箱 `trap_334_agmbox`），用官方 Spine 动画（`trap/spine/...`，Trap_Idle）渲染到对应格位并脚底贴地；`functions/spine/[[path]].js` 同源代理扩展支持 `getTrapsKey` 接口与 `trap/` 资源路径；静态贴图道具走 `trap/image/` 兜底，加载前显示占位标记
- 活动传送门机制（兔洞）：解析 `tile_rabbithole_in_*` / `tile_rabbithole_out_*` 传送格，敌人踩到入口后消失 3 秒，再按出口 `prob` 权重随机从出口出现，并改走 `extraRoutes[action_index]` 出口路线（按官方检查点折线，出2 出口会沿洞区走进地穴被击杀）抵达蓝门；出口概率百分比直接标在地面（参考站同款样式）
- 地穴实装：`tile_hole` 按官方 `passableMask` 判定通行（活动关卡中为可通行洞穴），路线起点按官方数据从地穴洞口/传送门出口/地图中段出生（不再吸附红门）；洞口渲染为黑色圆坑；地面（WALK）敌人走进地穴直接掉坑死亡（计入击杀），飞行（FLY）敌人按路线检查点直线飞行、无视高台/墙/禁行/地穴；顺带修复 A* 优化循环在相邻格访问差 >1 时的死循环隐患
- 敌人路线默认隐藏（参考站同款）：点击地图上的敌人自动暂停播放并高亮显示该敌人的路线，点击空白处隐藏全部路线；图例区附操作提示
- 点击敌人弹出详情菜单（参考站同款）：头像/名称/ID/类型（地面·飞行）/波次·路线·进度/六维属性（HP ATK DEF RES SPD WT），自动暂停，点击空白处或 × 关闭
- 敌人详情页 `enemy.html`：菜单内「查看详情」按钮跳转；页面支持按 ID/名称搜索（2130 敌人），展示头像/名称/ID/官方描述/能力列表/基本信息（移动·攻击方式·范围·目标值·伤害类型·标签）/技能（prefabKey·优先级·冷却·SP 消耗·blackboard 参数）/天赋（talentBlackboard 参数）/各等级六维属性；数据源官方 enemy_database + enemy_handbook_table（`data/enemy_detail.json/.js`）
- 敌人详情页技能/天赋参数友好显示：天赋按前缀分组（如 ThrowBomb，官方数据无中文名故以 chip 呈现内部 ID），参数转中文标签+单位（间隔 1s / 攻击力倍率 100% / 动画时长 2s），区块命名「天赋参数」并注明含义见能力/描述；原始 key 悬停可见；修复 duration 含 ratio 子串导致的百分比误判
- 敌人详情页天赋/能力按 PRTS 补全可读中文描述（2026-08-13）：以 PRTS 页面为准，为「小刻的追番小屋」act53side 9 种敌人（戴面具的孩童/入戏太深的孩童/“大披风”/惊艳事热衷者/“惊喜信件”/“美食的奴隶”/炫目刀技厨师/热心肠老板/浮空信件/信使安洁莉娜）新增 `prts_desc`/`prts_talents` 字段并修正官方 desc 中被裁剪的占位符（如「夺取攻击范围内的<浮空信件>」）；天赋参数卡直接显示「能力/描述：每秒从自身模型向自身所在位置发射披萨弹道…」等可读文本；描述区优先展示 PRTS 可读文本；已同步 `data/enemy_detail.json/.js` 与 V0.29
- 敌人详情卡/详情页抗性信息 + 属性中文化（2026-08-13）：`enemy_index.json/.js` 重新生成，补充官方 attributes 的元素抗性（epResistance）、损伤抵抗（epDamageResistance）与异常免疫（晕眩/沉默/沉睡/冻结/浮空/麻痹/恐惧免疫）；地图模拟点击敌人的卡片直接展示能力 chips + PRTS 可读描述/天赋文本 + 抗性，六维与属性全部改中文标签（生命/攻击/防御/法抗/移速/重量/元素抗性/损伤抵抗/异常免疫/攻击间隔）；敌人详情页基本信息区同步加元素抗性/损伤抵抗/异常免疫
- 叠图升级为官方地图低透明盖层（2026-08-13）：地图模拟「叠图」按钮加载官方地图图片（yuanyan3060/ArknightsGameResource map/ 目录）作为低透明度（0.35）平面，置于 3D 地形之上、场景贴图/敌人/道具之下（renderOrder=0.5，y=0.8、depthTest 关闭），参考底图不遮挡场景贴图、敌人与道具；路线提升至 renderOrder=3 避免被参考底图遮挡；加载失败自动回退原格子示意图；仍可点按钮开关
- 叠图透明度/缩放滑块（2026-08-13）：叠图开启时显示「透明度」与「缩放」两个滑块（默认 35% / 100%），实时调整官方地图盖层的透明度与平面缩放（以地图中心为基准），可手动对齐参考图；关闭叠图时滑块自动隐藏，数值在关卡切换间保留
- 叠图 X/Y 偏移滑块（2026-08-13）：官方地图图片为 16:9 场景缩略图（非纯格子图），自动对齐不可靠；叠图新增 X/Y 位置滑块（±100%，以格子区域半宽/半高为幅度），配合缩放可手动把官方地图精确对齐到 3D 格子区域
- 格子边缘线改细（2026-08-13）：3D 格子边缘从整块立方体 12 条边的 EdgesGeometry 粗线改为只画顶面 4 条细分割线（深色 #171a1f、opacity 0.45、抬升 0.006 防 z-fighting），保留清晰分割感、消除粗线与缝隙观感
- 高台缝隙消除（2026-08-13）：用户反馈高台间缝隙仍粗；格子宽度 0.96/0.99 → 1.0 完全贴合，顶面贴图 0.86 → 0.98 铺满，顶面分割线 opacity 0.45 → 0.22，高台之间不再露出深色缝隙，仅保留极淡分割线
- 缝隙微调（2026-08-13）：用户反馈 1.0 完全贴合后反而不好看；格子收窄至 0.985、顶面贴图 0.955，保留约 0.015 极细缝隙与贴图边缘，兼顾分割感与整洁
- 可部署地块高亮（2026-08-13）：工具栏新增「部署格」开关；按官方 buildableType（MELEE/RANGED）在可部署地块上叠加绿色斜线排线高亮（45° 斜线 canvas 纹理），并随动画缓慢闪烁（透明度 0.3~0.8 正弦脉动），仿干员技能范围预览；再次点击关闭
- 剿灭作战全量实装（2026-08-13）：zone_index 生成脚本修复按 code 去重导致的剿灭关卡丢失（剿灭 code 为地区名，同区多关重复），改为按关卡唯一 id 收录；「剿灭」模式现含全部 36 个剿灭作战（15 个地区分区：炎国/乌萨斯/卡西米尔/汐斯塔/伊比利亚/萨尔贡/玻利瓦尔/哥伦比亚/维多利亚/拉特兰/莱塔尼亚/谢拉格/阿戈尔/卡兹戴尔），含最新 r_32 朱墙食府、r_33 默祷圣祠；分区名显示「地区 剿灭」；选关点击改用关卡 id（camp_r_32 等）加载，findStage 支持 id 精确匹配
- 剿灭模式全列（2026-08-13）：用户要求剿灭直接全列、不要活动/分区选择；「剿灭」模式下隐藏活动下拉，按 id 去重后直接平铺显示全部关卡（36 个剿灭作战 + 周常资源关），点击即加载
- 剿灭模式去除资源本/芯片本（2026-08-13）：用户反馈剿灭关卡不全且混入资源本/芯片本；zone_index 生成脚本 annihilation 类型由 CAMPAIGN+WEEKLY 改为仅 CAMPAIGN；「剿灭」模式现在只显示 36 个真正的剿灭作战（15 个地区分区），PR/LS/AP/CA/SK/CE 等资源本、芯片本不再出现在剿灭列表
- 剿灭列表排序与标题（2026-08-13）：剿灭卡片改为大标题=关卡名、小标题=地区名；按官方关卡 id 开放顺序倒序排列（camp_r_33 默祷圣祠最新在前、camp_01 切尔诺伯格最早在后），越新越靠前
- 剿灭 URL 用关卡 id（2026-08-13）：修复点击剿灭后 URL 回写地区名（code）导致刷新白屏的问题——同地区多关 code 相同，findStage 会命中错误关卡；URL 改用唯一关卡 id（?id=camp_r_33）
- 剿灭关卡本地数据 + 白屏修复（2026-08-13）：用户反馈默祷圣祠白屏/黑屏，根因是关卡 JSON 依赖 jsDelivr CDN，CDN 不可达时加载失败；已将全部 36 个剿灭关卡 JSON 下载到 data/levels/ 本地，map-sim 加载顺序改为「本地 data/levels/ → CDN 兜底」，CDN 不可达也能正常渲染；本地 script 数据文件加版本号 ?v=20260813c 防缓存
- 剿灭关卡白屏根治（2026-08-13）：用户反馈默祷圣祠仍白屏；根因升级为 Spine 敌人每类一个 WebGL 上下文（默祷圣祠 19 类敌人 + 主渲染器 = 20 个，超过浏览器 16 个上限），最早创建的主场景渲染器上下文被浏览器回收导致 3D 区空白；重构为全部 Spine 敌人/道具共用一个 WebGL 上下文（逐骨架渲染 + readPixels 快照），上下文数从 20 降到 2；本地验证默祷圣祠 19 种敌人正常渲染、主渲染器不丢失，TO-EX-2/0-1 无回归
- 敌人移速与罚站时间实装（2026-08-13）：用户反馈默祷圣祠「雕像飞走了，没有罚站时间」；根因一：模拟器所有敌人统一按 0.9 秒/格移动，忽略官方 moveSpeed，圣徒祈祷像（移速 0.0）这类不动雕像被直接送走；根因二：路线 WAIT_FOR_SECONDS（5~120s）检查点被整体忽略；修复：按官方 moveSpeed 计算移动耗时（移速 0 = 原地罚站不移动不结算），WAIT_FOR_SECONDS 的 (0,0) 占位按「当前位置罚站」解析并挂到路径进度（path.waits），新增 routeTimeToProgress/routeProgressToTime 换算，兔洞到达时间与出口路线同步计入罚站；验证默祷圣祠雕像原地不动、90/120s 罚站冻结进度、maxTime 1697s 计入，TO-EX-2 兔洞、0-1 无回归；补充修复：移速 0 敌人在罚站分支跳过逐帧脚底定位导致半截入地（圣徒祈祷像 y 停在地面高度），现罚站分支同样执行脚底贴地定位，雕像全身完整站立
- 场地机制核对与修复（2026-08-13）：① 中立单位位置：tokenInsts 坐标与路线同为自底向上，buildTrapMeshes 漏 y 翻转导致 11 个预置单位（圣堂奶/唤醒者/射手）垂直镜像错位（Milk 7 8 落在 forbidden 格、射手站低地路面），已按地图行数翻转，4 个射手全部落高台；② 经典传送门：tile_telin→tile_telout 此前只渲染贴图无传送逻辑，敌人直接穿过；官方路线用 DISAPPEAR + APPEAR_AT_POS 检查点编码传送，已按官方语义实现「走到入口 → DISAPPEAR 隐藏（含入口罚站时间）→ APPEAR_AT_POS 在出口出现 → 走出口后检查点折线至蓝门」（与参考站 disappear/appearAt 一致），兔洞格（tile_rabbithole_*）排除避免与随机出口逻辑双处理；③ 入梦砖：官方图集无独立 tile_sleep_road 贴图，按参考站 `tile_sleep_road = tile_sleep_wall` 复用入梦砖墙官方贴图（本地 images/map/tile_sleep_wall.png），基础色保留蓝灰 0x3a4060 区分，睡眠机制（沉睡）未模拟（模拟器无状态系统）；④ 中立单位尺寸按参考站推导：参考站敌人网格乘 z1（默认 0.9），道具不乘缩放（1.0），故道具 = 敌人公式 ÷ 0.9 = 19.2/anim.scale/0.9（精灵约 1.37~1.39 格、身体约 0.76 格），脚底抬升幅度 0.7 保留居中；验证默祷圣祠 11 单位位置正确且渲染正常、route 28 敌人入口隐藏/出口出现时序正确、TO-EX-2 兔洞 82 个不受影响、0-1 无回归
- 敌人罚站倒计时（2026-08-13）：工具栏新增「罚站倒计时」按钮（参考站「显示等待时间」同款），开启后在地图上以 DOM 标签实时显示正在罚站敌人的剩余秒数（≥10s 显示整数、<10s 显示一位小数，<5s 变绿变小），标签跟随敌人屏幕投影位置、随播放/拖拽实时更新，关闭按钮即清除全部标签；仅显示可见敌人（传送门/兔洞隐藏期间不显示）
- 模型渲染改为参考站同款「纸片贴地图」（2026-08-13）：用户反馈影子才是本体、上边模型只是动画；将敌人/道具从始终面向相机的 Sprite 广告牌改为平面网格（PlaneGeometry + 底部枢轴 + 倾斜 ENEMY_MODEL_TILT=-0.5rad），脚底锚定格子中心、与影子对齐（参考站 MAP_ROTATION=0.5，但模拟器相机俯仰 -57.5° 更陡，需反向倾斜才可见且像立绘贴地图）；readPixels 验证模型中心像素随显隐变化、0-1/默祷圣祠/TO-EX-2 渲染正常无报错

### ✅ V0.25（已定格） PV 下载无灰层 + 播放回归修复 + 白昼过曝修复
- [x] 灰层根因定位：A/B 独立禁用各元素证明灰非 iframe/video/进度条/网格——时间线（diag_timeline）t1s 白 244→t2s 灰 201，禁用 h1 恢复 240，误导指向 H1；后用户反馈「3 分钟干净后灰才出现」推翻 H1 论（H1 500ms 即显示）
- [x] 真根因：blob 下载完成瞬间 `pvStageShow()` 早于视频画面渲染——`v.src` 已挂、画面未出，`.pv-stage` 黑底+渐变遮罩暴露 = 黑/灰场过渡（视频未加载完白底黑字 → 下载完瞬间变灰）
- [x] 修复 1：`pvBlobLoad` 移除立即 `pvStageShow()`，改由 `<video>` `playing` 事件（index.html）触发——画面真正渲染后才点亮 stage；线上验证下载 0~215s 全程干净（active=false、stage 无 ready、无灰层），100% 时 active+readyState=4+currentTime=12s 同步点亮
- [x] 修复 2（回归补强）：`playing` 依赖自动播放策略可能永不触发→`pvBlobLoad` 在 `v.src=objUrl` 后、`play()` 前加 `pvStageTimer=setTimeout(pvStageShow,4000)` 兜底，`playing` 事件里 `clearTimeout(pvStageTimer)`（能播时先去兜底）
- [x] 修复 3：iframe 兜底 `pvStageShow` 延迟 1200ms→5000ms（index.html:694），避开 B 站白底加载页 + 黑渐变叠出的灰雾
- [x] 修复 4（进度条消失回归）：诊断=用户交互（滚动/点击）触发 `pvUnlock→pvRender`，其开头无条件 `bar.classList.remove('loading')` + 宽 0% 重置；`pvRender` 改为先判断 `window.__pvBlobLoading`，blob 分段下载中不重置进度条。线上验证（diag_interact.py 模拟点击/滚轮）：blob 下载中进度条始终 loading、宽度不被清零，100% 后 stage 点亮视频播放（paused=false）
- [x] 修复 5（白昼过曝回归）：白昼 `.pv-stage::after` 白渐变遮罩（rgba(244,244,242) opacity:1）持续叠在画面上→过曝；移除 `html.light` 白场 `::after` 覆写恢复黑渐变 opacity .72（白场只在 fade 过渡瞬间露出背景色）。线上 diag_light 验证=light 下 afterBg 为黑渐变、画面中央像素 RGB(87,86,87)、亮度 0–255
- [x] 已上线：白昼遮罩修复 uploaded → CF Pages 构建 → 线上验证全部通过

### ✅ V0.24（已定格） hero PV 播放链路全面修复+定制
- [x] 模式入口缓存修复：modes.html + 12 个 mode-*.html 的 localStorage cache key 版本化 `dgdata_v12_` + TTL 3h→10min（旧 9 模式缓存作废，恢复 12 卡片）
- [x] PV 播放方案演进：弃用官方 iframe 改 `/pv` 代理直链播放 → 实测 CF 代理 206 可用 → **分段下载+blob 播放**（Range 2MB/段全量下载→Blob→objectURL→video，满 100% 才播）
- [x] 白昼模式 PV 黑块修复：`.pv-stage/.pv-frame` 背景 #000→transparent，移除 12s 强制显示兜底（改 iframe load 触发），light 下渐晕减淡
- [x] 进度条真实下载进度：`#pvProgress`（hero 独立层）宽度=已下载/总长(%)，下载满 100% 淡出播放
- [x] 进度条中途消失修复：后端段失败(ERR_CONNECTION_CLOSED)不再整体放弃——段内 3 次重试+退避 → stalled 上限 4 次，进度持续可见不重来
- [x] 播放中途卡死修复：blob 线性从头播（尾段 seek 回起点循环，去掉随机跨段 seek）+ `waiting>3s` 强制续播兜底 `pvVideoCard()`
- [x] **播放窗口裁剪**：跳过开头 0-9s LOGO + 结尾 02:28(148s) 之后 LOGO，仅循环播放 [9,148]；`pvRandomStart` 起点随之受限
- [x] 线上验证全部通过（首播起点 9.4s、回绕 150→9.9s、blob 计重试/进度/卡顿均无异常）
- [x] 版本已定格；功能提交 8920152 + 窗口结尾调整 2bf64ec，文档同步完成

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
- V0.30（官方地块固有色）已部署上线试运行，待用户确认后定格；V0.26/V0.27/V0.28 草稿待定

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
| PV 数据抓取 | `fetch_ark_pv.py` / `run_ark_pv.py`（本机计划任务 DGArkPVSync 每小时跑） |
| PV 播放逻辑 | `index.html`（pvRender/pvBlobLoad/pvVideoTick/pvVideoCard/pvWinEnd + PV_WIN_START/PV_WIN_END） |
| PV 代理 | `functions/pv.js`（CF Pages Function，`/pv?url=` 带 B 站 Referer 代发 Range） |
| 模式构建保护 | `_build_modes.py` / `_gen_mode_pages.py`（自动构建不覆盖） |
| 本地预览 | `serve_preview.py` (端口 8844) |
| **项目管理器/日志/配置** | `c_drive_mirror\manager.ps1` + `c_drive_mirror\projects.json` + `c_drive_mirror\logs\DGWEB.md`（2026-08-07 由 C:\DGWEB 迁入） |
| **计划任务脚本** | `c_drive_mirror\run_local_task.ps1`（DGWEB_DataFetchHourly 每日抓取上传） |

## 部署流程
```
1. 主目录修改 → 同步到 versions\DGWEB\DGWEB_V0.29\
2. python upload_all.py（批量）或 upload_single.py 文件名（单文件）
3. 等 CF 构建（1~3 分钟），多轮重试验证 https://dgwebq.pages.dev/
```

## 后续 AI 接手指引
1. 先读 `AI_PROGRESS.md`、`ai_handoff/` 同步副本、`V0.29\版本说明.txt`
2. 本地预览 `serve_preview.py`（8844，注意服务的是 Default Project 目录，验证前需先复制页面过去）
3. 改动前遵守项目规范（不扩大范围、先局部后全局）
4. 改完同步 V0.25 → 上传 → 验证 → 更新文档
5. **每次输出项目概要时，最后输出最近两次改动内容**（见文末 V0.27/V0.28 草稿段）

> **核心原则**：小步快跑，先局部后全局，不扩大问题范围，保留原有设计意图。

## V0.27（草稿）  2026-08-10
- api verification（API 验证）

## V0.28（草稿）  2026-08-11
- 核心使用率与别名干员头像修复：全部改用本地头像（141 张官方头像，纯 hash 文件名 a_[hash].png，375 处引用），两个页面无远程头像引用
- 社区工具修正：图米米→特米米；公招计算跳转改为 https://prts.wiki/w/公招计算（26 页面）
- PV 质量降级保护与 BILI_SESSDATA 更新（quality=80/1080P）
- 本版本由主目录全量对齐同步（175 个文件更新，清理 141 个旧编码头像文件名）
