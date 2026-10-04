# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

一个「个人财务记账」产品的工作目录，用数字前缀文件夹表达工作阶段：

- `001.产品PRD/` — 需求文档（`个人财务记账产品PRD.md`），产品功能、数据模型、配色规范的唯一事实来源。
- `002.记账产品/` — 手写的**可运行纯前端应用**（本仓库的核心代码）。
- `003.UI原型/` — 外部工具 `stitch_document_web_app_generator` 生成的原型产物（`_N/{code.html,screen.png}` + `DESIGN.md`），仅供参考，勿手改。
- `004.frontend/` — 已重构为规范的多页静态前端原型（零依赖、无构建）：7 个语义化页面（`index/bills/record/stats/profile/login/register.html`）+ `css/app.css`（设计 token）+ `js/app.js`（公共 header/底部导航外壳）。改动核心逻辑时以 `002.记账产品` 为准。

## 运行方式

`002.记账产品` 是零依赖、零构建的纯静态应用（无 `package.json`、无框架、无打包）。两种运行方式：

```bash
cd 002.记账产品
python -m http.server 8080        # 或 python3 -m http.server 8080
# 访问 http://127.0.0.1:8080
```

或直接双击 `002.记账产品/index.html`（走 `file://` 协议）。

## 核心架构（002.记账产品）

- **非 ES modules**：6 个 JS 文件用普通 `<script>` 标签按依赖顺序加载，共享全局命名空间 `PJ`。这是刻意设计——`file://` 协议下 ES module 会被 CORS 拦截，必须保持现状。加载顺序：`data.js → store.js → charts.js → views.js → record.js → app.js`（顺序不可乱，前面文件定义后面文件依赖的 `PJ.*` 对象）。
- **单页应用**：底部导航 5 个入口 = 4 个 tab 视图（`#view-home/bills/stats/mine`）+ 中央记账弹层按钮。`app.js` 负责 tab 路由（`switchTab`/`refresh`），每个 `views.js` 的 `renderXxx()` 全量重渲染对应视图并绑定事件，无虚拟 DOM、无状态管理库。
- **数据层**（`store.js`）：全部数据存 `localStorage`，key 前缀 `pj_`（`pj_transactions` / `pj_categories` / `pj_budgets` / `pj_settings`）。**金额一律以「分」整数存储**（字段名 `amountCents`），显示时才转元，避免浮点误差——新增任何金额字段都必须沿用此约定。
- **图表**（`charts.js`）：手写 SVG（环形图 / 分组柱状图 / 日历热力图），不引入图表库。实现遵循 `dataviz` skill 规范（细 mark、legend、hover tooltip、文字用文字色而非数据色）。
- **配色双层方案**：浅粉彩（`PJ.COLORS.pastel`）只用于 UI 装饰（分类图标底、标签）；图表数据标记用加深可读色（`PJ.COLORS.chart`）。浅粉彩直接用于图表会通不过对比度/CVD 验证（见 PRD 第 6 章与 dataviz 校验脚本结论），不要把它们混用。

## 验证方式

无测试框架，验证分两层：

```bash
# 1. 语法检查（6 个 JS 文件）
cd 002.记账产品 && for f in js/*.js; do node --check "$f"; done

# 2. 数据层逻辑：用 node + mock localStorage 跑临时断言脚本
#    （store.js 只依赖 localStorage 和全局 window，可脱离浏览器测试 CRUD/统计/预算/删除迁移）
```

UI 渲染与交互无法在 CLI 验证，需浏览器打开确认（首页「载入示例数据」→ 记账 → 账单筛选 → 统计图表 → 我的页）。
