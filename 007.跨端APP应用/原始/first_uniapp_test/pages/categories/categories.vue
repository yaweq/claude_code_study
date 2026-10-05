<template>
  <view class="page">
    <view class="type-seg">
      <view class="seg-btn" :class="{ on: type === 'expense' }" @tap="switchType('expense')">支出</view>
      <view class="seg-btn" :class="{ on: type === 'income' }" @tap="switchType('income')">收入</view>
    </view>

    <view class="card">
      <view v-for="c in list" :key="c.id" class="cat-item">
        <text class="cat-icon">{{ c.icon }}</text>
        <text class="cat-name">{{ c.name }}</text>
        <view class="cat-ops">
          <text class="op" @tap="rename(c)">改名</text>
          <text class="op danger" @tap="remove(c)">删除</text>
        </view>
      </view>
      <view v-if="!list.length" class="empty-tip">暂无分类</view>
    </view>

    <button class="add-btn" @tap="add">＋ 新增分类</button>
  </view>
</template>

<script>
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../utils/api'

const ICONS = ['🍜', '🚇', '🛒', '🏠', '💡', '📱', '🎮', '💊', '🎓', '🐶', '✈️', '📦', '💰', '🎁', '📈', '🧧']

export default {
  data() {
    return { type: 'expense', list: [] }
  },
  onShow() { this.load() },
  methods: {
    switchType(t) { this.type = t; this.load() },
    load() {
      getCategories(this.type).then((list) => { this.list = list }).catch((e) => uni.showToast({ title: e.message, icon: 'none' }))
    },
    add() {
      uni.showModal({
        title: '新增' + (this.type === 'expense' ? '支出' : '收入') + '分类',
        editable: true,
        placeholderText: '分类名称',
        success: (res) => {
          if (!res.confirm || !res.content) return
          const icon = ICONS[Math.floor(Math.random() * ICONS.length)]
          createCategory({ name: res.content.trim(), type: this.type, icon })
            .then(() => { uni.showToast({ title: '已添加' }); this.load() })
            .catch((e) => uni.showToast({ title: e.message, icon: 'none' }))
        }
      })
    },
    rename(c) {
      uni.showModal({
        title: '重命名分类',
        editable: true,
        placeholderText: c.name,
        success: (res) => {
          if (!res.confirm || !res.content) return
          updateCategory(c.id, { name: res.content.trim(), icon: c.icon, sort: c.sort })
            .then(() => { uni.showToast({ title: '已保存' }); this.load() })
            .catch((e) => uni.showToast({ title: e.message, icon: 'none' }))
        }
      })
    },
    remove(c) {
      uni.showModal({
        title: '删除分类',
        content: '删除「' + c.name + '」后，该分类下的账目将移入回收站。确定删除？',
        success: (res) => {
          if (!res.confirm) return
          deleteCategory(c.id)
            .then(() => { uni.showToast({ title: '已删除' }); this.load() })
            .catch((e) => uni.showToast({ title: e.message, icon: 'none' }))
        }
      })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx 24rpx 150rpx; }
.type-seg { display: flex; justify-content: center; margin-bottom: 24rpx; }
.seg-btn { padding: 10rpx 48rpx; border-radius: 30rpx; background: #fff; margin: 0 12rpx; }
.seg-btn.on { background: #FF7BA9; color: #fff; }
.cat-item { display: flex; align-items: center; padding: 24rpx 8rpx; border-bottom: 1rpx solid #F2E6EC; }
.cat-item:last-child { border-bottom: none; }
.cat-icon { font-size: 40rpx; margin-right: 20rpx; }
.cat-name { flex: 1; }
.cat-ops { display: flex; gap: 24rpx; }
.op { color: #007AFF; font-size: 26rpx; }
.op.danger { color: #FF5C7A; }
.empty-tip { text-align: center; color: #9B8A92; padding: 40rpx 0; }
.add-btn { margin-top: 24rpx; background: #FF7BA9; color: #fff; border-radius: 44rpx; }
</style>
