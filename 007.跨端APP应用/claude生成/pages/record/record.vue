<template>
  <view class="page">
    <!-- 支出/收入切换 -->
    <view class="type-seg">
      <view class="seg-btn" :class="{ on: type === 'expense' }" @tap="switchType('expense')">支出</view>
      <view class="seg-btn" :class="{ on: type === 'income' }" @tap="switchType('income')">收入</view>
    </view>

    <!-- 金额输入 -->
    <view class="amount-box">
      <text class="currency">¥</text>
      <input class="amount-input" type="digit" v-model="amount" placeholder="0.00" focus />
    </view>
    <view class="quick-row">
      <view v-for="v in ['10', '20', '50', '100']" :key="v" class="quick-chip" @tap="amount = v">{{ v }}</view>
    </view>

    <!-- 分类宫格 -->
    <view class="cat-grid">
      <view v-for="(c, i) in currentCats" :key="c.id" class="cat-cell" :class="{ on: selectedCatId === c.id }" @tap="selectedCatId = c.id">
        <view class="cat-icon" :style="{ background: palette[i % palette.length] }">{{ c.icon }}</view>
        <text class="cat-name">{{ c.name }}</text>
      </view>
    </view>

    <!-- 账户 / 日期 / 备注 -->
    <view class="field">
      <text class="field-label">账户</text>
      <picker mode="selector" :range="accounts" @change="onAccount">
        <view class="field-value">{{ account }} ▾</view>
      </picker>
    </view>
    <view class="field">
      <text class="field-label">日期</text>
      <picker mode="date" :value="date" @change="onDate">
        <view class="field-value">{{ date }} ▾</view>
      </picker>
    </view>
    <view class="field">
      <text class="field-label">备注</text>
      <input class="field-input" v-model="note" placeholder="写点什么…" maxlength="100" />
    </view>

    <button class="save-btn" @tap="save">✓ 完成</button>
  </view>
</template>

<script>
import { getCategories, addTransaction } from '../../utils/api'
import { localToday, PALETTE } from '../../utils/format'

export default {
  data() {
    return {
      type: 'expense',
      amount: '',
      selectedCatId: null,
      account: '现金',
      accounts: ['现金', '微信', '支付宝', '银行卡'],
      date: localToday(),
      note: '',
      cats: { expense: [], income: [] },
      palette: PALETTE,
      preset: ''
    }
  },
  computed: {
    currentCats() { return this.cats[this.type] }
  },
  onLoad(options) {
    this.preset = options.cat || ''
    this.loadCategories()
  },
  methods: {
    loadCategories() {
      getCategories()
        .then((list) => {
          list.forEach((c) => { this.cats[c.type].push(c) })
          if (this.preset) {
            const c = this.currentCats.find((x) => x.name === this.preset)
            if (c) this.selectedCatId = c.id
          }
        })
        .catch((e) => uni.showToast({ title: e.message || '未连接到后端', icon: 'none' }))
    },
    switchType(t) {
      this.type = t
      this.selectedCatId = null
    },
    onAccount(e) { this.account = this.accounts[e.detail.value] },
    onDate(e) { this.date = e.detail.value },
    save() {
      const yuan = parseFloat(this.amount)
      if (!this.amount || isNaN(yuan) || yuan <= 0) { uni.showToast({ title: '请输入有效金额', icon: 'none' }); return }
      if (!this.selectedCatId) { uni.showToast({ title: '请选择分类', icon: 'none' }); return }
      const body = {
        type: this.type,
        amount: Math.round(yuan * 100) / 100,
        category_id: this.selectedCatId,
        account: this.account,
        note: this.note.trim() || null,
        date: this.date
      }
      addTransaction(body)
        .then(() => {
          uni.showToast({ title: '已记录 ¥' + yuan.toFixed(2) })
          setTimeout(() => uni.switchTab({ url: '/pages/bills/bills' }), 800)
        })
        .catch((e) => uni.showToast({ title: '保存失败：' + e.message, icon: 'none' }))
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.type-seg { display: flex; justify-content: center; margin-bottom: 24rpx; }
.seg-btn { padding: 12rpx 48rpx; border-radius: 30rpx; background: #fff; margin: 0 12rpx; }
.seg-btn.on { background: #FF7BA9; color: #fff; }
.amount-box { display: flex; align-items: center; justify-content: center; margin-bottom: 12rpx; }
.currency { font-size: 48rpx; color: #4A3F44; }
.amount-input { font-size: 72rpx; font-weight: 700; width: 400rpx; text-align: center; }
.quick-row { display: flex; justify-content: center; gap: 16rpx; margin-bottom: 24rpx; }
.quick-chip { padding: 8rpx 28rpx; border-radius: 30rpx; background: #FFECF1; color: #F75C8A; }
.cat-grid { display: flex; flex-wrap: wrap; }
.cat-cell { width: 20%; display: flex; flex-direction: column; align-items: center; padding: 12rpx 0; }
.cat-icon { width: 84rpx; height: 84rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.cat-cell.on .cat-name { color: #F75C8A; font-weight: 700; }
.cat-name { font-size: 22rpx; margin-top: 6rpx; }
.field { display: flex; align-items: center; padding: 24rpx 8rpx; border-bottom: 1rpx solid #F2E6EC; }
.field-label { width: 120rpx; color: #9B8A92; }
.field-value { flex: 1; }
.field-input { flex: 1; }
.save-btn { margin-top: 32rpx; background: #FF7BA9; color: #fff; border-radius: 44rpx; font-size: 32rpx; }
</style>
