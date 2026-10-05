<template>
  <view class="page">
    <record-fab />

    <!-- 头部 -->
    <view class="head card">
      <view class="avatar">💰</view>
      <view class="head-info">
        <text class="head-name">每日记账</text>
        <text class="head-sub">v1.0.0 · 跨端版</text>
      </view>
    </view>

    <!-- 菜单 -->
    <view class="menu card">
      <view v-for="m in menu" :key="m.title" class="menu-item" @tap="onMenu(m.title)">
        <text class="menu-icon">{{ m.icon }}</text>
        <text class="menu-title">{{ m.title }}</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="about">数据存储于本地 MySQL，金额以「元」精确存储</view>
  </view>
</template>

<script>
import { getTransactions } from '../../utils/api'

export default {
  data() {
    return {
      menu: [
        { title: '分类管理', icon: '🗂️' },
        { title: '预算管理', icon: '🎯' },
        { title: '数据导出', icon: '📤' },
        { title: '回收站', icon: '🗑️' },
        { title: '关于', icon: 'ℹ️' }
      ]
    }
  },
  methods: {
    onMenu(title) {
      if (title === '分类管理') return uni.navigateTo({ url: '/pages/categories/categories' })
      if (title === '预算管理') return uni.navigateTo({ url: '/pages/budget/budget' })
      if (title === '回收站') return uni.navigateTo({ url: '/pages/recycle/recycle' })
      if (title === '数据导出') return this.exportCsv()
      if (title === '关于') {
        uni.showModal({ title: '每日记账', content: '个人财务记账跨端应用（uni-app）\n安卓 / iOS / 微信小程序', showCancel: false })
      }
    },
    exportCsv() {
      uni.showLoading({ title: '导出中' })
      getTransactions()
        .then((txs) => {
          uni.hideLoading()
          if (!txs.length) { uni.showToast({ title: '暂无数据', icon: 'none' }); return }
          let csv = '类型,分类,金额,账户,备注,日期\n'
          txs.forEach((t) => {
            const row = [
              t.type === 'expense' ? '支出' : '收入',
              t.category_name,
              t.amount,
              t.account,
              (t.note || '').replace(/,/g, '，'),
              t.date
            ].join(',')
            csv += row + '\n'
          })
          uni.setClipboardData({
            data: csv,
            success: () => uni.showToast({ title: '已复制 CSV（' + txs.length + ' 条）' })
          })
        })
        .catch((e) => { uni.hideLoading(); uni.showToast({ title: e.message, icon: 'none' }) })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx 24rpx 150rpx; }
.head { display: flex; align-items: center; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; background: #FFECF1; display: flex; align-items: center; justify-content: center; font-size: 48rpx; margin-right: 24rpx; }
.head-name { font-weight: 700; font-size: 32rpx; }
.head-sub { color: #9B8A92; font-size: 24rpx; }
.menu { padding: 8rpx 0; }
.menu-item { display: flex; align-items: center; padding: 28rpx 24rpx; border-bottom: 1rpx solid #F2E6EC; }
.menu-item:last-child { border-bottom: none; }
.menu-icon { margin-right: 20rpx; }
.menu-title { flex: 1; }
.menu-arrow { color: #C9BCC4; font-size: 36rpx; }
.about { text-align: center; color: #C9BCC4; font-size: 22rpx; margin-top: 32rpx; }
</style>
