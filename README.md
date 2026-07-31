# DGWEB — 明日方舟攻略聚合站

自动同步 B 站投稿的静态站点，适配 **GitHub + Cloudflare Pages**。

上传本文件夹到 GitHub 后，Cloudflare Pages 会自动部署：

- 前端页面（`index.html` + `css` + `js`）
- 数据接口（`functions/api/bilibili.js`，随 Pages 自动上线，**无需单独建 Worker、无需填 URL**）

---

## 目录结构

```
DGWEB/
├── index.html
├── favicon.ico
├── css/style.css
├── js/
│   ├── bilibili.js      # 数据请求
│   └── main.js          # 页面逻辑
├── functions/
│   └── api/
│       └── bilibili.js  # Cloudflare Pages Function（B站代理）
├── data/
│   └── config.json      # 唯一需要改的配置
├── images/
│   ├── logo.png
│   └── default-cover.jpg
└── README.md
```

---

## 一键部署（推荐）

### 1. 上传 GitHub

1. 打开你的 GitHub 仓库
2. **删除旧文件**（如果有）
3. 把本文件夹 **全部内容** 上传到仓库根目录  
   （确保仓库根目录能看到 `index.html` 和 `functions/`）

### 2. 连接 Cloudflare Pages

1. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 选择该仓库
3. 构建设置：
   - **Framework preset**: `None`
   - **Build command**: 留空
   - **Build output directory**: `/`（或留空）
4. 点 **Save and Deploy**

部署完成后访问 `https://你的项目.pages.dev` 即可。

> `functions/` 目录会被 Cloudflare 自动识别为 Pages Functions。  
> 接口地址固定为：`/api/bilibili`，前端已写好，**不用改任何代码**。

---

## 换 UP 主 / 改名字

只改一个文件：

`data/config.json`

```json
{
  "uid": "3546373951588920",
  "name": "低配挂机研讨会",
  "spaceUrl": "https://space.bilibili.com/3546373951588920",
  "apiPath": "/api/bilibili"
}
```

| 字段 | 说明 |
|------|------|
| `uid` | B 站 UID（数字） |
| `name` | 站点显示名（接口失败时兜底） |
| `spaceUrl` | B 站空间链接 |
| `apiPath` | 一般不用改 |

改完 push 到 GitHub，几分钟后自动生效。

---

## 功能说明

- 实时拉取：粉丝数、投稿数、最新约 60 条视频
- 卡片展示：封面 / 标题 / 播放量 / 时长 / 相对时间
- 分类标签（按标题关键词自动识别）：
  - 新人入坑
  - 低配挂机
  - 活动攻略
  - 干员测评
- 搜索标题
- 排序：最新发布 / 最多播放
- 点击卡片跳转 B 站播放
- 手机适配

> 分类靠标题关键词猜测，无法 100% 准确（B 站接口本身不提供这类标签）。

---

## 数据接口说明

```
GET /api/bilibili?mid=UID&action=all
```

返回示例：

```json
{
  "code": 0,
  "uinfo": { "name": "...", "face": "...", "follower": 191466, "videos": 244 },
  "videos": [
    { "bvid": "BVxxx", "title": "...", "cover": "https://...", "play": 12345, "duration": "10:20", "created": 1710000000 }
  ],
  "total": 244,
  "updated": 1710000000
}
```

内部处理：

- WBI 签名（B 站 2024 后强制）
- buvid 指纹
- 10 分钟缓存（抗限流）
- 风控重试 + 降级返回

若 B 站偶发风控（`-799` / `-412`），页面会显示「同步失败 / 部分数据」，稍后自动恢复，不会白屏。

---

## 本地预览

静态页面可直接双击 `index.html`，但 **数据接口只在 Cloudflare Pages 上可用**。  
本地打开时会提示「无法连接数据接口」，属正常现象。

---

## 常见问题

**Q: 页面显示「同步失败」？**  
A: 确认仓库根目录有 `functions/api/bilibili.js`，且 Cloudflare Pages 部署日志无报错。重新 Deploy 一次。

**Q: 粉丝数有了，视频列表是空的？**  
A: B 站视频接口偶发限流。等 5–10 分钟刷新即可（接口有缓存与重试）。

**Q: 想改配色 / 文案？**  
A: 改 `css/style.css` 和 `index.html` 即可，不涉及接口。

---

## 技术栈

- 纯静态前端（HTML / CSS / JS）
- Cloudflare Pages Functions（边缘代理 B 站 API）
- 无后端服务器、无数据库、无构建步骤
