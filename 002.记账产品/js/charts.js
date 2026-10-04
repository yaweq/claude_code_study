/* =========================================================
 * charts.js — 手写 SVG 图表（遵循 dataviz 规范）
 *   donut   环形图（分类占比）
 *   bars    分组柱状图（月度趋势）
 *   heatmap 日历热力图（日支出）
 * 规范要点：细 mark、2px 表面间隙、4px 圆角数据端、legend、
 *           hover tooltip、文字用文字色而非数据色。
 * ========================================================= */
window.PJ = window.PJ || {};

PJ.charts = (function () {
  var INK = PJ.COLORS.text;      // 文字用文字 token
  var INK_SUB = PJ.COLORS.textSub;
  var DIVIDER = PJ.COLORS.divider;

  /* ---------- 通用 tooltip ---------- */
  var tip;
  function ensureTip() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      tip.style.display = 'none';
      document.body.appendChild(tip);
    }
    return tip;
  }
  function showTip(html, x, y) {
    var t = ensureTip();
    t.innerHTML = html;
    t.style.display = 'block';
    var w = t.offsetWidth, h = t.offsetHeight;
    t.style.left = Math.min(x + 12, window.innerWidth - w - 8) + 'px';
    t.style.top = Math.max(8, y - h - 8) + 'px';
  }
  function hideTip() { if (tip) tip.style.display = 'none'; }

  function esc(s) { return PJ.util.esc(s); }
  function money(cents) { return PJ.util.fmtMoney(cents); }

  /* =========================================================
   * donut — 环形图
   * items: [{label, value(分), color}]
   * opts:  {centerTop, centerBottom, onClick(item, index)}
   * ========================================================= */
  function donut(container, items, opts) {
    opts = opts || {};
    var cx = 110, cy = 110, r = 82, sw = 30;
    var total = items.reduce(function (s, it) { return s + it.value; }, 0);
    var GAP_DEG = items.length > 1 ? 1.6 : 0;

    var segs = [];
    var a = -90; // 从 12 点方向开始
    items.forEach(function (it, i) {
      if (it.value <= 0) return;
      var frac = total > 0 ? it.value / total : 0;
      var span = frac * 360 - GAP_DEG;
      if (span < 0) span = 0;
      segs.push({ it: it, i: i, a0: a, a1: a + span });
      a += frac * 360;
    });

    function polar(deg) {
      var rad = (deg - 90) * Math.PI / 180;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    }
    function arcPath(a0, a1) {
      var p0 = polar(a0), p1 = polar(a1);
      var large = (a1 - a0) > 180 ? 1 : 0;
      return 'M ' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) +
        ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
    }

    var svg = '';
    svg += '<svg viewBox="0 0 220 220" class="chart-donut" role="img" aria-label="分类占比环形图">';
    // 轨道底
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + DIVIDER + '" stroke-width="' + sw + '"/>';
    segs.forEach(function (s) {
      svg += '<path d="' + arcPath(s.a0, s.a1) + '" fill="none" stroke="' + s.it.color +
        '" stroke-width="' + sw + '" stroke-linecap="butt" class="donut-seg" data-i="' + s.i + '"/>';
    });
    // 中心文字
    if (opts.centerTop != null) {
      svg += '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" class="donut-center-label" fill="' + INK_SUB + '">' + esc(opts.centerTop) + '</text>';
    }
    if (opts.centerBottom != null) {
      svg += '<text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" class="donut-center-value" fill="' + INK + '">' + esc(opts.centerBottom) + '</text>';
    }
    svg += '</svg>';

    container.innerHTML = svg;

    // 事件绑定
    var paths = container.querySelectorAll('.donut-seg');
    Array.prototype.forEach.call(paths, function (p) {
      var s = segs[+p.getAttribute('data-i')];
      p.addEventListener('mousemove', function (ev) {
        var pct = total > 0 ? (s.it.value / total * 100).toFixed(1) : '0';
        showTip('<div class="tip-swatch" style="background:' + s.it.color + '"></div>' +
          '<div><b>' + esc(s.it.label) + '</b><br>' + money(s.it.value) + ' · ' + pct + '%</div>',
          ev.clientX, ev.clientY);
      });
      p.addEventListener('mouseleave', hideTip);
      if (opts.onClick) {
        p.addEventListener('click', function () { opts.onClick(s.it, s.i); });
      }
    });
  }

  /* =========================================================
   * bars — 分组柱状图（月度趋势，收入 vs 支出）
   * data: {categories:[..], series:[{name,color,values(分)}]}
   * ========================================================= */
  function bars(container, data, opts) {
    opts = opts || {};
    var W = 640, H = 240, padL = 44, padR = 8, padT = 16, padB = 30;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = data.categories.length;

    // 最大值（元）与干净刻度
    var maxVal = 0;
    data.series.forEach(function (s) {
      s.values.forEach(function (v) { if (v > maxVal) maxVal = v; });
    });
    maxVal = Math.max(maxVal, 1);
    var maxYuan = maxVal / 100;
    var step = niceStep(maxYuan, 4);
    var maxTick = Math.ceil(maxYuan / step) * step;
    if (maxTick <= 0) maxTick = step;

    function y(vYuan) { return padT + plotH - (vYuan / maxTick) * plotH; }
    function fmtTick(v) {
      if (v >= 10000) return (v / 10000).toFixed(v % 10000 ? 1 : 0) + '万';
      if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
      return String(v);
    }

    // 每组宽度，柱宽 <=24px，2px 间隙
    var groupW = plotW / n;
    var barW = Math.min(20, (groupW - 20) / data.series.length);
    var gap = 2;

    var svg = '';
    svg += '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart-bars" role="img" aria-label="月度收支趋势">';

    // 网格线与 y 刻度
    for (var t = 0; t <= 4; t++) {
      var vy = maxTick * t / 4;
      var yy = y(vy);
      svg += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy +
        '" stroke="' + DIVIDER + '" stroke-width="1"/>';
      svg += '<text x="' + (padL - 6) + '" y="' + (yy + 4) + '" text-anchor="end" class="chart-axis" fill="' + INK_SUB + '">' + fmtTick(vy) + '</text>';
    }
    // baseline
    svg += '<line x1="' + padL + '" y1="' + y(0) + '" x2="' + (W - padR) + '" y2="' + y(0) + '" stroke="' + PJ.COLORS.textMuted + '" stroke-width="1"/>';

    // 柱
    data.categories.forEach(function (cat, i) {
      var gx = padL + i * groupW + groupW / 2;
      var totalBW = data.series.length * barW + (data.series.length - 1) * gap;
      var x0 = gx - totalBW / 2;
      data.series.forEach(function (s, si) {
        var vYuan = s.values[i] / 100;
        var bx = x0 + si * (barW + gap);
        var bh = Math.max(0, (vYuan / maxTick) * plotH);
        var by = y(vYuan);
        if (vYuan > 0) {
          svg += roundTopRect(bx, by, barW, bh, s.color, 'bar-mark', i + '-' + si);
        }
      });
      // x 轴标签
      svg += '<text x="' + gx + '" y="' + (H - padB + 16) + '" text-anchor="middle" class="chart-axis" fill="' + INK_SUB + '">' + esc(cat) + '</text>';
    });

    svg += '</svg>';

    // legend（2 系列）
    var legend = '<div class="chart-legend">';
    data.series.forEach(function (s) {
      legend += '<span class="legend-item"><i class="legend-swatch" style="background:' + s.color + '"></i>' + esc(s.name) + '</span>';
    });
    legend += '</div>';

    container.innerHTML = svg + legend;

    // hover
    var marks = container.querySelectorAll('.bar-mark');
    Array.prototype.forEach.call(marks, function (m) {
      var idx = m.getAttribute('data-idx').split('-');
      var i = +idx[0], si = +idx[1];
      m.addEventListener('mousemove', function (ev) {
        var s = data.series[si];
        showTip('<div class="tip-swatch" style="background:' + s.color + '"></div>' +
          '<div><b>' + data.categories[i] + ' · ' + esc(s.name) + '</b><br>' + money(s.values[i]) + '</div>',
          ev.clientX, ev.clientY);
      });
      m.addEventListener('mouseleave', hideTip);
    });
  }

  function niceStep(maxVal, targetTicks) {
    var rough = maxVal / targetTicks;
    var mag = Math.pow(10, Math.floor(Math.log10(rough)));
    var norm = rough / mag;
    var step;
    if (norm <= 1) step = 1;
    else if (norm <= 2) step = 2;
    else if (norm <= 2.5) step = 2.5;
    else if (norm <= 5) step = 5;
    else step = 10;
    return step * mag;
  }

  /** 顶端圆角、底端方角的柱 path */
  function roundTopRect(x, y, w, h, color, cls, idx) {
    var rad = Math.min(4, w / 2, h);
    var d = 'M ' + x + ' ' + (y + rad) +
      ' Q ' + x + ' ' + y + ' ' + (x + rad) + ' ' + y +
      ' L ' + (x + w - rad) + ' ' + y +
      ' Q ' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + rad) +
      ' L ' + (x + w) + ' ' + (y + h) +
      ' L ' + x + ' ' + (y + h) + ' Z';
    return '<path d="' + d + '" fill="' + color + '" class="' + cls + '" data-idx="' + idx + '"/>';
  }

  /* =========================================================
   * heatmap — 日历热力图（日支出，主粉 sequential ramp）
   * month: 'YYYY-MM'; days: {'YYYY-MM-DD': cents}; maxCents
   * ========================================================= */
  var RAMP = ['#FFECF1', '#FFD6E5', '#FFB3C9', '#FF8FB0', '#F75C8A'];

  function heatmap(container, month, days, maxCents) {
    var year = +month.slice(0, 4), mon = +month.slice(5, 7) - 1;
    var first = new Date(year, mon, 1);
    var startOffset = (first.getDay() + 6) % 7; // 周一=0
    var totalDays = new Date(year, mon + 1, 0).getDate();

    var head = '<div class="heat-weekdays">' +
      ['一', '二', '三', '四', '五', '六', '日'].map(function (d) { return '<span>' + d + '</span>'; }).join('') +
      '</div>';

    var cells = '';
    var i;
    for (i = 0; i < startOffset; i++) cells += '<span class="heat-cell heat-empty"></span>';
    for (var day = 1; day <= totalDays; day++) {
      var ds = month + '-' + (day < 10 ? '0' + day : day);
      var v = days[ds] || 0;
      var level = v <= 0 ? -1 : Math.min(4, Math.max(1, Math.round(v / maxCents * 4)));
      var bg = level < 0 ? '#F5EDF0' : RAMP[level];
      cells += '<span class="heat-cell" data-date="' + ds + '" data-cents="' + v + '" style="background:' + bg + '">' + day + '</span>';
    }
    container.innerHTML = head + '<div class="heat-grid">' + cells + '</div>';

    var items = container.querySelectorAll('.heat-cell[data-cents]');
    Array.prototype.forEach.call(items, function (c) {
      var v = +c.getAttribute('data-cents');
      if (v <= 0) return;
      c.addEventListener('mousemove', function (ev) {
        showTip('<b>' + esc(c.getAttribute('data-date')) + '</b><br>' + money(v), ev.clientX, ev.clientY);
      });
      c.addEventListener('mouseleave', hideTip);
    });
  }

  return { donut: donut, bars: bars, heatmap: heatmap };
})();
