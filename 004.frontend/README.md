# 每日记账 · 前端原型（004.frontend）

基于 PRD（`001.产品PRD/个人财务记账产品PRD.md`）重构的高保真前端原型，纯静态、零依赖、无构建步骤。

## 运行

```bash
# 在本目录下启动静态服务器
python -m http.server 8081
# 访问 http://127.0.0.1:8081
```

或直接双击任意 `.html` 文件（`file://` 协议可直接运行）。

## 页面与跳转

| 页面 | 文件 | 说明 |
| --- | --- | --- |
| 首页 | `index.html` | 底部导航 `首页` tab；含快捷分类入口，点击跳到记账页并预选分类 |
| 账单 | `bills.html` | 底部导航 `账单` tab；支持筛选 chips、修改/删除 |
| 记账 | `record.html` | 底部导航中央 `＋` 按钮；支出/收入切换、分类宫格、完成保存 |
| 统计 | `stats.html` | 底部导航 `统计` tab；周/月/年维度、分类构成、趋势图 |
| 我的 | `profile.html` | 底部导航 `我的` tab；分类管理、预算、数据导出、回收站、退出登录 |
| 登录 | `login.html` | 入口页；可跳转注册、首页 |
| 注册 | `register.html` | 登录页可跳入；注册礼遇展示 |

**跳转关系**：底部导航 5 个 tab 通过 `js/app.js` 注入并相互跳转；首页快捷分类 → `record.html?cat=分类名`（预选分类）；登录 ↔ 注册双向；「我的」→ 登录。

## 首页三种状态

`index.html` 通过 URL hash 切换演示状态：

- 默认（无 hash）：有数据状态
- `index.html#empty`：空态（无记录引导）
- `index.html#over`：超支告警状态

## 目录结构

```
004.frontend/
├── index.html        # 首页（含三种状态）
├── bills.html        # 账单
├── record.html       # 记账
├── stats.html        # 统计
├── profile.html      # 我的
├── login.html        # 登录
├── register.html     # 注册
├── css/
│   └── app.css       # 设计 token（CSS 变量）+ 全部组件样式
└── js/
    └── app.js        # 公共应用外壳（header + 底部导航注入）+ toast
```

## 设计规范

- **配色**：设计 token 定义于 `css/app.css` 的 `:root`，取自 PRD 第 6 章「视觉设计规范」（主粉 `#FF7BA9`、马卡龙辅助色、支出红/收入绿等）。
- **字体**：Plus Jakarta Sans（文字）+ Material Symbols（图标），经 Google Fonts 引入。
- **公共外壳**：`js/app.js` 的 `AppShell.init('当前tab')` 统一注入顶部 header 与底部导航，避免每页重复；记账页用 `AppShell.initRecord()`（仅返回 header），登录/注册页不注入外壳。
