/* =========================================================
 * record.js — 记账弹层（新增 / 编辑）
 * 极速记账：新增模式下「金额 + 点分类」即保存，全程 ≤3 秒
 * ========================================================= */
window.PJ = window.PJ || {};

PJ.record = (function () {
  var state = null; // {mode:'new'|'edit', type, selectedCategoryId, editingId}

  function esc(s) { return PJ.util.esc(s); }

  /* ---------- 打开新增 ---------- */
  function open() {
    var settings = PJ.store.loadSettings();
    state = {
      mode: 'new',
      type: 'expense',
      selectedCategoryId: settings.lastCategoryExpenseId || null,
      editingId: null,
    };
    render();
  }

  /* ---------- 打开编辑 ---------- */
  function openEdit(txId) {
    var t = PJ.store.loadTransactions().find(function (x) { return x.id === txId; });
    if (!t) return;
    state = {
      mode: 'edit',
      type: t.type,
      selectedCategoryId: t.categoryId,
      editingId: txId,
    };
    render(t);
  }

  function render(existing) {
    var settings = PJ.store.loadSettings();
    var mask = document.createElement('div');
    mask.className = 'sheet-mask';
    mask.innerHTML =
      '<div class="sheet">' +
      '<div class="sheet-head">' +
      '<button class="sheet-close">×</button>' +
      '<div class="seg seg-type">' +
      '<button class="seg-btn' + (state.type === 'expense' ? ' active' : '') + '" data-type="expense">支出</button>' +
      '<button class="seg-btn' + (state.type === 'income' ? ' active' : '') + '" data-type="income">收入</button>' +
      '</div>' +
      '<button class="sheet-save" style="visibility:' + (state.mode === 'edit' ? 'visible' : 'hidden') + '">保存</button>' +
      '</div>' +
      '<div class="amount-box">' +
      '<span class="amount-symbol">¥</span>' +
      '<input type="text" inputmode="decimal" class="amount-input" placeholder="0.00" ' +
      'value="' + (existing ? (existing.amountCents / 100) : '') + '">' +
      '</div>' +
      '<div class="quick-amounts">' + ['10', '20', '50', '100'].map(function (a) {
        return '<button class="qa" data-v="' + a + '">' + a + '</button>';
      }).join('') + '</div>' +
      '<div class="cat-grid">' + catGridHtml() + '</div>' +
      '<div class="sheet-fields">' +
      '<label>日期<input type="date" class="f-date" value="' + (existing ? existing.date : PJ.util.today()) + '"></label>' +
      '<label>账户<select class="f-account">' + accountOptions(existing ? existing.account : settings.lastAccount) + '</select></label>' +
      '<label>备注<input type="text" class="f-note" maxlength="100" placeholder="备注（可选）" value="' + (existing ? esc(existing.note) : '') + '"></label>' +
      '</div>' +
      '</div>';

    document.body.appendChild(mask);
    var sheet = mask.querySelector('.sheet');
    requestAnimationFrame(function () { mask.classList.add('show'); });

    var amountInput = mask.querySelector('.amount-input');
    setTimeout(function () { amountInput.focus(); }, 120);

    function close() {
      mask.classList.remove('show');
      setTimeout(function () { mask.remove(); state = null; }, 220);
    }

    // 关闭
    mask.querySelector('.sheet-close').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });

    // 类型切换
    mask.querySelectorAll('.seg-type .seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.type = b.getAttribute('data-type');
        var s = PJ.store.loadSettings();
        state.selectedCategoryId = state.type === 'expense' ? s.lastCategoryExpenseId : s.lastCategoryIncomeId;
        renderAfterType(mask);
      });
    });

    // 快捷金额
    mask.querySelectorAll('.qa').forEach(function (b) {
      b.addEventListener('click', function () {
        amountInput.value = b.getAttribute('data-v');
        amountInput.focus();
      });
    });

    // 分类宫格：新增模式点分类即保存
    mask.querySelectorAll('.cat-cell').forEach(function (cell) {
      cell.addEventListener('click', function () {
        state.selectedCategoryId = cell.getAttribute('data-id');
        mask.querySelectorAll('.cat-cell').forEach(function (c) { c.classList.remove('active'); });
        cell.classList.add('active');
        if (state.mode === 'new') save(mask, amountInput);
      });
    });

    // 编辑模式保存按钮
    var saveBtn = mask.querySelector('.sheet-save');
    if (saveBtn) saveBtn.addEventListener('click', function () { save(mask, amountInput); });

    // 金额回车保存
    amountInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && state.mode === 'edit') save(mask, amountInput);
    });
  }

  function renderAfterType(mask) {
    var grid = mask.querySelector('.cat-grid');
    grid.innerHTML = catGridHtml();
    mask.querySelectorAll('.cat-cell').forEach(function (cell) {
      if (cell.getAttribute('data-id') === state.selectedCategoryId) cell.classList.add('active');
      cell.addEventListener('click', function () {
        state.selectedCategoryId = cell.getAttribute('data-id');
        mask.querySelectorAll('.cat-cell').forEach(function (c) { c.classList.remove('active'); });
        cell.classList.add('active');
        if (state.mode === 'new') save(mask, mask.querySelector('.amount-input'));
      });
    });
  }

  function catGridHtml() {
    var cats = PJ.store.loadCategories()
      .filter(function (c) { return c.type === state.type; })
      .sort(function (a, b) { return a.sort - b.sort; });
    return cats.map(function (c) {
      return '<div class="cat-cell' + (c.id === state.selectedCategoryId ? ' active' : '') + '" data-id="' + c.id + '">' +
        '<span class="cat-cell-icon" style="background:' + c.uiColor + '">' + c.icon + '</span>' +
        '<span class="cat-cell-name">' + esc(c.name) + '</span>' +
        '</div>';
    }).join('');
  }

  function accountOptions(selected) {
    return PJ.ACCOUNTS.map(function (a) {
      return '<option value="' + a + '"' + (a === (selected || '现金') ? ' selected' : '') + '>' + a + '</option>';
    }).join('');
  }

  function save(mask, amountInput) {
    var cents = PJ.util.parseAmount(amountInput.value);
    if (cents == null) {
      PJ.toast('请输入有效金额（0.01 ~ 999,999,999.99）');
      amountInput.focus();
      return;
    }
    if (!state.selectedCategoryId) {
      PJ.toast('请选择分类');
      return;
    }
    var date = mask.querySelector('.f-date').value || PJ.util.today();
    var account = mask.querySelector('.f-account').value;
    var note = mask.querySelector('.f-note').value.trim();

    // 记住上次选择
    var settings = PJ.store.loadSettings();
    settings.lastAccount = account;
    if (state.type === 'expense') settings.lastCategoryExpenseId = state.selectedCategoryId;
    else settings.lastCategoryIncomeId = state.selectedCategoryId;
    PJ.store.saveSettings(settings);

    if (state.mode === 'edit') {
      PJ.store.updateTransaction(state.editingId, {
        type: state.type, amountCents: cents, categoryId: state.selectedCategoryId,
        date: date, account: account, note: note,
      });
      PJ.toast('已修改 ' + PJ.util.fmtMoney(cents));
      closeSheet(mask);
    } else {
      PJ.store.addTransaction({
        type: state.type, amountCents: cents, categoryId: state.selectedCategoryId,
        date: date, account: account, note: note,
      });
      PJ.toast('已记录 ' + PJ.util.fmtMoney(cents));
      // 连续记账：清空金额，保持分类
      amountInput.value = '';
      amountInput.focus();
    }
    PJ.app.refresh();
  }

  function closeSheet(mask) {
    mask.classList.remove('show');
    setTimeout(function () { mask.remove(); state = null; }, 220);
  }

  return { open: open, openEdit: openEdit };
})();
