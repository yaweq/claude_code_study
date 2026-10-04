/* =========================================================
 * data.js — 常量、默认数据、工具函数
 * 全局命名空间 PJ，最先加载
 * ========================================================= */
window.PJ = window.PJ || {};

/* ---------- 配色 tokens（PRD 第 6 章） ---------- */
PJ.COLORS = {
  // 品牌主色
  primary:      '#FF7BA9',
  primaryDark:  '#F75C8A',
  primaryLight: '#FFD6E5',
  primaryFaint: '#FFECF1',
  // 页面与卡片
  bg:        '#FFF7F9',
  card:      '#FFFFFF',
  // 语义色（金额文字用加深版，保证对比度）
  expense:      '#D9435F',   // 支出文字（4.27:1）
  expenseSoft:  '#FF6B8A',   // 支出标记/图标
  income:       '#2E9B6E',   // 收入文字（3.48:1）
  incomeSoft:   '#5EC99A',   // 收入标记/图标
  warn:         '#C77C00',   // 预警 80%（加深保证对比度）
  danger:       '#D03B3B',   // 超支 100%+
  // 中性色
  text:       '#4A3F44',
  textSub:    '#9B8A92',
  textMuted:  '#C9BCC4',
  divider:    '#F2E6EC',
  // 马卡龙浅粉彩（UI 装饰：分类图标底、标签）
  pastel: ['#FFB3C1', '#FFD98E', '#8FE0C3', '#C9B4E8', '#9FD3E8', '#FFA891'],
  // 图表分类色（加深可读版，normal-vision 通过；CVD 依赖 legend+标签+表格兜底）
  chart: ['#E5648F', '#3FA47A', '#E47E52', '#4585C4', '#C99A3A', '#8466C4', '#379696', '#B64C7C'],
};

/* ---------- 账户 ---------- */
PJ.ACCOUNTS = ['现金', '微信', '支付宝', '银行卡'];

/* ---------- 默认分类（PRD 4.2.2） ---------- */
PJ.DEFAULT_CATEGORIES = {
  expense: [
    { name: '餐饮', icon: '🍜' },
    { name: '交通', icon: '🚇' },
    { name: '购物', icon: '🛒' },
    { name: '住房', icon: '🏠' },
    { name: '水电煤', icon: '💡' },
    { name: '通讯', icon: '📱' },
    { name: '娱乐', icon: '🎮' },
    { name: '医疗', icon: '💊' },
    { name: '教育', icon: '🎓' },
    { name: '宠物', icon: '🐶' },
    { name: '旅行', icon: '✈️' },
    { name: '其他', icon: '📦' },
  ],
  income: [
    { name: '工资', icon: '💰' },
    { name: '奖金', icon: '🎁' },
    { name: '理财收益', icon: '📈' },
    { name: '红包', icon: '🧧' },
    { name: '其他', icon: '📦' },
  ],
};

/* ---------- 工具函数 ---------- */
PJ.util = {
  /** 分 -> 元字符串，如 2850 -> "¥28.50" */
  fmtMoney: function (cents, opts) {
    opts = opts || {};
    var sign = (cents < 0 ? '-' : '') + (opts.sign || '');
    var n = Math.abs(cents) / 100;
    var s = n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return sign + (opts.symbol === false ? '' : '¥') + s;
  },

  /** 今天 YYYY-MM-DD */
  today: function () {
    var d = new Date();
    return this.dateStr(d);
  },

  /** Date -> YYYY-MM-DD */
  dateStr: function (d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  },

  /** YYYY-MM-DD -> YYYY-MM */
  monthOf: function (dateStr) {
    return dateStr ? dateStr.slice(0, 7) : '';
  },

  /** 当月 YYYY-MM */
  thisMonth: function () {
    return this.today().slice(0, 7);
  },

  /**
   * 解析金额输入 -> 分（整数），非法返回 null
   * 支持 "28" "28.5" "28.50"；范围 0.01 ~ 999999999.99
   */
  parseAmount: function (str) {
    if (str == null) return null;
    var s = String(str).trim().replace(/[￥¥,\s]/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    var num = parseFloat(s);
    if (!isFinite(num)) return null;
    var cents = Math.round(num * 100);
    if (cents < 1 || cents > 99999999999) return null; // 上限 999999999.99
    return cents;
  },

  /** 唯一 id */
  uid: function () {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  },

  /** HTML 转义 */
  esc: function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  /**
   * 账目日期分组标签：今天 / 昨天 / 本周 / 本月 / 更早
   */
  groupLabel: function (dateStr) {
    var t = this.today();
    if (dateStr === t) return '今天';
    var d = new Date(t + 'T00:00:00');
    var yesterday = new Date(d.getTime() - 86400000);
    if (dateStr === this.dateStr(yesterday)) return '昨天';
    // 本周（周一为一周起点）
    var target = new Date(dateStr + 'T00:00:00');
    var now = new Date();
    var day = (now.getDay() + 6) % 7; // 周一=0
    var weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    if (target >= weekStart) return '本周';
    if (dateStr.slice(0, 7) === this.thisMonth()) return '本月';
    return '更早';
  },

  /** 简短日期显示：M月D日 */
  shortDate: function (dateStr) {
    var p = dateStr.split('-');
    return parseInt(p[1], 10) + '月' + parseInt(p[2], 10) + '日';
  },
};
