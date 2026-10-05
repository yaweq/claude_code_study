<template>
  <view class="page">
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

    <!-- 关于 -->
    <view class="about">数据存储于本地 MySQL，金额以「元」精确存储</view>
  </view>
</template>

<script>
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
      if (title === '关于') {
        uni.showModal({ title: '每日记账', content: '个人财务记账跨端应用（uni-app）\n安卓 / iOS / 微信小程序', showCancel: false })
      } else {
        uni.showToast({ title: title + '：功能开发中', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx 24rpx 60rpx; }
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
