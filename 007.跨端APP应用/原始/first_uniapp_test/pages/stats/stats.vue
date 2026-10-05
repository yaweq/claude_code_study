<template>
  <view class="page">
    <record-fab />
    <!-- 时间维度切换 -->
    <view class="type-seg">
      <view class="seg-btn" :class="{ on: range === 'week' }" @tap="setRange('week')">周</view>
      <view class="seg-btn" :class="{ on: range === 'month' }" @tap="setRange('month')">月</view>
      <view class="seg-btn" :class="{ on: range === 'year' }" @tap="setRange('year')">年</view>
    </view>

    <!-- 本月总支出 -->
    <view class="hero card">
      <text class="hero-label">本月总支出 (元)</text>
      <text class="hero-value">{{ expenseText }}</text>
      <text class="hero-note">{{ balance >= 0 ? '超棒，省钱啦✨' : '本月已超支，注意控制哦💡' }}</text>
      <view class="hero-row">
        <text>本月总收入 {{ incomeText }}</text>
        <text>结余 {{ balanceText }}</text>
      </view>
    </view>

    <!-- 支出分类构成 -->
    <view class="card">
      <view class="card-title">支出分类构成</view>
      <view v-if="!breakdown.length" class="empty-tip">本月暂无支出记录</view>
      <view v-for="(r, i) in breakdown" :key="r.category_id" class="rank-item">
        <view class="rank-icon" :style="{ background: palette[i % palette.length] }">{{ r.icon || '📦' }}</view>
        <view class="rank-main">
          <view class="rank-head">
            <text class="rank-name">{{ r.name }}</text>
            <text class="rank-amount">{{ fmtMoney(r.total) }}</text>
          </view>
          <view class="rank-bar">
            <view class="rank-fill" :style="{ width: pct(r.total) + '%', background: palette[i % palette.length] }"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 近6个月趋势 -->
    <view class="card">
      <view class="card-title">近6个月收支趋势</view>
      <view class="trend">
        <view v-for="m in trend" :key="m.month" class="trend-col">
          <view class="trend-bars">
            <view class="bar inc" :style="{ height: h(m.income) + 'px' }"></view>
            <view class="bar exp" :style="{ height: h(m.expense) + 'px' }"></view>
          </view>
          <text class="trend-label">{{ parseInt(m.month.slice(5)) }}月</text>
        </view>
      </view>
      <view class="legend">
        <text><i class="dot inc"></i>收入</text>
        <text><i class="dot exp"></i>支出</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getSummary, getBreakdown, getTrend } from '../../utils/api'
import { fmtMoney, localMonth, PALETTE } from '../../utils/format'

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
      palette: PALETTE
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    fmtMoney,
    setRange(r) {
      this.range = r
      if (r !== 'month') uni.showToast({ title: '当前演示为「月」视图', icon: 'none' })
    },
    pct(total) { return this.breakdown.length ? Math.max(4, Math.round(total / this.breakdown[0].total * 100)) : 0 },
    h(v) { return Math.round(v / this.maxTrend * 140) },
    load() {
      const month = localMonth()
      Promise.all([getSummary(month), getBreakdown(month, 'expense'), getTrend(6)])
        .then(([summary, breakdown, trend]) => {
          this.expenseText = fmtMoney(summary.expense)
          this.incomeText = fmtMoney(summary.income)
          this.balanceText = (summary.balance >= 0 ? '+' : '') + fmtMoney(summary.balance)
          this.balance = summary.balance
          this.breakdown = breakdown
          this.trend = trend
          this.maxTrend = 1
          trend.forEach((m) => { this.maxTrend = Math.max(this.maxTrend, m.income, m.expense) })
        })
        .catch((e) => uni.showToast({ title: e.message || '未连接到后端', icon: 'none' }))
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
.rank-item { display: flex; align-items: center; margin-bottom: 20rpx; }
.rank-icon { width: 64rpx; height: 64rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; margin-right: 16rpx; }
.rank-main { flex: 1; }
.rank-head { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.rank-name { font-size: 28rpx; }
.rank-amount { color: #9B8A92; }
.rank-bar { height: 12rpx; background: #F2E6EC; border-radius: 6rpx; overflow: hidden; }
.rank-fill { height: 100%; border-radius: 6rpx; }
.trend { display: flex; justify-content: space-between; align-items: flex-end; }
.trend-col { display: flex; flex-direction: column; align-items: center; }
.trend-bars { display: flex; gap: 6rpx; align-items: flex-end; height: 150px; }
.bar { width: 20rpx; border-radius: 4rpx; }
.bar.inc { background: #5EC99A; }
.bar.exp { background: #FF6B8A; }
.trend-label { font-size: 22rpx; color: #9B8A92; margin-top: 8rpx; }
.legend { display: flex; justify-content: center; gap: 32rpx; margin-top: 16rpx; font-size: 24rpx; color: #9B8A92; }
.dot { display: inline-block; width: 16rpx; height: 16rpx; border-radius: 4rpx; margin-right: 8rpx; vertical-align: middle; }
.dot.inc { background: #5EC99A; }
.dot.exp { background: #FF6B8A; }
</style>
