// Sales figures for Cook → Metrics.
// Real sales: accepted / ready / picked-up incoming orders + paid custom requests.
// Demo: a deterministic sample history for your menu (seeded per dish and day) so a new kitchen
// has something to look at. Replace `salesRecords` with an API call once there is a backend.

const DAY = 86400000
const COUNTED = ['accepted', 'cooking', 'ready', 'picked']
export const CUSTOM_KEY = 'custom'

// Small seeded RNG: same dish + same day → same numbers on every reload.
function seeded(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296 }
}

const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }

function sampleHistory(dishes, now) {
  const out = []
  const today = startOfDay(now)
  dishes.forEach((dish, idx) => {
    const popularity = [1, 0.8, 0.62, 0.48, 0.38, 0.3][idx] ?? 0.25
    for (let back = 1; back <= 190; back++) {
      const day = today - back * DAY
      const rand = seeded(`${dish.id}:${new Date(day).toDateString()}`)
      const dow = new Date(day).getDay()
      const weekend = dow === 0 || dow === 6 ? 1.6 : 1
      const growth = 0.6 + 0.4 * (1 - back / 190)          // the kitchen slowly gets busier
      const orders = Math.floor(rand() * 3.2 * popularity * weekend * growth)
      for (let k = 0; k < orders; k++) {
        const qty = 1 + Math.floor(rand() * 3)
        out.push({ at: day + (11 + rand() * 9) * 3600000, key: dish.id, qty, revenue: qty * dish.price, sample: true })
      }
    }
  })
  return out
}

export function salesRecords({ dishes, incoming, requests, kitchenId }, now = Date.now()) {
  const byId = Object.fromEntries(dishes.map((d) => [d.id, d]))
  const real = incoming.filter((o) => COUNTED.includes(o.status) && byId[o.dishId]).map((o) => ({
    at: o.acceptedAt ?? o.at, key: o.dishId, qty: o.qty, revenue: o.qty * byId[o.dishId].price,
  }))
  const custom = requests.filter((r) => r.kitchenId === kitchenId && ['paid', 'ready', 'picked'].includes(r.status)).map((r) => ({
    at: r.paidAt ?? r.createdAt, key: CUSTOM_KEY, qty: r.portions, revenue: r.quote?.price ?? 0,
  }))
  return [...sampleHistory(dishes, now), ...real, ...custom]
}

// Buckets for the bar chart. Weeks run Monday → Sunday.
export function buckets(range, now = Date.now()) {
  const fmt = (t, o) => new Date(t).toLocaleDateString('en-IN', o)
  const today = startOfDay(now)
  if (range === 'day') {
    return Array.from({ length: 7 }, (_, i) => {
      const start = today - (6 - i) * DAY
      return { start, end: start + DAY, label: fmt(start, { weekday: 'short' }), sub: fmt(start, { day: 'numeric' }), full: fmt(start, { weekday: 'long', day: 'numeric', month: 'short' }), current: i === 6 }
    })
  }
  if (range === 'week') {
    const monday = today - ((new Date(today).getDay() + 6) % 7) * DAY
    return Array.from({ length: 6 }, (_, i) => {
      const start = monday - (5 - i) * 7 * DAY; const last = start + 6 * DAY
      const sameMonth = new Date(start).getMonth() === new Date(last).getMonth()
      const label = `${fmt(start, { day: 'numeric' })}–${fmt(last, { day: 'numeric' })}`
      const sub = sameMonth ? fmt(last, { month: 'short' }) : `${fmt(start, { month: 'short' })}/${fmt(last, { month: 'short' })}`
      return { start, end: start + 7 * DAY, label, sub, full: `${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(last, { day: 'numeric', month: 'short' })}`, current: i === 5 }
    })
  }
  const d = new Date(now)
  return Array.from({ length: 6 }, (_, i) => {
    const start = new Date(d.getFullYear(), d.getMonth() - (5 - i), 1).getTime()
    const end = new Date(d.getFullYear(), d.getMonth() - (5 - i) + 1, 1).getTime()
    return { start, end, label: fmt(start, { month: 'short' }), sub: fmt(start, { year: '2-digit' }), full: fmt(start, { month: 'long', year: 'numeric' }), current: i === 5 }
  })
}

export function barData(records, bs, now = Date.now()) {
  return bs.map((b) => {
    const inB = records.filter((r) => r.at >= b.start && r.at < b.end && r.at <= now)
    return { ...b, revenue: inB.reduce((s, r) => s + r.revenue, 0), orders: inB.length, portions: inB.reduce((s, r) => s + r.qty, 0) }
  })
}

// Which entities get their own colour: the top 5 by all-time revenue, coloured in menu order
// (custom orders last), so a dish keeps its colour in every chart and every range.
export function colourKeys(records, dishes) {
  const rev = {}
  records.forEach((r) => { rev[r.key] = (rev[r.key] ?? 0) + r.revenue })
  const top = Object.keys(rev).sort((a, b) => rev[b] - rev[a]).slice(0, 5)
  const order = [...dishes.map((d) => d.id), CUSTOM_KEY]
  return order.filter((k) => top.includes(k))
}

// Per-dish totals for a period, folded to the coloured entities + "Other".
export function pieData(records, from, to, keys, nameOf, metric) {
  const tot = {}
  records.filter((r) => r.at >= from && r.at < to).forEach((r) => {
    const k = keys.includes(r.key) ? r.key : 'other'
    const v = metric === 'orders' ? 1 : metric === 'portions' ? r.qty : r.revenue
    tot[k] = (tot[k] ?? 0) + v
  })
  const sum = Object.values(tot).reduce((a, b) => a + b, 0)
  const rows = [...keys, 'other'].filter((k) => tot[k]).map((k) => ({
    key: k, name: k === 'other' ? 'Other' : nameOf(k), value: tot[k], pct: sum ? tot[k] / sum : 0,
    colour: k === 'other' ? 'var(--series-other)' : `var(--series-${keys.indexOf(k) + 1})`,
  }))
  // ranked for the legend; "Other" always last
  return { sum, rows: rows.sort((a, b) => (a.key === 'other') - (b.key === 'other') || b.value - a.value) }
}

// "Notify me" subscribers per dish: a fixed sample per dish (demo) + real taps on this phone.
export function notifyCounts(dishes, subs, kitchenId) {
  return dishes.map((d) => {
    const rand = seeded(`notify:${d.id}`)
    const sample = Math.floor(rand() * 15)
    const mine = subs[`${kitchenId}|${d.id}`] ? 1 : 0
    return { key: d.id, name: d.name, value: sample + mine, mine: !!mine }
  })
}
