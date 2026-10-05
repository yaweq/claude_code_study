<template>
  <view class="page">
    <view class="card">
      <view class="card-title">{{ month }} 月度预算</view>

      <!-- 总预算 -->
      <view class="budget-item">
        <text class="b-name">💰 总预算</text>
        <text class="b-amount">{{ totalAmount == null ? '未设置' : '¥' + totalAmount }}</text>
        <text class="b-set" @tap="editBudget(null)">设置</text>
      </view>

      <view class="divider"></view>

      <!-- 分类预算 -->
      <view v-for="c in cats" :key="c.id" class="budget-item">
        <text class="b-name">{{ c.icon }} {{ c.name }}</text>
        <text class="b-amount">{{ amountOf(c.id) == null ? '未设置' : '¥' + amountOf(c.id) }}</text>
        <text class="b-set" @tap="editBudget(c.id)">设置</text>
      </view>
    </view>

    <view class="tip">提示：预算按「月」设置，金额单位元；设为 0 可清除预算。</view>
  </view>
</template>

<script>
import { getCategories, getBudgets, setBudget } from '../../utils/api'
import { localMonth } from '../../utils/format'

export default {
  data() {
    return { month: localMonth(), cats: [], budgetMap: {} }
  },
  computed: {
    totalAmount() { return this.budgetMap.total != null ? this.budgetMap.total : null }
  },
  onShow() { this.load() },
  methods: {
    load() {
      Promise.all([getCategories('expense'), getBudgets(this.month)])
        .then(([cats, budgets]) => {
          this.cats = cats
          const map = {}
          budgets.forEach((b) => { map[b.category_id == null ? 'total' : b.category_id] = b.amount })
          this.budgetMap = map
        })
        .catch((e) => uni.showToast({ title: e.message, icon: 'none' }))
    },
    amountOf(cid) { return this.budgetMap[cid] != null ? this.budgetMap[cid] : null },
    editBudget(cid) {
      const cur = cid == null ? this.totalAmount : this.amountOf(cid)
      uni.showModal({
        title: cid == null ? '设置总预算' : '设置分类预算',
        editable: true,
        placeholderText: cur != null ? '当前 ¥' + cur + '，输入新值或 0 清除' : '输入金额（元）',
        success: (res) => {
          if (!res.confirm) return
          const amt = parseFloat(res.content)
          if (isNaN(amt) || amt < 0) { uni.showToast({ title: '金额无效', icon: 'none' }); return }
          setBudget({ category_id: cid, month: this.month, amount: amt })
            .then(() => { uni.showToast({ title: '已保存' }); this.load() })
            .catch((e) => uni.showToast({ title: e.message, icon: 'none' }))
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx 24rpx 150rpx; }
.card-title { font-weight: 700; margin-bottom: 16rpx; }
.budget-item { display: flex; align-items: center; padding: 24rpx 8rpx; }
.b-name { flex: 1; }
.b-amount { color: #9B8A92; margin-right: 20rpx; }
.b-set { color: #007AFF; }
.divider { height: 1rpx; background: #F2E6EC; margin: 8rpx 0; }
.tip { color: #9B8A92; font-size: 22rpx; margin-top: 24rpx; text-align: center; }
</style>
