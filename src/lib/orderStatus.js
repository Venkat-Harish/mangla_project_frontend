// Backend orders carry a free-text order_status. Map it onto the app's four stages
// (store/index.js STATUSES: Paid → Order accepted → Ready for pickup → Picked up).

const STAGE_WORDS = [
  ['paid', 'placed', 'pending', 'new', 'created'],
  ['accepted', 'confirmed', 'cooking', 'preparing', 'inprogress'],
  ['ready', 'readyforpickup'],
  ['delivered', 'completed', 'complete', 'picked', 'pickedup', 'collected'],
]
const REJECTED = ['rejected', 'cancelled', 'canceled', 'declined', 'refunded']
// Mirrors the backend's default review.allowed_order_statuses; the backend has the final say (422).
const REVIEWABLE = ['delivered', 'completed']

const fold = (status) => String(status ?? '').toLowerCase().replace(/[\s_-]+/g, '')

export function orderStage(status) {
  const s = fold(status)
  const i = STAGE_WORDS.findIndex((words) => words.includes(s))
  return i === -1 ? 0 : i
}

export const isRejectedStatus = (status, refundFlag = false) => !!refundFlag || REJECTED.includes(fold(status))

// The status text as the backend sent it, tidied for display ("ready_for_pickup" → "Ready for pickup").
export function statusLabel(status) {
  const s = String(status ?? '').replace(/[_-]+/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : 'Placed'
}

export const canReview = (order) => order?.source === 'api' && !order.reviewId && REVIEWABLE.includes(fold(order.rawStatus))
