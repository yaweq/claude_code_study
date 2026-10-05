<template>
  <view class="page">
    <record-fab />

    <!-- 时间维度切换 -->
    <view class="type-seg">
      <view class="seg-btn" :class="{ on: range === 'week' }" @tap="setRange('week')">周</view>
      <view class="seg-btn" :class="{ on: range === 'month' }" @tap="setRange('month')">月</view>
      <view class="seg-btn" :class="{ on: range === 'year' }" @tap="setRange('year')">年</view>
    </view>

    <!-- 本期总支出 -->
    <view class="hero card">
      <text class="hero-label">{{ rangeLabel }}总支出 (元)</text>
      <text class="hero-value">{{ expenseText }}</text>
      <text class="hero-note">{{ balance >= 0 ? '超棒，省钱啦✨' : '本期已超支，注意控制哦💡' }}</text>
      <view class="hero-row">
        <text>{{ rangeLabel }}总收入 {{ incomeText }}</text>
        <text>结余 {{ balanceText }}</text>
      </view>
    </view>

    <!-- 支出分类构成（饼图） -->
    <view class="card">
      <view class="card-title">支出分类构成</view>
      <view v-if="!breakdown.length" class="empty-tip">本期暂无支出记录</view>
      <template v-else>
        <canvas canvas-id="pieCanvas" id="pieCanvas" class="pie-canvas"></canvas>
        <view class="legend">
          <view v-for="(r, i) in breakdown" :key="r.category_id" class="legend-item">
            <view class="legend-dot" :style="{ background: palette[i % palette.length] }"></view>
            <text class="legend-name">{{ r.icon }} {{ r.name }}</text>
            <text class="legend-amount">{{ fmtMoney(r.total) }} · {{ pctOf(r.total) }}%</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 收支趋势（曲线图） -->
    <view class="card">
      <view class="card-title">{{ trendTitle }}</view>
      <canvas canvas-id="lineCanvas" id="lineCanvas" class="line-canvas"></canvas>
      <view class="legend">
        <text class="legend-inline"><i class="dot inc"></i>收入</text>
        <text class="legend-inline"><i class="dot exp"></i>支出</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getTransactions } from '../../utils/api'
import { fmtMoney, localMonth, dstr, pad, PALETTE } from '../../utils/format'

export default {
  data() {
    return {
      range: 'month',
      expenseText: '¥0.00',
      incomeText: '¥0.00',
      balanceText: '¥0.00',
      balance: 0,
      breakdown: [],
      trend: [],
      maxTrend: 1,
      allTxns: [],
      palette: PALETTE
    }
  },
  computed: {
    rangeLabel() { return { week: '本周', month: '本月', year: '本年' }[this.range] },
    trendTitle() {
      return { week: '本周每日收支', month: '近6个月收支趋势', year: '本年各月收支' }[this.range]
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    fmtMoney,
    setRange(r) {
      this.range = r
      this.compute()
    },
    pctOf(total) {
      const sum = this.breakdown.reduce((s, x) => s + x.total, 0) || 1
      return Math.round(total / sum * 100)
    },
    load() {
      getTransactions()
        .then((txs) => { this.allTxns = txs; this.compute() })
        .catch((e) => uni.showToast({ title: e.message || '未连接到后端', icon: 'none' }))
    },
    inRange(dateStr) {
      const now = new Date()
      if (this.range === 'week') {
        const day = (now.getDay() + 6) % 7
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
        const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
        return dateStr >= dstr(monday) && dateStr <= dstr(sunday)
      }
      if (this.range === 'year') return dateStr.slice(0, 4) === String(now.getFullYear())
      return dateStr.slice(0, 7) === localMonth()
    },
    buildTrend() {
      const now = new Date()
      if (this.range === 'week') {
        const day = (now.getDay() + 6) % 7
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
        const labels = ['一', '二', '三', '四', '五', '六', '日']
        return Array.from({ length: 7 }, (_, i) => {
          const ds = dstr(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))
          return { label: '周' + labels[i], ...this.daySum(ds) }
        })
      }
      if (this.range === 'year') {
        return Array.from({ length: 12 }, (_, i) => {
          return { label: (i + 1) + '月', ...this.monthSum(now.getFullYear() + '-' + pad(i + 1)) }
        })
      }
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        const m = d.getFullYear() + '-' + pad(d.getMonth() + 1)
        return { label: (d.getMonth() + 1) + '月', ...this.monthSum(m) }
      })
    },
    daySum(ds) {
      let income = 0, expense = 0
      this.allTxns.forEach((t) => { if (t.date === ds) { t.type === 'income' ? (income += t.amount) : (expense += t.amount) } })
      return { income, expense }
    },
    monthSum(m) {
      let income = 0, expense = 0
      this.allTxns.forEach((t) => { if (t.date.slice(0, 7) === m) { t.type === 'income' ? (income += t.amount) : (expense += t.amount) } })
      return { income, expense }
    },
    compute() {
      const txs = this.allTxns.filter((t) => this.inRange(t.date))
      let income = 0, expense = 0
      txs.forEach((t) => { t.type === 'income' ? (income += t.amount) : (expense += t.amount) })
      this.expenseText = fmtMoney(expense)
      this.incomeText = fmtMoney(income)
      this.balance = income - expense
      this.balanceText = (this.balance >= 0 ? '+' : '') + fmtMoney(this.balance)

      const map = {}
      txs.filter((t) => t.type === 'expense').forEach((t) => {
        if (!map[t.category_id]) map[t.category_id] = { category_id: t.category_id, name: t.category_name, icon: t.category_icon, total: 0 }
        map[t.category_id].total += t.amount
      })
      this.breakdown = Object.values(map).sort((a, b) => b.total - a.total)

      this.trend = this.buildTrend()
      this.maxTrend = 1
      this.trend.forEach((m) => { this.maxTrend = Math.max(this.maxTrend, m.income, m.expense) })

      this.$nextTick(() => { this.drawPie(); this.drawLine() })
    },
    drawPie() {
      if (!this.breakdown.length) return
      const ctx = uni.createCanvasContext('pieCanvas', this)
      const cx = 150, cy = 150, radius = 72, lw = 44
      const sum = this.breakdown.reduce((s, x) => s + x.total, 0) || 1
      let start = -Math.PI / 2
      this.breakdown.forEach((item, i) => {
        const angle = (item.total / sum) * 2 * Math.PI
        ctx.beginPath()
        ctx.arc(cx, cy, radius, start, start + angle)
        ctx.setStrokeStyle(this.palette[i % this.palette.length])
        ctx.setLineWidth(lw)
        ctx.stroke()
        start += angle
      })
      // 中心文字
      ctx.setFillStyle('#4A3F44')
      ctx.setFontSize(13)
      ctx.setTextAlign('center')
      ctx.fillText('总支出', cx, cy - 2)
      ctx.setFontSize(20)
      ctx.fillText(this.expenseText, cx, cy + 18)
      ctx.draw()
    },
    drawLine() {
      if (!this.trend.length) return
      const ctx = uni.createCanvasContext('lineCanvas', this)
      const W = 340, H = 180
      const padL = 34, padR = 12, padT = 14, padB = 26
      const plotW = W - padL - padR
      const plotH = H - padT - padB
      const n = this.trend.length
      const max = this.maxTrend || 1
      const X = (i) => padL + (n === 1 ? plotW / 2 : plotW * i / (n - 1))
      const Y = (v) => padT + plotH * (1 - v / max)

      // 网格
      ctx.setStrokeStyle('#F2E6EC')
      ctx.setLineWidth(1)
      for (let g = 0; g <= 2; g++) {
        const gy = padT + plotH * g / 2
        ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke()
      }
      // X 轴标签
      ctx.setFillStyle('#9B8A92')
      ctx.setFontSize(10)
      ctx.setTextAlign('center')
      const step = n > 8 ? 2 : 1
      this.trend.forEach((m, i) => { if (i % step === 0) ctx.fillText(m.label, X(i), H - 8) })

      this.drawSeries(ctx, 'income', '#5EC99A', X, Y)
      this.drawSeries(ctx, 'expense', '#FF6B8A', X, Y)
      ctx.draw()
    },
    drawSeries(ctx, key, color, X, Y) {
      const pts = this.trend.map((m, i) => ({ x: X(i), y: Y(m[key]) }))
      ctx.beginPath()
      ctx.setStrokeStyle(color)
      ctx.setLineWidth(2.5)
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        const xc = (pts[i - 1].x + pts[i].x) / 2
        const yc = (pts[i - 1].y + pts[i].y) / 2
        ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc)
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.stroke()
      pts.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.5, 0, 2 * Math.PI)
        ctx.setFillStyle(color)
        ctx.fill()
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx 24rpx 150rpx; }
.type-seg { display: flex; justify-content: center; margin-bottom: 24rpx; }
.seg-btn { padding: 10rpx 44rpx; border-radius: 30rpx; background: #fff; margin: 0 12rpx; }
.seg-btn.on { background: #FF7BA9; color: #fff; }
.hero { display: flex; flex-direction: column; align-items: center; padding: 40rpx; }
.hero-label { color: #9B8A92; font-size: 24rpx; }
.hero-value { font-size: 64rpx; font-weight: 700; margin: 8rpx 0; }
.hero-note { color: #9B8A92; font-size: 24rpx; }
.hero-row { display: flex; gap: 32rpx; margin-top: 20rpx; font-size: 26rpx; color: #4A3F44; }
.card-title { font-weight: 700; margin-bottom: 16rpx; }
.empty-tip { color: #9B8A92; text-align: center; padding: 20rpx 0; }
.pie-canvas { width: 300px; height: 300px; margin: 0 auto; }
.line-canvas { width: 340px; height: 180px; margin: 0 auto; }
.legend { margin-top: 8rpx; }
.legend-item { display: flex; align-items: center; padding: 10rpx 0; }
.legend-dot { width: 20rpx; height: 20rpx; border-radius: 6rpx; margin-right: 16rpx; }
.legend-name { flex: 1; font-size: 26rpx; }
.legend-amount { color: #9B8A92; font-size: 24rpx; }
.legend-inline { margin-right: 32rpx; font-size: 24rpx; color: #9B8A92; }
.dot { display: inline-block; width: 16rpx; height: 16rpx; border-radius: 4rpx; margin-right: 8rpx; vertical-align: middle; }
.dot.inc { background: #5EC99A; }
.dot.exp { background: #FF6B8A; }
</style>
