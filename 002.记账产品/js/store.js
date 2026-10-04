/* =========================================================
 * store.js — localStorage 数据层（账目 / 分类 / 预算 / 设置）
 * 金额一律以「分」整数存储，避免浮点误差
 * ========================================================= */
window.PJ = window.PJ || {};

PJ.store = (function () {
  var KEY_TX = 'pj_transactions';
  var KEY_CAT = 'pj_categories';
  var KEY_BUDGET = 'pj_budgets';
  var KEY_SETTINGS = 'pj_settings';

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  /* ---------- 初始化默认分类 ---------- */
  function buildDefaultCategories() {
    var list = [];
    var pastel = PJ.COLORS.pastel;
    var chart = PJ.COLORS.chart;
    ['expense', 'income'].forEach(function (type) {
      PJ.DEFAULT_CATEGORIES[type].forEach(function (c, i) {
        list.push({
          id: type + '-' + i,
          name: c.name,
          icon: c.icon,
          type: type,
          uiColor: pastel[i % pastel.length],
          chartColor: chart[i % chart.length],
          sort: i,
        });
      });
    });
    return list;
  }

  /* ---------- 分类 ---------- */
  function loadCategories() {
    var cats = read(KEY_CAT, null);
    if (!cats || !cats.length) {
      cats = buildDefaultCategories();
      write(KEY_CAT, cats);
    }
    return cats;
  }
  function saveCategories(cats) { write(KEY_CAT, cats); }

  function getCategory(id) {
    return loadCategories().find(function (c) { return c.id === id; }) || null;
  }

  function addCategory(cat) {
    var cats = loadCategories();
    cat.id = cat.id || PJ.util.uid();
    cat.sort = cats.length;
    cats.push(cat);
    saveCategories(cats);
    return cat;
  }

  function updateCategory(id, patch) {
    var cats = loadCategories();
    var c = cats.find(function (x) { return x.id === id; });
    if (c) Object.assign(c, patch);
    saveCategories(cats);
  }

  /** 删除分类；若有账目则迁移到 migrateToId */
  function deleteCategory(id, migrateToId) {
    var txs = loadTransactions();
    txs.forEach(function (t) {
      if (t.categoryId === id) t.categoryId = migrateToId;
    });
    write(KEY_TX, txs);
    saveCategories(loadCategories().filter(function (c) { return c.id !== id; }));
  }

  /* ---------- 账目 ---------- */
  function loadTransactions() { return read(KEY_TX, []); }
  function saveTransactions(txs) { write(KEY_TX, txs); }

  function addTransaction(tx) {
    var txs = loadTransactions();
    tx.id = tx.id || PJ.util.uid();
    tx.createdAt = Date.now();
    tx.updatedAt = tx.createdAt;
    tx.deleted = false;
    txs.push(tx);
    saveTransactions(txs);
    return tx;
  }

  function updateTransaction(id, patch) {
    var txs = loadTransactions();
    var t = txs.find(function (x) { return x.id === id; });
    if (t) { Object.assign(t, patch); t.updatedAt = Date.now(); }
    saveTransactions(txs);
  }

  function softDelete(id) {
    var txs = loadTransactions();
    var t = txs.find(function (x) { return x.id === id; });
    if (t) { t.deleted = true; t.deletedAt = Date.now(); }
    saveTransactions(txs);
  }
  function restore(id) {
    var txs = loadTransactions();
    var t = txs.find(function (x) { return x.id === id; });
    if (t) { t.deleted = false; delete t.deletedAt; }
    saveTransactions(txs);
  }
  function purge(id) {
    saveTransactions(loadTransactions().filter(function (x) { return x.id !== id; }));
  }

  /* ---------- 预算 ---------- */
  function loadBudgets() { return read(KEY_BUDGET, []); }
  function saveBudgets(b) { write(KEY_BUDGET, b); }

  /** 设置预算；amountCents 为 0/空时删除该预算 */
  function setBudget(categoryId, month, amountCents) {
    var bs = loadBudgets();
    bs = bs.filter(function (b) { return !(b.categoryId === categoryId && b.month === month); });
    if (amountCents && amountCents > 0) {
      bs.push({ id: PJ.util.uid(), categoryId: categoryId, month: month, amountCents: amountCents });
    }
    saveBudgets(bs);
  }

  function getBudget(categoryId, month) {
    var b = loadBudgets().find(function (x) { return x.categoryId === categoryId && x.month === month; });
    return b ? b.amountCents : 0;
  }

  /* ---------- 设置 ---------- */
  function loadSettings() { return read(KEY_SETTINGS, {}); }
  function saveSettings(s) { write(KEY_SETTINGS, s); }

  /* ---------- 统计 ---------- */
  function activeTxs() {
    return loadTransactions().filter(function (t) { return !t.deleted; });
  }

  /** 月度收支：{income, expense, balance}（分） */
  function getMonthSummary(month) {
    var income = 0, expense = 0;
    activeTxs().forEach(function (t) {
      if (PJ.util.monthOf(t.date) !== month) return;
      if (t.type === 'income') income += t.amountCents;
      else expense += t.amountCents;
    });
    return { income: income, expense: expense, balance: income - expense };
  }

  /** 分类占比（降序）：[{categoryId, name, icon, color, total}] */
  function getCategoryBreakdown(month, type) {
    var map = {};
    activeTxs().forEach(function (t) {
      if (t.type !== type || PJ.util.monthOf(t.date) !== month) return;
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amountCents;
    });
    return Object.keys(map).map(function (cid) {
      var c = getCategory(cid);
      return {
        categoryId: cid,
        name: c ? c.name : '未分类',
        icon: c ? c.icon : '❓',
        color: c ? c.chartColor : '#C9BCC4',
        total: map[cid],
      };
    }).sort(function (a, b) { return b.total - a.total; });
  }

  /** 近 n 个月趋势：{months:[], income:[], expense:[]}（分） */
  function getMonthlyTrend(n) {
    var months = [], income = [], expense = [];
    var now = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var m = d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : d.getMonth() + 1);
      var s = getMonthSummary(m);
      months.push(m.slice(5) + '月');
      income.push(s.income);
      expense.push(s.expense);
    }
    return { months: months, income: income, expense: expense };
  }

  /** 某月每日支出热力：{days:{'YYYY-MM-DD':cents}, max} */
  function getDailyHeatmap(month) {
    var days = {};
    activeTxs().forEach(function (t) {
      if (t.type !== 'expense' || PJ.util.monthOf(t.date) !== month) return;
      days[t.date] = (days[t.date] || 0) + t.amountCents;
    });
    var max = 0;
    Object.keys(days).forEach(function (k) { if (days[k] > max) max = days[k]; });
    return { days: days, max: max };
  }

  /* ---------- 示例数据（演示用） ---------- */
  function seedDemo() {
    if (activeTxs().length) return; // 已有数据则不覆盖
    var cats = loadCategories();
    function byName(type, name) {
      return cats.find(function (c) { return c.type === type && c.name === name; });
    }
    var txs = [];
    var now = new Date();
    var rng = function (min, max) { return Math.floor(min + Math.random() * (max - min)); };

    // 过去 5 个月 + 当月
    for (var m = -5; m <= 0; m++) {
      var base = new Date(now.getFullYear(), now.getMonth() + m, 1);
      var daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      var dstr = function (day) {
        return base.getFullYear() + '-' +
          (base.getMonth() + 1 < 10 ? '0' + (base.getMonth() + 1) : base.getMonth() + 1) + '-' +
          (day < 10 ? '0' + day : day);
      };

      // 收入：工资 + 偶尔红包/奖金
      var salaryDay = rng(5, 10);
      txs.push(mk(byName('income', '工资'), 8000 + rng(0, 4000) * 10, dstr(salaryDay), '工资'));
      if (Math.random() < 0.4) txs.push(mk(byName('income', '红包'), rng(20, 200) * 100, dstr(rng(1, 28)), '红包'));

      // 支出：按分类随机生成
      var plan = [
        ['餐饮', 18, 12, 45], ['交通', 20, 4, 30], ['购物', 4, 60, 500],
        ['娱乐', 5, 30, 200], ['住房', 1, 2500, 3500], ['水电煤', 1, 100, 400],
        ['通讯', 1, 60, 120], ['医疗', 1, 40, 300], ['教育', 1, 100, 600],
        ['宠物', 1, 50, 200], ['旅行', 1, 300, 1500],
      ];
      plan.forEach(function (p) {
        var cnt = p[1];
        for (var k = 0; k < cnt; k++) {
          var cat = byName('expense', p[0]);
          var day = rng(1, daysInMonth);
          var amt = rng(p[2], p[3]) * 100; // 元 -> 分
          txs.push(mk(cat, amt, dstr(day), Math.random() < 0.3 ? p[0] : ''));
        }
      });
    }

    function mk(cat, amountCents, date, note) {
      if (!cat) return null;
      return {
        id: PJ.util.uid(), type: cat.type, amountCents: amountCents,
        categoryId: cat.id, account: PJ.ACCOUNTS[rng(0, PJ.ACCOUNTS.length)],
        note: note, date: date, createdAt: Date.now(), updatedAt: Date.now(), deleted: false,
      };
    }
    txs = txs.filter(Boolean);
    write(KEY_TX, txs);

    // 默认预算：总预算 + 餐饮预算
    var month = PJ.util.thisMonth();
    setBudget(null, month, 6000 * 100);
    setBudget(byName('expense', '餐饮').id, month, 1500 * 100);
  }

  /* ---------- 导出 ---------- */
  return {
    init: loadCategories, // 首次调用即初始化默认分类

    loadCategories: loadCategories,
    saveCategories: saveCategories,
    getCategory: getCategory,
    addCategory: addCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,

    loadTransactions: loadTransactions,
    addTransaction: addTransaction,
    updateTransaction: updateTransaction,
    softDelete: softDelete,
    restore: restore,
    purge: purge,

    loadBudgets: loadBudgets,
    setBudget: setBudget,
    getBudget: getBudget,

    loadSettings: loadSettings,
    saveSettings: saveSettings,

    activeTxs: activeTxs,
    getMonthSummary: getMonthSummary,
    getCategoryBreakdown: getCategoryBreakdown,
    getMonthlyTrend: getMonthlyTrend,
    getDailyHeatmap: getDailyHeatmap,

    seedDemo: seedDemo,
  };
})();
