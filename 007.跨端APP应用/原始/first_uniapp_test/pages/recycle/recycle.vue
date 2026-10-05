<template>
  <view class="page">
    <view v-if="!list.length" class="empty">
      <text class="empty-icon">🗑️</text>
      <text class="empty-text">回收站是空的</text>
    </view>

    <view v-for="t in list" :key="t.id" class="card txn">
      <view class="txn-main">
        <text class="txn-icon">{{ t.category_icon || '📦' }}</text>
        <view class="txn-info">
          <text class="txn-name">{{ t.note || t.category_name }}</text>
          <text class="txn-meta">{{ t.category_name }} · {{ t.account }} · {{ t.date }}</text>
        </view>
        <text class="txn-amount" :class="t.type === 'expense' ? 'exp' : 'inc'">{{ t.type === 'expense' ? '-' : '+' }}¥{{ t.amount.toFixed(2) }}</text>
      </view>
      <view class="txn-ops">
        <text class="op" @tap="restore(t)">恢复</text>
        <text class="op danger" @tap="purge(t)">彻底删除</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getTransactions, restoreTransaction, purgeTransaction } from '../../utils/api'

export default {
  data() {
    return { list: [] }
  },
  onShow() { this.load() },
  methods: {
    load() {
      getTransactions({ deleted: 1 }).then((list) => { this.list = list }).catch((e) => uni.showToast({ title: e.message, icon: 'none' }))
    },
    restore(t) {
      restoreTransaction(t.id).then(() => { uni.showToast({ title: '已恢复' }); this.load() }).catch((e) => uni.showToast({ title: e.message, icon: 'none' }))
    },
    purge(t) {
      uni.showModal({
        title: '彻底删除',
        content: '彻底删除后不可恢复，确定删除「' + (t.note || t.category_name) + '」？',
        success: (res) => {
          if (!res.confirm) return
          purgeTransaction(t.id).then(() => { uni.showToast({ title: '已删除' }); this.load() }).catch((e) => uni.showToast({ title: e.message, icon: 'none' }))
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx 24rpx 150rpx; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0; }
.empty-icon { font-size: 80rpx; }
.empty-text { color: #9B8A92; margin-top: 16rpx; }
.txn { padding: 20rpx 24rpx; margin-bottom: 16rpx; }
.txn-main { display: flex; align-items: center; }
.txn-icon { font-size: 36rpx; margin-right: 16rpx; }
.txn-info { flex: 1; display: flex; flex-direction: column; }
.txn-name { font-size: 28rpx; }
.txn-meta { font-size: 22rpx; color: #9B8A92; }
.txn-amount { font-weight: 700; }
.txn-ops { display: flex; justify-content: flex-end; gap: 32rpx; margin-top: 12rpx; }
.op { color: #007AFF; font-size: 26rpx; }
.op.danger { color: #FF5C7A; }
</style>
