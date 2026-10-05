/**
 * 工具函数 —— 金额/日期格式化（不依赖 toLocaleString，兼容小程序 JSCore）
 */

// 元 -> ¥字符串，如 2088 -> "¥2,088.00"
export function fmtMoney(amount) {
  const sign = Number(amount) < 0 ? '-' : ''
  const n = Math.abs(Number(amount))
  const s = n.toFixed(2)
  const parts = s.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return sign + '¥' + parts.join('.')
}

export function pad(n) {
  return (n < 10 ? '0' : '') + n
}

export function dstr(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

export function localToday() {
  return dstr(new Date())
}

export function localMonth() {
  return localToday().slice(0, 7)
}

// 'YYYY-MM-DD' -> 'M月D日'
export function mdLabel(dateStr) {
  const p = dateStr.split('-')
  return parseInt(p[1], 10) + '月' + parseInt(p[2], 10) + '日'
}

// 'YYYY-MM-DD' -> '今天' / '昨天' / 'M月D日'
export function dayLabel(dateStr) {
  if (dateStr === localToday()) return '今天'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (dateStr === dstr(y)) return '昨天'
  return mdLabel(dateStr)
}

// 分类马卡龙色板（PRD 第 6 章）
export const PALETTE = ['#FFB3C1', '#FFD98E', '#8FE0C3', '#C9B4E8', '#9FD3E8', '#FFA891']
