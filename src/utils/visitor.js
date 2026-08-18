/**
 * 访客匿名 ID 工具
 * ---------------------------------------------------------------------------
 * 本站 UV 去重的身份来源：每个浏览器一个稳定的匿名随机 ID（localStorage），
 * 随 /api/hit 上报，服务端据此去重（校园 NAT 下共享出口 IP，IP+UA 指纹会把
 * 大量真实访客算成同一人）。ID 为纯匿名随机串，不含任何个人信息。
 * 无痕 / 清除浏览器数据会生成新 ID（与行业 cookie 统计一致）。
 */

const VID_KEY = 'qdu_nav_vid'

export function visitorId() {
  try {
    let vid = localStorage.getItem(VID_KEY)
    if (!vid) {
      vid =
        (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
        'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem(VID_KEY, vid)
    }
    return vid
  } catch {
    // localStorage 不可用（隐私模式/被禁用）：返回空，服务端回退 IP+UA 指纹
    return ''
  }
}
