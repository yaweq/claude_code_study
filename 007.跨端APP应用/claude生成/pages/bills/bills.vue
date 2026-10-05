<template>
  <view class="page">
    <!-- 本月摘要 -->
    <view class="card summary">
      <view class="sum-item"><text class="sum-label">本月支出</text><text class="sum-value exp">{{ expenseText }}</text></view>
      <view class="sum-item"><text class="sum-label">本月收入</text><text class="sum-value inc">{{ incomeText }}</text></view>
      <view class="sum-item"><text class="sum-label">结余</text><text class="sum-value">{{ balanceText }}</text></view>
    </view>

    <!-- 筛选栏 -->
    <view class="chips">
      <view v-for="f in filterDefs" :key="f.key" class="chip" :class="{ on: isActive(f.key) }" @tap="togglePanel(f.key)">
        <text>{{ chipText(f.key) }}</text>
      </view>
      <view v-if="hasActive" class="chip clear" @tap="clearFilters">✕ 清除筛选</view>
    </view>

    <!-- 筛选面板 -->
    <view v-if="openKey" class="panel card">
      <view v-for="o in currentOptions" :key="String(o.v)" class="opt" :class="{ on: String(filters[openKey]) === String(o.v) }" @tap="applyFilter(openKey, o.v)">
        <text>{{ o.label }}</text>
      </view>
    </view>

    <!-- 列表 -->
    <view v-if="!filtered.length && !loading" class="empty-tip">没有符合条件的记录</view>
    <view v-for="g in grouped" :key="g.date" class="card">
      <view class="txn-group">
        <text class="day">{{ dayLabel(g.date) }} · {{ mdLabel(g.date) }}</text>
        <text class="sum">{{ g.sumText }}</text>
      </view>
      <view v-for="t in g.items" :key="t.id" class="txn-item" @longpress="onDelete(t)">
        <view class="txn-icon" :style="{ background: colorOf(t) }">{{ t.category_icon || '📦' }}</view>
        <view class="txn-main">
          <text class="txn-name">{{ t.note || t.category_name }}</text>
          <text class="txn-meta">{{ t.category_name }} · {{ t.account }}</text>
        </view>
        <text class="txn-amount" :class="t.type === 'expense' ? 'exp' : 'inc'">{{ t.type === 'expense' ? '-' : '+' }}{{ fmtMoney(t.amount) }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getSummary, getTransactions, getCategories, deleteTransaction } from '../../utils/api'
import { fmtMoney, localMonth, mdLabel, dayLabel, PALETTE } from '../../utils/format'

export default {
  data() {
    return {
      loading: true,
      expenseText: '¥0.00',
      incomeText: '¥0.00',
      balanceText: '¥0.00',
      allTxns: [],
      cats: [],
      filters: { type: '', cat: '', account: '', date: 'all' },
      openKey: null,
      filterDefs: [
        { key: 'type', label: '全部类型' },
        { key: 'cat', label: '全部分类' },
        { key: 'account', label: '账户资产' },
        { key: 'date', label: '日期范围' }
      ]
    }
  },
  computed: {
    hasActive() {
      return !!(this.filters.type || this.filters.cat || this.filters.account || this.filters.date !== 'all')
    },
    currentOptions() {
      if (this.openKey === 'type') {
        return [{ v: '', label: '全部类型' }, { v: 'expense', label: '支出' }, { v: 'income', label: '收入' }]
      }
      if (this.openKey === 'cat') {
        return [{ v: '', label: '全部分类' }].concat(this.cats.map((c) => ({ v: String(c.id), label: c.icon + ' ' + c.name })))
      }
      if (this.openKey === 'account') {
        return [{ v: '', label: '全部账户' }, { v: '现金', label: '现金' }, { v: '微信', label: '微信' }, { v: '支付宝', label: '支付宝' }, { v: '银行卡', label: '银行卡' }]
      }
      if (this.openKey === 'date') {
        return [{ v: 'all', label: '全部时间' }, { v: 'today', label: '今天' }, { v: 'week', label: '本周' }, { v: 'month', label: '本月' }, { v: 'lastMonth', label: '上月' }]
      }
      return []
    },
    filtered() {
      const f = this.filters
      return this.allTxns.filter((t) => {
        if (f.type && t.type !== f.type) return false
        if (f.cat && String(t.category_id) !== String(f.cat)) return false
        if (f.account && t.account !== f.account) return false
        return this.inDateRange(t.date)
      })
    },
    grouped() {
      const groups = {}
      this.filtered.forEach((t) => { (groups[t.date] = groups[t.date] || []).push(t) })
      const keys = Object.keys(groups).sort().reverse()
      return keys.map((date) => {
        const items = groups[date]
        let exp = 0
        let inc = 0
        items.forEach((t) => { t.type === 'expense' ? (exp += t.amount) : (inc += t.amount) })
        let sumText = ''
        if (exp && inc) sumText = '支 ' + fmtMoney(exp) + ' / 收 ' + fmtMoney(inc)
        else if (exp) sumText = '支出 ' + fmtMoney(exp)
        else sumText = '收入 ' + fmtMoney(inc)
        return { date, items, sumText }
      })
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    fmtMoney,
    mdLabel,
    dayLabel,
    colorOf(t) { return PALETTE[(t.category_id - 1) % PALETTE.length] },
    isActive(key) { return !!(this.filters[key] && this.filters[key] !== 'all') },
    chipText(key) {
      const v = this.filters[key]
      if (key === 'type') return v === 'expense' ? '支出' : v === 'income' ? '收入' : '全部类型'
      if (key === 'cat') { const c = this.cats.find((x) => String(x.id) === String(v)); return c ? c.name : '全部分类' }
      if (key === 'account') return v || '账户资产'
      return { all: '日期范围', today: '今天', week: '本周', month: '本月', lastMonth: '上月' }[v] || '日期范围'
    },
    inDateRange(dateStr) {
      const now = new Date()
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthStr = lastMonth.getFullYear() + '-' + (lastMonth.getMonth() + 1 < 10 ? '0' : '') + (lastMonth.getMonth() + 1)
      switch (this.filters.date) {
        case 'today': return dateStr === this.localToday()
        case 'week': return dateStr >= (weekStart.getFullYear() + '-' + (weekStart.getMonth() + 1 < 10 ? '0' : '') + (weekStart.getMonth() + 1) + '-' + (weekStart.getDate() < 10 ? '0' : '') + weekStart.getDate())
        case 'month': return dateStr.slice(0, 7) === localMonth()
        case 'lastMonth': return dateStr.slice(0, 7) === lastMonthStr
        default: return true
      }
    },
    localToday() {
      const d = new Date()
      return d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate()
    },
    togglePanel(key) {
      this.openKey = this.openKey === key ? null : key
    },
    applyFilter(key, value) {
      this.filters[key] = value
      this.openKey = null
    },
    clearFilters() {
      this.filters = { type: '', cat: '', account: '', date: 'all' }
      this.openKey = null
    },
    onDelete(t) {
      uni.showModal({
        title: '删除记录',
        content: '确定删除「' + (t.note || t.category_name) + '」吗？',
        success: (res) => {
          if (res.confirm) {
            deleteTransaction(t.id).then(() => { uni.showToast({ title: '已删除', icon: 'none' }); this.load() })
              .catch((e) => uni.showToast({ title: e.message, icon: 'none' }))
          }
        }
      })
    },
    load() {
      Promise.all([getSummary(localMonth()), getCategories(), getTransactions()])
        .then(([summary, cats, txs]) => {
          this.expenseText = fmtMoney(summary.expense)
          this.incomeText = fmtMoney(summary.income)
          this.balanceText = (summary.balance >= 0 ? '+' : '') + fmtMoney(summary.balance)
          this.cats = cats
          this.allTxns = txs
        })
        .catch((e) => uni.showToast({ title: e.message || '未连接到后端', icon: 'none' }))
        .finally(() => { this.loading = false })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx 24rpx 60rpx; }
.summary { display: flex; justify-content: space-around; text-align: center; }
.sum-item { display: flex; flex-direction: column; }
.sum-label { font-size: 22rpx; color: #9B8A92; }
.sum-value { font-size: 32rpx; font-weight: 700; margin-top: 6rpx; }
.chips { display: flex; flex-wrap: wrap; gap: 16rpx; margin: 0 24rpx 20rpx; }
.chip { padding: 10rpx 24rpx; border-radius: 30rpx; background: #fff; color: #4A3F44; font-size: 24rpx; }
.chip.on { background: #FFD6E5; color: #F75C8A; }
.chip.clear { background: #FFECF1; color: #F75C8A; }
.panel { margin: 0 24rpx 20rpx; padding: 8rpx; }
.opt { padding: 20rpx 16rpx; border-radius: 12rpx; }
.opt.on { background: #FFECF1; color: #F75C8A; font-weight: 700; }
.empty-tip { text-align: center; color: #9B8A92; padding: 60rpx 0; }
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
</style>
