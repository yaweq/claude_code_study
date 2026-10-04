/* =========================================================
 * app.js — 入口：初始化、tab 路由、事件绑定
 * ========================================================= */
window.PJ = window.PJ || {};

PJ.app = (function () {
  var currentTab = 'home';
  var VIEWS = ['home', 'bills', 'stats', 'mine'];

  function init() {
    PJ.store.init();          // 初始化默认分类
    purgeExpiredTrash();      // 清理 30 天前删除的回收站数据
    bindNav();
    switchTab('home');
  }

  function bindNav() {
    document.querySelectorAll('.tabbar .tab').forEach(function (t) {
      t.addEventListener('click', function () {
        var tab = t.getAttribute('data-tab');
        if (tab === 'record') { PJ.record.open(); return; }
        switchTab(tab);
      });
    });
  }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tabbar .tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    VIEWS.forEach(function (v) {
      document.getElementById('view-' + v).classList.toggle('active', v === tab);
    });
    refresh();
  }

  function refresh() {
    if (currentTab === 'home') PJ.views.renderHome();
    else if (currentTab === 'bills') PJ.views.renderBills();
    else if (currentTab === 'stats') PJ.views.renderStats();
    else if (currentTab === 'mine') PJ.views.renderMine();
  }

  function purgeExpiredTrash() {
    var txs = PJ.store.loadTransactions();
    var cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    var kept = txs.filter(function (t) {
      return !t.deleted || !t.deletedAt || t.deletedAt > cutoff;
    });
    if (kept.length !== txs.length) PJ.store.saveTransactions(kept);
  }

  return { init: init, switchTab: switchTab, refresh: refresh };
})();

document.addEventListener('DOMContentLoaded', function () { PJ.app.init(); });
