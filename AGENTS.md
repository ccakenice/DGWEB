# DGWEB Project Progress

明�日方舟(Arknights)资料站 Web 项目。核心部件: map-sim.html(3D 关卡模拟器)。

## 进度摘要(持续更新)

### 已完成
- **敌人出场时序**(map-sim.html): buildEnemyMeshes 初始 visible=false;updateEnemyPositions 按 spawnAt 出场(未到隐藏),progress>=1 时 visible=false + scene.remove + 数组 filter(蓝门终点销毁);applySpineMeshes 替换 Spine 立绘时继承 visible 并 remove 旧占位 sprite;resetBtn 重置全隐藏。**抢跑根因**: Spine 异步替换时新建 sprite 默认可见(未继承旧 visible);applySpineMeshes 替换时未移除旧 sprite(残留 scene)。验证: 0-1/6-5 期望出生序列与代码 spawnAt 完全一致(0 mismatch,无抢跑),播放结束 scene 内敌人 Sprite 清零(enemiesLeft=0, sceneSprites=0)
- **样例审核流程**: tools/tmp_make_samples.py 生成官方图+3D 渲染对照图 → tools/samples/sample_{0-1,1-7,2-1,3-8,6-5}.png;量化核对官方图主色与配置色一致;2-1 修正为 #3c4459(旧 #667697 偏亮,官方图为暗蓝灰 #404060 系);**用户已确认示例,配色方案合格**
- **高台配色批量生成**: tools/gen_highland_colors.py 从官方地图图提取高台主色 → data/highland_colors.json(断点续跑,每 40 关自动增量保存)
- **图源(重要)**: 官方地图图 = GitHub 仓库 raw.githubusercontent.com,与页面本身同源:
  - 主源: `yuanyan3060/ArknightsGameResource/main/map/{main_00-01.png / a001_01.png}` (320x180 主线图, ~100KB)
  - 备源: `fexli/ArknightsResource/main/mapreview/` + jsdelivr CDN
  - 文件名 = levelId 尾段: 主线 `main_03-08.png`, 活动 `a001_01.png` (勿猜 `3-8.png`)
  - **yuanyan.cc / cdn.yuanyan.cc / mn.yuanyan.cc 个人 CDN 已永久下线,不可再用**
  - **PRTS wiki 对本机 IP 403 WAF,不可用**; 腾讯系 CDN 无此资源
- **本地官方图包(重要)**: tools/ArknightsGameResource-main/map/ 已解压 3055 张(从 yuanyan3060 仓库 codeload 整包 3.7GB 提取,2026-08-12)。批量提取优先读本地,0 网络依赖
- **批量管线**: stage_index 去重后共 1834 关;1471 关本地图直接提取成功;~363 关缺图(训练 training/晋升 promote/周常 weekly/集章等官方无独立图 + 部分新活动图需网络补 fexli 源)。`--local-only` 参数只跑本地
- **网络特性**: raw.githubusercontent.com 与 jsdelivr 均不稳定(秒级~90s 波动,时通时断);api.github.com 稳定;codeload.github.com 快(7.8MB/s,整包下载首选);GitHub API 未认证限流 60 次/h(大量单文件二进制请勿走 api contents)
- **网络健壮性**: 客户端必须用 httpx 严格 Timeout(connect+read) —— Windows 上 requests/urllib 的 TLS 握手不吃 socket 超时,8 线程批量曾因此卡死 40 分钟。httpx 已 pip 安装
- **光照过曝修复**(map-sim.html): hemi 0.95→0.45, dir 1.7→0.85, point 0.85→0.5, exposure 1.18→0.92。修复#080808 高台顶面被 ACES 提亮成 ~100 灰的问题
- **camera mirror 修复**: setCamera 与 resize 两处 projectionMatrix 乘 makeScale(1,1,1);此前 resize 残留 makeScale(-1,1,1) 会窗口缩放后镜像翻转
- **页面接入配色**: HL_URLS(state 常量) 加载 highland_colors.json;tile 材质数组 [x+,x-,y+(顶),y-,z+,z-] 中 index=2(顶面)用 hlColor;isHighland = heightType==='HIGHLAND' 且非 wall
- 回归脚本: tools/tmp_regress_final.py(0-1 门位置+resize 镜像), tools/tmp_topcheck.py(高台顶面色), tools/tmp_hlcheck.py

### 已知坑
- `level.code` 为 null,页面一律用 `state.currentStage.code` 查配色
- `state` 是局部 const 不在 window;调试需 window.state 暴露(页面已有)
- toDataURL 全黑: WebGL canvas 无 preserveDrawingBuffer,只能页面元素截图
- PowerShell 内联 `python -c "..."` 内含中文/引号会 ParserError,一律写脚本文件执行
- 本地静态服务器: Start-Process python -m http.server 8855 (自启,重启后需重开)
- 后台任务: 用 `cmd /c start /b "" python -u tools\xx.py > log 2>&1` (单独命令,勿与 Start-Sleep 串联,会被进程树误杀)

### 待办
- [ ] 配色全量:**1471 关已入库**,网络补批已暂停(等样例确认后的全量决策);363 缺图关训练/晋升/周常等官方无独立图
- [ ] 敌人时序:多波次/长路径关(6-5)尾部敌人未达终点属正常(路程未走完);可考虑出怪间隔不随时间压缩的精度微调(暂无需求)
- [ ] stage_index 中大量关卡 file 为空(如 12-2 easy_12-01)→ 页面会加载失败;考虑页面拉取失败时给出友好提示而非无限转圈
- [ ] map-sim.html 敌人时序改动后需要在页面上人工目测播放(0-1/6-5 自动验证已过)

### 关键文件
- map-sim.html: 光照 ~812-842;HL_URLS ~186-194;tile 材质 ~909-925;camera mirror ~1015/1260;敌人构建 buildEnemyMeshes ~1111-1143;敌人移动/销毁 updateEnemyPositions ~1176-1200;Spine 替换 applySpineMeshes ~382-404;重置按钮 ~530
- tools/gen_highland_colors.py: 批量提取器(8 线程;--local-only 本地模式)
- tools/samples/: 样例对照图(官方图 | 3D 渲染)
- tools/tmp_enemy_seq.py / tmp_wave_check.py / tmp_enemy_end.py / tmp_make_samples.py: 验证脚本
- data/highland_colors.json: 1471 关(本地批产)