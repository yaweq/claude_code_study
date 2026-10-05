<script>
export default {
  onLaunch: function () {
    console.log('每日记账 App 启动')
  }
}
</script>

<style>
/* 全局基础样式（取自 PRD 第 6 章配色规范） */
page {
  background-color: #FFF7F9;
  color: #4A3F44;
  font-size: 28rpx;
  line-height: 1.5;
}
.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 24rpx;
  margin: 0 24rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.exp { color: #FF6B8A; }
.inc { color: #5EC99A; }
.muted { color: #9B8A92; }
</style>
