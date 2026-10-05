<template>
  <view class="page">
    <record-fab />
    <!-- 本月收支大卡片 -->
    <view class="hero">
      <view class="hero-month">{{ monthLabel }}</view>
      <view class="hero-balance-label">本月结余 (元)</view>
      <view class="hero-balance">{{ balanceText }}</view>
      <view class="hero-sub">
        <view class="hero-sub-item">
          <text class="hero-sub-label">本月支出</text>
          <text class="hero-sub-value exp">{{ expenseText }}</text>
        </view>
        <view class="hero-sub-item">
          <text class="hero-sub-label">本月收入</text>
          <text class="hero-sub-value inc">{{ incomeText }}</text>
        </view>
      </view>
    </view>

    <!-- 预算（暂无预算数据，显示空态引导） -->
    <view class="card budget-empty">
      <text class="budget-empty-title">设定本月支出预算上限</text>
      <text class="budget-empty-sub">随时查看超支预警，掌握生活节奏</text>
    </view>

    <!-- 快捷记账 -->
    <view class="card">
      <view class="sec-head">
        <text class="sec-title">快捷记账</text>
        <text class="sec-sub">一键轻记 ✨</text>
      </view>
      <view class="quick-grid">
        <view v-for="q in quickList" :key="q.name" class="quick-item" @tap="goRecord(q.name)">
          <view class="quick-badge" :style="{ background: q.color }">{{ q.icon }}</view>
          <text class="quick-label">{{ q.name }}</text>
        </view>
      </view>
    </view>

    <!-- 今日明细 -->
    <view v-if="todayRows.length" class="card">
      <view class="txn-group">
        <text class="day">今日明细 · {{ todayLabel }}</text>
        <text class="sum exp">{{ sumText(todayRows) }}</text>
      </view>
      <view v-for="t in todayRows" :key="t.id" class="txn-item">
        <view class="txn-icon" :style="{ background: colorOf(t) }">{{ t.category_icon || '📦' }}</view>
        <view class="txn-main">
          <text class="txn-name">{{ t.note || t.category_name }}</text>
          <text class="txn-meta">{{ t.category_name }} · {{ t.account }}</text>
        </view>
        <text class="txn-amount" :class="t.type === 'expense' ? 'exp' : 'inc'">{{ t.type === 'expense' ? '-' : '+' }}{{ fmtMoney(t.amount) }}</text>
      </view>
    </view>

    <!-- 昨日明细 -->
    <view v-if="yesterdayRows.length" class="card">
      <view class="txn-group">
        <text class="day">昨天 · {{ yesterdayLabel }}</text>
        <text class="sum">{{ sumText(yesterdayRows) }}</text>
      </view>
      <view v-for="t in yesterdayRows" :key="t.id" class="txn-item">
        <view class="txn-icon" :style="{ background: colorOf(t) }">{{ t.category_icon || '📦' }}</view>
        <view class="txn-main">
          <text class="txn-name">{{ t.note || t.category_name }}</text>
          <text class="txn-meta">{{ t.category_name }} · {{ t.account }}</text>
        </view>
        <text class="txn-amount" :class="t.type === 'expense' ? 'exp' : 'inc'">{{ t.type === 'expense' ? '-' : '+' }}{{ fmtMoney(t.amount) }}</text>
      </view>
    </view>

    <!-- 空态 -->
    <view v-if="!loading && !allTxns.length" class="empty">
      <text class="empty-icon">📝</text>
      <text class="empty-title">还没有任何记账记录呢</text>
      <text class="empty-desc">只需 3 秒，记录今天第一笔开销吧～</text>
      <button class="primary-btn" @tap="goRecord('')">记第一笔账 ⚡</button>
    </view>

  </view>
</template>

<script>
import { getSummary, getTransactions } from '../../utils/api'
import { fmtMoney, localToday, localMonth, mdLabel, dstr, PALETTE } from '../../utils/format'

export default {
  data() {
    return {
      loading: true,
      balanceText: '¥0.00',
      expenseText: '¥0.00',
      incomeText: '¥0.00',
      monthLabel: '',
      todayLabel: '',
      yesterdayLabel: '',
      allTxns: [],
      todayRows: [],
      yesterdayRows: [],
      quickList: [
        { name: '餐饮', icon: '🍜', color: '#8FE0C3' },
        { name: '交通', icon: '🚇', color: '#9FD3E8' },
        { name: '购物', icon: '🛒', color: '#FFB3C1' },
        { name: '娱乐', icon: '🎮', color: '#FFD98E' },
        { name: '旅行', icon: '✈️', color: '#FFA891' }
      ]
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    fmtMoney,
    colorOf(t) {
      return PALETTE[(t.category_id - 1) % PALETTE.length]
    },
    sumText(rows) {
      let exp = 0
      let inc = 0
      rows.forEach((t) => { t.type === 'expense' ? (exp += t.amount) : (inc += t.amount) })
      if (exp && inc) return '支 ' + fmtMoney(exp) + ' / 收 ' + fmtMoney(inc)
      return exp ? '支出 ' + fmtMoney(exp) : '收入 ' + fmtMoney(inc)
    },
    goRecord(cat) {
      const url = cat ? '/pages/record/record?cat=' + encodeURIComponent(cat) : '/pages/record/record'
      uni.navigateTo({ url })
    },
    load() {
      const now = new Date()
      this.monthLabel = now.getFullYear() + '年' + (now.getMonth() + 1) + '月账本'
      this.todayLabel = mdLabel(localToday())
      const y = new Date()
      y.setDate(y.getDate() - 1)
      this.yesterdayLabel = mdLabel(dstr(y))

      Promise.all([getSummary(localMonth()), getTransactions()])
        .then(([summary, txs]) => {
          this.balanceText = (summary.balance >= 0 ? '+' : '') + fmtMoney(summary.balance)
          this.expenseText = fmtMoney(summary.expense)
          this.incomeText = fmtMoney(summary.income)
          this.allTxns = txs
          const today = localToday()
          const yesterday = dstr(y)
          this.todayRows = txs.filter((t) => t.date === today)
          this.yesterdayRows = txs.filter((t) => t.date === yesterday)
        })
        .catch((e) => uni.showToast({ title: e.message || '未连接到后端', icon: 'none' }))
        .finally(() => { this.loading = false })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx 24rpx 160rpx; }
.hero {
  background: linear-gradient(135deg, #FF8FB0, #FF7BA9);
  border-radius: 28rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  color: #fff;
}
.hero-month { font-size: 24rpx; opacity: 0.9; margin-bottom: 16rpx; }
.hero-balance-label { font-size: 24rpx; opacity: 0.9; }
.hero-balance { font-size: 60rpx; font-weight: 700; margin: 8rpx 0 24rpx; }
.hero-sub { display: flex; justify-content: space-between; }
.hero-sub-item { display: flex; flex-direction: column; }
.hero-sub-label { font-size: 22rpx; opacity: 0.9; }
.hero-sub-value { font-size: 32rpx; font-weight: 700; }
.hero-sub-value.exp { color: #fff; }
.hero-sub-value.inc { color: #fff; }
.budget-empty { display: flex; flex-direction: column; align-items: center; padding: 32rpx; }
.budget-empty-title { font-weight: 700; margin-bottom: 8rpx; }
.budget-empty-sub { color: #9B8A92; font-size: 24rpx; }
.sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.sec-title { font-weight: 700; font-size: 30rpx; }
.sec-sub { color: #9B8A92; font-size: 24rpx; }
.quick-grid { display: flex; justify-content: space-between; }
.quick-item { display: flex; flex-direction: column; align-items: center; }
.quick-badge { width: 88rpx; height: 88rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.quick-label { font-size: 24rpx; margin-top: 8rpx; }
.txn-group { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.day { font-weight: 700; }
.sum { color: #9B8A92; font-size: 24rpx; }
.txn-item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #F2E6EC; }
.txn-item:last-child { border-bottom: none; }
.txn-icon { width: 64rpx; height: 64rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; margin-right: 16rpx; }
.txn-main { flex: 1; display: flex; flex-direction: column; }
.txn-name { font-size: 28rpx; }
.txn-meta { font-size: 22rpx; color: #9B8A92; }
.txn-amount { font-weight: 700; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 80rpx 40rpx; }
.empty-icon { font-size: 80rpx; }
.empty-title { font-weight: 700; font-size: 32rpx; margin: 16rpx 0 8rpx; }
.empty-desc { color: #9B8A92; text-align: center; margin-bottom: 24rpx; }
.primary-btn { background: #FF7BA9; color: #fff; border-radius: 40rpx; font-size: 30rpx; padding: 0 48rpx; }
</style>
