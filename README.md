# DGWEB — 明日方舟攻略聚合站

B站攻略视频聚合展示站：**静态页面 + Cloudflare Pages Functions 自动同步 B 站数据**，无需服务器、无需手动部署 Worker。

## 目录结构

```
DGWEB
├── index.html                  首页
├── css/
│   └── style.css               网站样式（明日方舟深色科技风）
├── js/
│   ├── main.js                 页面逻辑（搜索/排序/分类/加载更多）
│   └── bilibili.js             B站数据读取
├── functions/
│   └── api/
│       └── bilibili.js         ★ 数据接口（WBI签名+缓存+抗风控，随Pages自动部署）
├── data/
│   └── config.json             ★ UP主配置（唯一需要改的文件）
├── images/
│   ├── logo.png
│   └── default-cover.jpg       封面加载失败时的兜底图
├── favicon.ico
└── README.md
```

## 部署（3 步）

1. GitHub 仓库清空旧文件，上传本文件夹内**所有内容**
2. Cloudflare Pages 连接该仓库（已连过的话会自动重新部署）
   - 构建命令：**留空**
   - 输出目录：**留空或填 `/`**
3. 等 1~2 分钟访问网站，数据自动加载

> 原理：`functions/` 目录会被 Cloudflare Pages 自动识别为 Pages Functions，
> 网站自带 `/api/bilibili` 接口，**不需要**单独创建 Worker。

## 换 UP 主

只改 `data/config.json`：

```json
{
  "uid": "3546373951588920",
  "name": "低配挂机研讨会",
  "siteName": "DGWEB",
  "siteDesc": "明日方舟攻略研讨会",
  "slogan": "明日方舟低配挂机攻略聚合站 —— 简单好抄，摆完挂机。"
}
```

## 常见问题

**Q: 首页提示"B站数据接口暂不可用"？**
- 刚部署：Pages Function 首次生效需 1~2 分钟，刷新即可
- B 站对数据中心 IP 有限流：接口自带 10 分钟缓存 + 自动重试，稍候自愈
- 确认仓库里有 `functions/api/bilibili.js`，且用的是 Cloudflare **Pages** 部署

**Q: 数据多久更新一次？**
接口缓存 10 分钟。也就是说 B 站发了新视频，最晚约 10 分钟后出现在网站上。

**Q: 分类不准？**
分类由 `js/main.js` 中 `classify()` 按标题关键词自动判断，可自行修改正则。

**Q: 想用自己的域名？**
Cloudflare Pages → 项目 → Custom domains → 绑定域名即可，接口不受影响。
