/* =========================================================
 * app.js — 公共应用外壳（header + 底部导航）与工具
 * 每个主页面调用 AppShell.init('当前tab') 注入共享 header/nav，
 * 记账页调用 AppShell.initRecord()，登录/注册页不调用。
 * ========================================================= */
window.AppShell = (function () {
  var ICON = 'material-symbols-outlined icon';

  /* ---------- 顶部 Header ---------- */
  function headerHtml(showBack) {
    if (showBack) {
      return '<header class="header"><div class="header-inner">' +
        '<button class="header-back" onclick="history.back()" aria-label="返回">' +
        '<span class="' + ICON + '">arrow_back</span></button>' +
        '<div class="header-title">记一笔</div>' +
        '<span style="width:32px"></span>' +
        '</div></header>';
    }
    return '<header class="header"><div class="header-inner">' +
      '<a class="header-brand" href="index.html" style="text-decoration:none">' +
      '<span class="header-logo">💰</span>' +
      '<span><span class="header-title">每日记账</span><br>' +
      '<span class="header-sub">早安，小确幸✨</span></span></a>' +
      '<div class="header-actions">' +
      '<a class="header-pill" href="stats.html" style="text-decoration:none">' +
      '<span class="' + ICON + '">calendar_today</span>本月</a>' +
      '<a class="header-avatar" href="profile.html" style="text-decoration:none" aria-label="我的">' +
      '<span class="' + ICON + '">person</span></a>' +
      '</div></div></header>';
  }

  /* ---------- 底部导航 ---------- */
  function navHtml(active) {
    var tabs = [
      { key: 'home', icon: 'home', label: '首页', href: 'index.html' },
      { key: 'bills', icon: 'receipt_long', label: '账单', href: 'bills.html' },
      { key: 'stats', icon: 'pie_chart', label: '统计', href: 'stats.html' },
      { key: 'profile', icon: 'face', label: '我的', href: 'profile.html' },
    ];
    var html = '<nav class="tabbar"><div class="tabbar-inner">';
    html += tabs.map(function (t) {
      var cls = 'tab' + (t.key === active ? ' active' : '');
      return '<a class="' + cls + '" href="' + t.href + '" data-tab="' + t.key + '">' +
        '<span class="' + ICON + '">' + t.icon + '</span>' +
        '<span class="label">' + t.label + '</span></a>';
    }).join('');
    html += '<div class="tab-fab-wrap"><a class="tab-fab" href="record.html" aria-label="记一笔">' +
      '<span class="' + ICON + '">add</span></a></div>';
    html += '</div></nav>';
    return html;
  }

  /* ---------- 注入外壳 ---------- */
  function init(active) {
    document.body.insertAdjacentHTML('afterbegin', headerHtml(false));
    document.body.insertAdjacentHTML('beforeend', navHtml(active));
  }
  function initRecord() {
    document.body.insertAdjacentHTML('afterbegin', headerHtml(true));
  }

  return { init: init, initRecord: initRecord };
})();

/* ---------- 全局 toast ---------- */
window.toast = function (msg) {
  var t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.toast._tm);
  window.toast._tm = setTimeout(function () { t.classList.remove('show'); }, 1800);
};
