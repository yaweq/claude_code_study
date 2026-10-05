/**
 * API 层 —— 对接 006.后端代码 的 REST 接口
 *
 * 注意：BASE_URL 在真机（安卓/iOS）调试时，需要改成后端所在电脑的局域网 IP，
 * 例如 'http://192.168.1.100:3000'。127.0.0.1 在真机上指向手机自身，无法访问电脑后端。
 * 微信小程序要求后端为 HTTPS 且域名已在小程序后台配置为合法 request 域名。
 */
const BASE_URL = 'http://192.168.2.108:3000'

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + path,
      method: options.method || 'GET',
      data: options.data || {},
      header: { 'Content-Type': 'application/json' },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const msg = (res.data && res.data.error) || ('请求失败 ' + res.statusCode)
          reject(new Error(msg))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络错误'))
    })
  })
}

export const getSummary = (month) => request('/api/summary?month=' + month)

export const getTransactions = (params = {}) => {
  const qs = Object.keys(params)
    .filter((k) => params[k] !== '' && params[k] != null)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&')
  return request('/api/transactions' + (qs ? '?' + qs : ''))
}

export const getCategories = (type) => request('/api/categories' + (type ? '?type=' + type : ''))

export const getBreakdown = (month, type) => request('/api/breakdown?month=' + month + '&type=' + type)

export const getTrend = (months = 6) => request('/api/trend?months=' + months)

export const addTransaction = (data) => request('/api/transactions', { method: 'POST', data })

export const deleteTransaction = (id) => request('/api/transactions/' + id, { method: 'DELETE' })
