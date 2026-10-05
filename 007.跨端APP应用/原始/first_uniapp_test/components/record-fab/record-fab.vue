<template>
  <view class="record-fab" @tap="goRecord">＋</view>
</template>

<script>
export default {
  name: 'record-fab',
  methods: {
    goRecord() {
      uni.navigateTo({ url: '/pages/record/record' })
    }
  }
}
</script>

<style scoped>
.record-fab {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #FF7BA9;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 52rpx;
  z-index: 999;
  box-shadow: 0 8rpx 20rpx rgba(255, 123, 169, 0.4);
}
</style>
