/* =========================================================
 * views.js — 四个 tab 的渲染（首页 / 账单 / 统计 / 我的）
 * 依赖 data.js、store.js、charts.js；record.js 提供记账弹层
 * ========================================================= */
window.PJ = window.PJ || {};

/* ---------- 全局 toast ---------- */
PJ.toast = function (msg) {
  var t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(PJ.toast._tm);
  PJ.toast._tm = setTimeout(function () { t.classList.remove('show'); }, 1800);
};

PJ.views = (function () {
  var billState = { type: 'all', categoryId: 'all', q: '' };
  var statsMode = 'month'; // month | year

  function esc(s) { return PJ.util.esc(s); }
  function money(c) { return PJ.util.fmtMoney(c); }
  function catById(id) { return PJ.store.getCategory(id); }

  /* =========================================================
   * 通用 modal
   * ========================================================= */
  function modal(title, bodyHtml, actions) {
    var wrap = document.createElement('div');
    wrap.className = 'modal-mask';
    wrap.innerHTML =
      '<div class="modal">' +
      '<div class="modal-title">' + esc(title) + '</div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      '<div class="modal-actions"></div>' +
      '</div>';
    var actBox = wrap.querySelector('.modal-actions');
    (actions || [{ label: '确定', cls: 'primary' }]).forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'btn ' + (a.cls || '');
      b.textContent = a.label;
      b.addEventListener('click', function () {
        var shouldClose = a.onClick ? a.onClick(wrap) : true;
        if (shouldClose !== false) close();
      });
      actBox.appendChild(b);
    });
    function close() { wrap.remove(); }
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    document.body.appendChild(wrap);
    return wrap;
  }

  /* =========================================================
   * 账目列表（按日期分组）
   * ========================================================= */
  function txnItemHtml(t) {
    var c = catById(t.categoryId);
    var icon = c ? c.icon : '❓';
    var name = c ? c.name : '未分类';
    var uiColor = c ? c.uiColor : '#C9BCC4';
    var isExp = t.type === 'expense';
    var sign = isExp ? '-' : '+';
    var cls = isExp ? 'exp' : 'inc';
    var note = (t.note ? esc(t.note) : '') + (t.account ? '<span class="txn-account">' + esc(t.account) + '</span>' : '');
    return '<div class="txn-item" data-id="' + t.id + '">' +
      '<div class="txn-icon" style="background:' + uiColor + '">' + icon + '</div>' +
      '<div class="txn-main">' +
      '<div class="txn-name">' + esc(name) + '</div>' +
      (note ? '<div class="txn-note">' + note + '</div>' : '') +
      '</div>' +
      '<div class="txn-amt ' + cls + '">' + sign + money(t.amountCents) + '</div>' +
      '<button class="txn-del" data-id="' + t.id + '" title="删除">×</button>' +
      '</div>';
  }

  function txnListHtml(txs, opts) {
    opts = opts || {};
    if (!txs.length) {
      return '<div class="empty">' + (opts.emptyText || '还没有记录，去记一笔吧') + '</div>';
    }
    var html = '';
    var lastGroup = null;
    txs.forEach(function (t) {
      var g = PJ.util.groupLabel(t.date);
      if (opts.showGroup !== false && g !== lastGroup) {
        html += '<div class="txn-group">' + esc(g) + '</div>';
        lastGroup = g;
      }
      html += txnItemHtml(t);
    });
    return html;
  }

  function bindTxnList(container) {
    container.querySelectorAll('.txn-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.closest('.txn-del')) return;
        PJ.record.openEdit(item.getAttribute('data-id'));
      });
    });
    container.querySelectorAll('.txn-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        modal('删除记录', '<p>删除后可在「我的 → 回收站」恢复，是否删除？</p>', [
          { label: '取消', cls: '' },
          { label: '删除', cls: 'danger', onClick: function () {
            PJ.store.softDelete(id);
            PJ.toast('已移入回收站');
            refreshCurrent();
          } },
        ]);
      });
    });
  }

  /* =========================================================
   * 首页
   * ========================================================= */
  function renderHome() {
    var el = document.getElementById('view-home');
    var month = PJ.util.thisMonth();
    var s = PJ.store.getMonthSummary(month);
    var totalBudget = PJ.store.getBudget(null, month);
    var hasData = PJ.store.activeTxs().length > 0;

    var html = '';
    html += '<div class="hero-card">' +
      '<div class="hero-label">本月结余</div>' +
      '<div class="hero-value">' + money(s.balance) + '</div>' +
      '<div class="hero-row">' +
      '<span class="hero-sub">收入 <b class="inc">' + money(s.income) + '</b></span>' +
      '<span class="hero-sub">支出 <b class="exp">' + money(s.expense) + '</b></span>' +
      '</div></div>';

    // 预算进度
    if (totalBudget > 0) {
      html += budgetBarHtml(s.expense, totalBudget, '本月总预算');
    }

    // 最近账目
    var recent = PJ.store.activeTxs().slice().sort(function (a, b) {
      return b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0);
    }).slice(0, 5);

    html += '<div class="card">' +
      '<div class="card-head"><span>最近记录</span><button class="link" id="go-bills">全部 ›</button></div>' +
      '<div class="txn-list">' + txnListHtml(recent, { showGroup: false }) + '</div></div>';

    if (!hasData) {
      html += '<div class="card center"><p class="muted">还没有任何记录</p>' +
        '<button class="btn primary" id="seed-btn">载入示例数据体验</button></div>';
    }

    el.innerHTML = html;
    bindTxnList(el);

    var goBills = el.querySelector('#go-bills');
    if (goBills) goBills.addEventListener('click', function () { PJ.app.switchTab('bills'); });
    var seed = el.querySelector('#seed-btn');
    if (seed) seed.addEventListener('click', function () {
      PJ.store.seedDemo();
      PJ.toast('已载入示例数据');
      PJ.app.refresh();
    });
  }

  function budgetBarHtml(used, budget, label) {
    var pct = Math.round(used / budget * 100);
    var cls = pct >= 100 ? 'danger' : (pct >= 80 ? 'warn' : 'ok');
    var tipText = pct >= 100 ? '已超支' : (pct >= 80 ? '接近预算' : '');
    var w = Math.min(100, pct);
    return '<div class="card">' +
      '<div class="budget-head"><span>' + esc(label) + '</span>' +
      '<span class="budget-nums">已用 ' + money(used) + ' / ' + money(budget) + ' <b class="' + cls + '">' + pct + '%</b>' +
      (tipText ? ' · ' + tipText : '') + '</span></div>' +
      '<div class="budget-bar"><div class="budget-fill ' + cls + '" style="width:' + w + '%"></div></div>' +
      '</div>';
  }

  /* =========================================================
   * 账单页
   * ========================================================= */
  function renderBills() {
    var el = document.getElementById('view-bills');
    var st = billState;

    var typeTabs = [['all', '全部'], ['expense', '支出'], ['income', '收入']];
    var html = '<div class="filter-bar">' +
      '<div class="seg">' + typeTabs.map(function (t) {
        return '<button class="seg-btn' + (st.type === t[0] ? ' active' : '') + '" data-type="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="filter-row">' +
      '<select id="cat-filter">' + catOptionsHtml(st.type) + '</select>' +
      '<input id="q-filter" type="search" placeholder="搜索备注…" value="' + esc(st.q) + '">' +
      '</div></div>';

    var txs = filterTxs();
    var sumExp = 0, sumInc = 0;
    txs.forEach(function (t) { if (t.type === 'expense') sumExp += t.amountCents; else sumInc += t.amountCents; });

    html += '<div class="sum-bar">' +
      '<span>共 ' + txs.length + ' 笔</span>' +
      '<span>支出 <b class="exp">' + money(sumExp) + '</b></span>' +
      '<span>收入 <b class="inc">' + money(sumInc) + '</b></span>' +
      '</div>';

    html += '<div class="card"><div class="txn-list">' +
      txnListHtml(txs, { emptyText: '没有符合条件的记录' }) +
      '</div></div>';

    el.innerHTML = html;

    // 事件
    el.querySelectorAll('.seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        billState.type = b.getAttribute('data-type');
        if (billState.categoryId !== 'all') {
          var c = catById(billState.categoryId);
          if (c && c.type !== billState.type) billState.categoryId = 'all';
        }
        renderBills();
      });
    });
    var cf = el.querySelector('#cat-filter');
    if (cf) {
      cf.value = st.categoryId;
      cf.addEventListener('change', function () { billState.categoryId = cf.value; renderBills(); });
    }
    var qf = el.querySelector('#q-filter');
    if (qf) qf.addEventListener('input', function () { billState.q = qf.value; renderBills(); });

    bindTxnList(el);
  }

  function catOptionsHtml(type) {
    var cats = PJ.store.loadCategories().filter(function (c) { return c.type === type; });
    var opts = '<option value="all">全部分类</option>';
    cats.forEach(function (c) {
      opts += '<option value="' + c.id + '">' + c.icon + ' ' + esc(c.name) + '</option>';
    });
    return opts;
  }

  function filterTxs() {
    var st = billState;
    return PJ.store.activeTxs().filter(function (t) {
      if (st.type !== 'all' && t.type !== st.type) return false;
      if (st.categoryId !== 'all' && t.categoryId !== st.categoryId) return false;
      if (st.q && (t.note || '').indexOf(st.q) < 0) return false;
      return true;
    }).sort(function (a, b) {
      return b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  /* =========================================================
   * 统计页
   * ========================================================= */
  function renderStats() {
    var el = document.getElementById('view-stats');
    var month = PJ.util.thisMonth();
    var s = PJ.store.getMonthSummary(month);

    var html = '<div class="filter-bar"><div class="seg">' +
      [['month', '月'], ['year', '年']].map(function (m) {
        return '<button class="seg-btn' + (statsMode === m[0] ? ' active' : '') + '" data-mode="' + m[0] + '">' + m[1] + '</button>';
      }).join('') + '</div></div>';

    html += '<div class="stat-row">' +
      statTile('本月收入', money(s.income), 'inc') +
      statTile('本月支出', money(s.expense), 'exp') +
      statTile('本月结余', money(s.balance), '') +
      '</div>';

    // 分类占比环形图（支出）
    var breakdown = PJ.store.getCategoryBreakdown(month, 'expense');
    html += '<div class="card"><div class="card-head"><span>支出分类占比</span></div>';
    if (!breakdown.length) {
      html += '<div class="empty">本月还没有支出记录</div>';
    } else {
      var top = breakdown.slice(0, 7);
      var rest = breakdown.slice(7);
      var restSum = rest.reduce(function (x, it) { return x + it.total; }, 0);
      var items = top.map(function (it) { return { label: it.name, value: it.total, color: it.color, categoryId: it.categoryId }; });
      if (restSum > 0) items.push({ label: '其他', value: restSum, color: '#C9BCC4', categoryId: null });
      html += '<div class="donut-wrap">' +
        '<div class="donut-box" id="donut-box"></div>' +
        '<div class="donut-legend">' + items.map(function (it, i) {
          var pct = s.expense > 0 ? (it.value / s.expense * 100).toFixed(1) : '0';
          return '<div class="dl-item' + (it.categoryId ? '' : ' dl-other') + '" data-cid="' + (it.categoryId || '') + '">' +
            '<i class="dl-swatch" style="background:' + it.color + '"></i>' +
            '<span class="dl-name">' + esc(it.label) + '</span>' +
            '<span class="dl-val">' + pct + '%</span></div>';
        }).join('') + '</div></div>';
    }
    html += '</div>';

    // 月度趋势
    var trend = PJ.store.getMonthlyTrend(6);
    html += '<div class="card"><div class="card-head"><span>近 6 个月收支趋势</span></div>' +
      '<div id="trend-box"></div></div>';

    // 日历热力图
    var heat = PJ.store.getDailyHeatmap(month);
    html += '<div class="card"><div class="card-head"><span>' + month + ' 每日支出</span></div>' +
      '<div id="heat-box"></div></div>';

    el.innerHTML = html;

    // 维度切换
    el.querySelectorAll('.seg-btn').forEach(function (b) {
      b.addEventListener('click', function () { statsMode = b.getAttribute('data-mode'); renderStats(); });
    });

    // 环形图
    var donutBox = el.querySelector('#donut-box');
    if (donutBox && breakdown.length) {
      var donutItems = breakdown.slice(0, 7).map(function (it) {
        return { label: it.name, value: it.total, color: it.color, categoryId: it.categoryId };
      });
      var restSum = breakdown.slice(7).reduce(function (x, it) { return x + it.total; }, 0);
      if (restSum > 0) donutItems.push({ label: '其他', value: restSum, color: '#C9BCC4', categoryId: null });
      PJ.charts.donut(donutBox, donutItems, {
        centerTop: '本月支出',
        centerBottom: money(s.expense),
        onClick: function (it) {
          if (!it.categoryId) return;
          billState.type = 'expense';
          billState.categoryId = it.categoryId;
          billState.q = '';
          PJ.app.switchTab('bills');
        },
      });
    }

    // 趋势图
    var trendBox = el.querySelector('#trend-box');
    if (trendBox) {
      PJ.charts.bars(trendBox, {
        categories: trend.months,
        series: [
          { name: '收入', color: PJ.COLORS.incomeSoft, values: trend.income },
          { name: '支出', color: PJ.COLORS.expenseSoft, values: trend.expense },
        ],
      });
    }

    // 热力图
    var heatBox = el.querySelector('#heat-box');
    if (heatBox) {
      PJ.charts.heatmap(heatBox, month, heat.days, heat.max || 1);
    }
  }

  function statTile(label, value, cls) {
    return '<div class="stat-tile"><div class="stat-label">' + esc(label) + '</div>' +
      '<div class="stat-value ' + cls + '">' + value + '</div></div>';
  }

  /* =========================================================
   * 我的页
   * ========================================================= */
  function renderMine() {
    var el = document.getElementById('view-mine');
    var cats = PJ.store.loadCategories();
    var expCats = cats.filter(function (c) { return c.type === 'expense'; }).sort(function (a, b) { return a.sort - b.sort; });
    var incCats = cats.filter(function (c) { return c.type === 'income'; }).sort(function (a, b) { return a.sort - b.sort; });

    function catListHtml(list) {
      return list.map(function (c) {
        return '<div class="cat-row" data-id="' + c.id + '">' +
          '<span class="cat-icon" style="background:' + c.uiColor + '">' + c.icon + '</span>' +
          '<span class="cat-name">' + esc(c.name) + '</span>' +
          '<button class="icon-btn cat-up" data-id="' + c.id + '" title="上移">↑</button>' +
          '<button class="icon-btn cat-down" data-id="' + c.id + '" title="下移">↓</button>' +
          '<button class="icon-btn cat-edit" data-id="' + c.id + '" title="编辑">✎</button>' +
          '<button class="icon-btn cat-del" data-id="' + c.id + '" title="删除">×</button>' +
          '</div>';
      }).join('');
    }

    var html = '<div class="card"><div class="card-head"><span>支出分类</span>' +
      '<button class="link" id="add-exp">+ 新增</button></div>' + catListHtml(expCats) + '</div>';
    html += '<div class="card"><div class="card-head"><span>收入分类</span>' +
      '<button class="link" id="add-inc">+ 新增</button></div>' + catListHtml(incCats) + '</div>';

    // 预算
    var month = PJ.util.thisMonth();
    var totalBudget = PJ.store.getBudget(null, month);
    var foodCat = cats.find(function (c) { return c.type === 'expense' && c.name === '餐饮'; });
    var foodBudget = foodCat ? PJ.store.getBudget(foodCat.id, month) : 0;

    html += '<div class="card"><div class="card-head"><span>本月预算</span></div>' +
      budgetRowHtml('总预算', totalBudget, function (v) { PJ.store.setBudget(null, month, v); }) +
      (foodCat ? budgetRowHtml('餐饮预算', foodBudget, function (v) { PJ.store.setBudget(foodCat.id, month, v); }) : '') +
      '</div>';

    // 数据管理
    html += '<div class="card"><div class="card-head"><span>数据管理</span></div>' +
      '<div class="menu-list">' +
      '<button class="menu-item" id="export-csv">导出 CSV</button>' +
      '<button class="menu-item" id="export-json">导出备份 JSON</button>' +
      '<button class="menu-item" id="import-json">导入备份</button>' +
      '<input type="file" id="import-file" accept=".json" style="display:none">' +
      '<button class="menu-item" id="open-trash">回收站</button>' +
      '<button class="menu-item danger" id="clear-all">清空所有数据</button>' +
      '</div></div>';

    el.innerHTML = html;

    // 分类事件
    bindCatEvents(el, 'expense');
    bindCatEvents(el, 'income');

    el.querySelector('#add-exp').addEventListener('click', function () { addCategoryDialog('expense'); });
    el.querySelector('#add-inc').addEventListener('click', function () { addCategoryDialog('income'); });

    // 预算
    el.querySelectorAll('.budget-edit').forEach(function (b) {
      b.addEventListener('click', function () {
        var setter = window[b.getAttribute('data-setter')];
        var cur = +b.getAttribute('data-cur');
        budgetDialog(cur, setter);
      });
    });

    // 数据管理
    el.querySelector('#export-csv').addEventListener('click', exportCsv);
    el.querySelector('#export-json').addEventListener('click', exportJson);
    el.querySelector('#import-json').addEventListener('click', function () { el.querySelector('#import-file').click(); });
    el.querySelector('#import-file').addEventListener('change', importJson);
    el.querySelector('#open-trash').addEventListener('click', openTrash);
    el.querySelector('#clear-all').addEventListener('click', function () {
      modal('清空数据', '<p class="danger">将删除全部账目、分类和预算，且不可恢复。确定？</p>', [
        { label: '取消', cls: '' },
        { label: '清空', cls: 'danger', onClick: function () {
          ['pj_transactions', 'pj_categories', 'pj_budgets', 'pj_settings'].forEach(function (k) { localStorage.removeItem(k); });
          PJ.store.init();
          PJ.toast('已清空');
          PJ.app.refresh();
        } },
      ]);
    });
  }

  function budgetRowHtml(label, amountCents, setter) {
    var key = '_setter_' + Math.random().toString(36).slice(2, 6);
    window[key] = setter;
    return '<div class="budget-row">' +
      '<span>' + esc(label) + '</span>' +
      '<span class="budget-row-val">' + (amountCents > 0 ? money(amountCents) : '未设置') + '</span>' +
      '<button class="link budget-edit" data-cur="' + amountCents + '" data-setter="' + key + '">编辑</button>' +
      '</div>';
  }

  function budgetDialog(cur, setter) {
    var curYuan = cur > 0 ? (cur / 100) : '';
    modal('设置预算', '<input id="budget-input" type="text" inputmode="decimal" placeholder="金额（元）" value="' + curYuan + '">', [
      { label: '取消', cls: '' },
      { label: '保存', cls: 'primary', onClick: function (wrap) {
        var v = PJ.util.parseAmount(wrap.querySelector('#budget-input').value);
        setter(v == null ? 0 : v);
        PJ.toast('预算已保存');
        renderMine();
      } },
    ]);
  }

  function bindCatEvents(el, type) {
    el.querySelectorAll('.cat-up').forEach(function (b) {
      b.addEventListener('click', function () { moveCat(b.getAttribute('data-id'), -1); });
    });
    el.querySelectorAll('.cat-down').forEach(function (b) {
      b.addEventListener('click', function () { moveCat(b.getAttribute('data-id'), 1); });
    });
    el.querySelectorAll('.cat-edit').forEach(function (b) {
      b.addEventListener('click', function () { editCatDialog(b.getAttribute('data-id')); });
    });
    el.querySelectorAll('.cat-del').forEach(function (b) {
      b.addEventListener('click', function () { deleteCatDialog(b.getAttribute('data-id')); });
    });
  }

  function moveCat(id, delta) {
    var cats = PJ.store.loadCategories();
    var c = cats.find(function (x) { return x.id === id; });
    var same = cats.filter(function (x) { return x.type === c.type; }).sort(function (a, b) { return a.sort - b.sort; });
    var idx = same.indexOf(c);
    var target = same[idx + delta];
    if (!target) return;
    var t = c.sort; c.sort = target.sort; target.sort = t;
    PJ.store.saveCategories(cats);
    renderMine();
  }

  function addCategoryDialog(type) {
    var preset = type === 'expense' ? PJ.COLORS.pastel : PJ.COLORS.pastel;
    modal('新增' + (type === 'expense' ? '支出' : '收入') + '分类',
      '<input id="cat-name" placeholder="名称，如 健身">' +
      '<input id="cat-icon" placeholder="图标 emoji，如 🏋️" maxlength="4">', [
      { label: '取消', cls: '' },
      { label: '添加', cls: 'primary', onClick: function (wrap) {
        var name = wrap.querySelector('#cat-name').value.trim();
        if (!name) { PJ.toast('请输入名称'); return false; }
        var icon = wrap.querySelector('#cat-icon').value.trim() || '🏷️';
        var idx = PJ.store.loadCategories().filter(function (c) { return c.type === type; }).length;
        PJ.store.addCategory({
          name: name, icon: icon, type: type,
          uiColor: preset[idx % preset.length],
          chartColor: PJ.COLORS.chart[idx % PJ.COLORS.chart.length],
          sort: idx,
        });
        PJ.toast('已添加');
        renderMine();
      } },
    ]);
  }

  function editCatDialog(id) {
    var c = catById(id);
    modal('编辑分类',
      '<input id="cat-name" value="' + esc(c.name) + '">' +
      '<input id="cat-icon" value="' + esc(c.icon) + '" maxlength="4">', [
      { label: '取消', cls: '' },
      { label: '保存', cls: 'primary', onClick: function (wrap) {
        PJ.store.updateCategory(id, {
          name: wrap.querySelector('#cat-name').value.trim() || c.name,
          icon: wrap.querySelector('#cat-icon').value.trim() || c.icon,
        });
        PJ.toast('已保存');
        renderMine();
      } },
    ]);
  }

  function deleteCatDialog(id) {
    var c = catById(id);
    var count = PJ.store.activeTxs().filter(function (t) { return t.categoryId === id; }).length;
    var cats = PJ.store.loadCategories().filter(function (x) { return x.type === c.type && x.id !== id; });
    var body = '<p>确定删除分类「' + esc(c.name) + '」？</p>';
    if (count > 0) {
      body += '<p class="muted">该分类下有 ' + count + ' 笔记录，请选择迁移到：</p>' +
        '<select id="migrate-to">' + cats.map(function (x) {
          return '<option value="' + x.id + '">' + x.icon + ' ' + esc(x.name) + '</option>';
        }).join('') + '</select>';
    }
    modal('删除分类', body, [
      { label: '取消', cls: '' },
      { label: '删除', cls: 'danger', onClick: function (wrap) {
        var migrate = count > 0 ? wrap.querySelector('#migrate-to').value : null;
        PJ.store.deleteCategory(id, migrate);
        PJ.toast('已删除');
        renderMine();
      } },
    ]);
  }

  /* ---------- 数据导出 / 回收站 ---------- */
  function exportCsv() {
    var txs = PJ.store.activeTxs().sort(function (a, b) { return a.date.localeCompare(b.date); });
    var head = ['日期', '类型', '分类', '金额(元)', '账户', '备注'];
    var lines = [head.join(',')];
    txs.forEach(function (t) {
      var c = catById(t.categoryId);
      var row = [
        t.date,
        t.type === 'expense' ? '支出' : '收入',
        c ? c.name : '',
        (t.amountCents / 100).toFixed(2),
        t.account || '',
        (t.note || '').replace(/,/g, '，'),
      ];
      lines.push(row.map(function (x) { return '"' + x + '"'; }).join(','));
    });
    download('﻿' + lines.join('\r\n'), '记账导出_' + PJ.util.today() + '.csv', 'text/csv');
    PJ.toast('已导出 CSV');
  }

  function exportJson() {
    var data = {
      transactions: PJ.store.loadTransactions(),
      categories: PJ.store.loadCategories(),
      budgets: PJ.store.loadBudgets(),
      settings: PJ.store.loadSettings(),
      exportedAt: new Date().toISOString(),
    };
    download(JSON.stringify(data, null, 2), '记账备份_' + PJ.util.today() + '.json', 'application/json');
    PJ.toast('已导出备份');
  }

  function importJson(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (data.transactions) localStorage.setItem('pj_transactions', JSON.stringify(data.transactions));
        if (data.categories) localStorage.setItem('pj_categories', JSON.stringify(data.categories));
        if (data.budgets) localStorage.setItem('pj_budgets', JSON.stringify(data.budgets));
        if (data.settings) localStorage.setItem('pj_settings', JSON.stringify(data.settings));
        PJ.toast('导入成功');
        PJ.app.refresh();
      } catch (err) {
        PJ.toast('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function download(content, filename, mime) {
    var blob = new Blob([content], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function openTrash() {
    var txs = PJ.store.loadTransactions().filter(function (t) { return t.deleted; })
      .sort(function (a, b) { return (b.deletedAt || 0) - (a.deletedAt || 0); });
    var body;
    if (!txs.length) {
      body = '<p class="muted">回收站为空</p>';
    } else {
      body = '<div class="trash-list">' + txs.map(function (t) {
        var c = catById(t.categoryId);
        var sign = t.type === 'expense' ? '-' : '+';
        return '<div class="trash-item" data-id="' + t.id + '">' +
          '<span>' + (c ? c.icon : '') + ' ' + esc(c ? c.name : '') + ' · ' + t.date + '</span>' +
          '<span class="' + (t.type === 'expense' ? 'exp' : 'inc') + '">' + sign + money(t.amountCents) + '</span>' +
          '<button class="link trash-restore" data-id="' + t.id + '">恢复</button>' +
          '<button class="link danger trash-purge" data-id="' + t.id + '">彻底删除</button>' +
          '</div>';
      }).join('') + '</div>';
    }
    modal('回收站', body, [{ label: '关闭', cls: '' }]);
    var wrap = document.querySelector('.modal-mask:last-child');
    wrap.querySelectorAll('.trash-restore').forEach(function (b) {
      b.addEventListener('click', function () {
        PJ.store.restore(b.getAttribute('data-id'));
        PJ.toast('已恢复');
        PJ.app.refresh();
        openTrash();
      });
    });
    wrap.querySelectorAll('.trash-purge').forEach(function (b) {
      b.addEventListener('click', function () {
        PJ.store.purge(b.getAttribute('data-id'));
        PJ.toast('已彻底删除');
        openTrash();
      });
    });
  }

  /* ---------- 当前 tab 刷新 ---------- */
  function refreshCurrent() {
    if (PJ.app) PJ.app.refresh();
  }

  return {
    billState: billState,
    renderHome: renderHome,
    renderBills: renderBills,
    renderStats: renderStats,
    renderMine: renderMine,
  };
})();
