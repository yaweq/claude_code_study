# 个人财务记账 · 后端代码（006.后端代码）

从本地 MySQL 读取交易数据并暴露 REST API，同时托管 `004.frontend` 静态页面（同源部署，免跨域）。

## 技术栈

- Node.js + Express + mysql2
- 数据库：MySQL（Docker 容器 `mysql`，库名 `finance`）

## 运行

```bash
cd 006.后端代码

# 安装依赖（npm 官方源被墙，走 npmmirror 镜像）
npm install --registry=https://registry.npmmirror.com

# 启动（默认端口 3000）
npm start
```

启动后访问：

- 前端账单页：<http://127.0.0.1:3000/bills.html>（从数据库读取并展示交易数据）
- API 健康检查：<http://127.0.0.1:3000/api/health>

## 环境变量（均有默认值，指向本地 Docker MySQL）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务端口 |
| `DB_HOST` | `127.0.0.1` | MySQL 地址 |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_USER` | `root` | 用户名 |
| `DB_PASSWORD` | `root` | 密码 |
| `DB_NAME` | `finance` | 数据库名 |

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查（含数据库连通性） |
| GET | `/api/categories?type=expense` | 分类列表 |
| GET | `/api/transactions?type=&month=&category_id=&limit=` | 交易列表（含分类名/图标） |
| GET | `/api/summary?month=YYYY-MM` | 月度收支汇总 {income, expense, balance} |
| GET | `/api/breakdown?month=&type=expense` | 分类占比 |
| GET | `/api/trend?months=6` | 近 N 个月收支趋势（补齐缺失月份） |
| POST | `/api/transactions` | 新增交易（写库），body：type/amount_cents/category_id/account/note/date |
| DELETE | `/api/transactions/:id` | 软删除交易（进回收站） |

金额字段统一为 `amount_cents`（单位「分」整数），前端展示时再转元。
