/* =========================================================
 * server.js — 个人财务记账产品 · 后端服务
 * 从 MySQL 读取数据并暴露 REST API；同时托管 ../004.frontend 静态页面
 * 运行：node server.js   （端口默认 3000）
 *
 * 依赖：express / cors / mysql2
 * 安装：npm install --registry=https://registry.npmmirror.com
 * ========================================================= */
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- 数据库连接池（环境变量可覆盖，默认连接本地 Docker MySQL） ---------- */
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'finance',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // SUM() 聚合结果直接返回数字而非字符串
});

/* 统一错误处理 */
function fail(res, e) {
  console.error('[API 错误]', e.message);
  res.status(500).json({ error: e.message });
}

/* ---------- 健康检查 ---------- */
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: e.message });
  }
});

/* ---------- 分类列表 ---------- */
app.get('/api/categories', async (req, res) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT id, name, type, icon, sort FROM categories';
    const p = [];
    if (type) { sql += ' WHERE type = ?'; p.push(type); }
    sql += ' ORDER BY type, sort';
    const [rows] = await pool.query(sql, p);
    res.json(rows);
  } catch (e) { fail(res, e); }
});

/* ---------- 交易列表（可按 type / month / category_id / limit 过滤） ---------- */
app.get('/api/transactions', async (req, res) => {
  try {
    const { type, month, category_id, limit } = req.query;
    let sql = `
      SELECT t.id, t.type, t.amount, t.account, t.note, DATE_FORMAT(t.date, '%Y-%m-%d') AS date,
             c.id AS category_id, c.name AS category_name, c.icon AS category_icon
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.deleted = 0`;
    const p = [];
    if (type) { sql += ' AND t.type = ?'; p.push(type); }
    if (month) { sql += ' AND DATE_FORMAT(t.date, "%Y-%m") = ?'; p.push(month); }
    if (category_id) { sql += ' AND t.category_id = ?'; p.push(Number(category_id)); }
    sql += ' ORDER BY t.date DESC, t.id DESC';
    if (limit) { sql += ' LIMIT ?'; p.push(Number(limit)); }
    const [rows] = await pool.query(sql, p);
    res.json(rows);
  } catch (e) { fail(res, e); }
});

/* ---------- 月度收支汇总 ---------- */
app.get('/api/summary', async (req, res) => {
  try {
    const month = req.query.month;
    if (!month) return res.status(400).json({ error: '缺少 month 参数（YYYY-MM）' });
    const [rows] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE deleted = 0 AND DATE_FORMAT(date, '%Y-%m') = ?`,
      [month]
    );
    const { income, expense } = rows[0];
    res.json({ month, income, expense, balance: income - expense });
  } catch (e) { fail(res, e); }
});

/* ---------- 分类占比（统计用） ---------- */
app.get('/api/breakdown', async (req, res) => {
  try {
    const { month, type } = req.query;
    if (!month) return res.status(400).json({ error: '缺少 month 参数（YYYY-MM）' });
    const t = type || 'expense';
    const [rows] = await pool.query(
      `SELECT c.id AS category_id, c.name, c.icon, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.deleted = 0 AND t.type = ? AND DATE_FORMAT(t.date, '%Y-%m') = ?
       GROUP BY c.id, c.name, c.icon
       ORDER BY total DESC`,
      [t, month]
    );
    res.json(rows);
  } catch (e) { fail(res, e); }
});

/* ---------- 近 N 个月收支趋势（补齐缺失月份为 0） ---------- */
app.get('/api/trend', async (req, res) => {
  try {
    const n = Number(req.query.months || 6);
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(date, '%Y-%m') AS month,
              COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE deleted = 0 AND date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL ? MONTH)
       GROUP BY DATE_FORMAT(date, '%Y-%m')
       ORDER BY month`,
      [n - 1]
    );
    const map = {};
    rows.forEach(r => { map[r.month] = r; });
    const now = new Date();
    const months = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    res.json(months.map(m => ({ month: m, income: map[m] ? map[m].income : 0, expense: map[m] ? map[m].expense : 0 })));
  } catch (e) { fail(res, e); }
});

/* ---------- 新增交易（写库） ---------- */
app.post('/api/transactions', async (req, res) => {
  try {
    const { type, amount, category_id, account, note, date } = req.body || {};
    if (type !== 'expense' && type !== 'income')
      return res.status(400).json({ error: 'type 必须为 expense 或 income' });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0)
      return res.status(400).json({ error: 'amount 必须为正数（单位：元）' });
    const cid = Number(category_id);
    if (!Number.isInteger(cid)) return res.status(400).json({ error: 'category_id 无效' });
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ error: 'date 格式应为 YYYY-MM-DD' });

    const [r] = await pool.query(
      `INSERT INTO transactions (type, amount, category_id, account, note, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [type, amt, cid, account || '现金', note || null, date]
    );
    res.status(201).json({ id: r.insertId, type, amount: amt, category_id: cid, account: account || '现金', note: note || null, date });
  } catch (e) { fail(res, e); }
});

/* ---------- 删除交易（软删除，进回收站） ---------- */
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [r] = await pool.query(
      'UPDATE transactions SET deleted = 1, deleted_at = NOW() WHERE id = ? AND deleted = 0',
      [id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: '记录不存在或已删除' });
    res.json({ ok: true, id });
  } catch (e) { fail(res, e); }
});

/* ---------- 托管前端静态页面（004.frontend，与 API 同源，免跨域） ---------- */
app.use(express.static(path.join(__dirname, '..', '004.frontend')));

/* ---------- 启动 ---------- */
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log('个人财务记账后端已启动');
  console.log('  API  : http://127.0.0.1:' + PORT + '/api/health');
  console.log('  前端 : http://127.0.0.1:' + PORT + '/bills.html');
});
