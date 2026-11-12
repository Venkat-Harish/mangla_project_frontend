import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STATUS_STEP_MS } from '../config.js'
import { useCook } from './cook.js'
import { useRequests } from './requests.js'

// v1: the demo kitchens were replaced by the pilot kitchens (src/data/cooks.js), so
// buyer data saved against the old kitchen ids is dropped once.
const FRESH_V1 = (fresh) => ({ version: 1, migrate: fresh })

export const useAuth = create(persist((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}), { name: 'handi-auth' }))

// One kitchen per cart, because pickup happens at one door.
export const useCart = create(persist((set, get) => ({
  kitchenId: null,
  qty: {},           // itemId -> quantity
  note: '',
  count: () => Object.values(get().qty).reduce((a, b) => a + b, 0),
  conflicts: (kitchenId) => !!get().kitchenId && get().kitchenId !== kitchenId && get().count() > 0,
  setQty: (kitchenId, itemId, n) => set((s) => {
    const qty = { ...(s.kitchenId === kitchenId ? s.qty : {}) }
    if (n > 0) qty[itemId] = n; else delete qty[itemId]
    const empty = Object.keys(qty).length === 0
    return { kitchenId: empty ? null : kitchenId, qty, note: s.kitchenId === kitchenId ? s.note : '' }
  }),
  setNote: (note) => set({ note }),
  clear: () => set({ kitchenId: null, qty: {}, note: '' }),
}), { name: 'handi-cart', ...FRESH_V1(() => ({ kitchenId: null, qty: {}, note: '' })) }))

export const STATUSES = ['Paid', 'Order accepted', 'Ready for pickup', 'Picked up']
export const ACCEPTED = 1
export const READY = 2
export const PICKED = 3

// Orders from your own kitchen (cook mode) follow the cook's actions instead of a timer.
// ('cooking' is a retired status from an older version; it counts as accepted.)
const STAGE = { pending: 0, accepted: ACCEPTED, cooking: ACCEPTED, ready: READY, picked: PICKED }
const STAGE_TIME = ['at', 'acceptedAt', 'readyAt', 'pickedAt']
const linkedLines = (order) => (order.cookLinked ? useCook.getState().incoming.filter((o) => o.buyerOrderId === order.id) : [])

// The kitchen turned every line of this order down (it's refunded).
export function isRejected(order) {
  const lines = linkedLines(order)
  return lines.length > 0 && lines.every((l) => l.status === 'rejected')
}

// Mock kitchens: the status advances on a timer up to "Ready";
// "Picked up" happens when the user confirms at the kitchen.
// Custom orders follow their chat request: paid → accepted, ready → ready, picked → picked.
const REQUEST_STAGE = { paid: ACCEPTED, ready: READY, picked: PICKED }
const requestOf = (order) => (order.requestId ? useRequests.getState().requests.find((r) => r.id === order.requestId) : null)

export function statusIndex(order, now = Date.now()) {
  if (order.pickedUpAt) return PICKED
  if (order.requestId) return REQUEST_STAGE[requestOf(order)?.status] ?? ACCEPTED
  if (order.cookLinked) {
    const live = linkedLines(order).filter((l) => l.status !== 'rejected')
    return live.length ? Math.min(READY, ...live.map((l) => STAGE[l.status] ?? 0)) : 0
  }
  const i = Math.floor((now - (order.placedAt ?? now) + (order.skipMs ?? 0)) / STATUS_STEP_MS)
  return Number.isFinite(i) ? Math.max(0, Math.min(READY, i)) : 0
}
export function stepTime(order, i) {
  if (i === PICKED) return order.pickedUpAt
  if (order.requestId) { const r = requestOf(order); return [order.placedAt, r?.paidAt, r?.readyAt][i] ?? null }
  if (order.cookLinked) return i === 0 ? order.placedAt : Math.max(...linkedLines(order).map((l) => l[STAGE_TIME[i]] ?? 0)) || null
  return Math.max(order.placedAt, order.placedAt + i * STATUS_STEP_MS - (order.skipMs ?? 0))
}

export const useOrders = create(persist((set, get) => ({
  orders: [],
  place: ({ kitchenId, lines, total, note, cookLinked = false, requestId = null }) => {
    const id = 'HD-' + String(Math.floor(1000 + Math.random() * 9000))
    const order = { id, kitchenId, lines, total, note, cookLinked, requestId, placedAt: Date.now(), skipMs: 0, pickedUpAt: null, ratedAt: null, pickupCode: id.slice(3) }
    set((s) => ({ orders: [order, ...s.orders] }))
    return id
  },
  advance: (id) => set((s) => ({
    orders: s.orders.map((o) => {
      if (o.id !== id) return o
      const now = Date.now(); const i = statusIndex(o, now)
      if (i >= READY) return { ...o, pickedUpAt: o.pickedUpAt ?? now }
      return { ...o, skipMs: (i + 1) * STATUS_STEP_MS - (now - o.placedAt) + 1 }
    }),
  })),
  pickUp: (id) => {
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, pickedUpAt: Date.now() } : o)) }))
    const o = get().orders.find((x) => x.id === id)
    if (o?.cookLinked) useCook.getState().markPicked(id)
    if (o?.requestId) useRequests.getState().markPicked(o.requestId)
  },
  markRated: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ratedAt: Date.now() } : o)) })),
  get: (id) => get().orders.find((o) => o.id === id),
  clearAll: () => set({ orders: [] }),
}), { name: 'handi-orders', ...FRESH_V1(() => ({ orders: [] })) }))

// The kitchen this user runs (if they registered one) and whether they're cooking or eating.
export const useMyKitchen = create(persist((set) => ({
  kitchen: null,     // { id, name, phone, logo, createdAt }
  mode: 'eat',       // 'eat' | 'cook'
  register: (kitchen) => set({ kitchen }),
  update: (patch) => set((s) => ({ kitchen: { ...s.kitchen, ...patch } })),
  setMode: (mode) => set({ mode }),
  clearAll: () => set({ kitchen: null, mode: 'eat' }),
}), { name: 'handi-my-kitchen' }))

// Which story slides this user has watched (grey ring vs turmeric ring).
export const useStories = create(persist((set) => ({
  seen: {},
  markSeen: (id) => set((s) => (s.seen[id] ? s : { seen: { ...s.seen, [id]: true } })),
  clearAll: () => set({ seen: {} }),
}), { name: 'handi-stories', ...FRESH_V1(() => ({ seen: {} })) }))

// Reviews written by this user; merged with mock reviews on kitchen pages.
export const useMyReviews = create(persist((set) => ({
  reviews: [],
  add: (list) => set((s) => ({ reviews: [...list, ...s.reviews] })),
  clearAll: () => set({ reviews: [] }),
}), { name: 'handi-reviews', ...FRESH_V1(() => ({ reviews: [] })) }))

// App preferences on this phone. theme: 'light' | 'dark' | 'system' (follows the phone).
export const usePrefs = create(persist((set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),
}), { name: 'handi-prefs' }))

// Favourite kitchens. A pinned kitchen sits first on Home, and so do its stories.
export const usePins = create(persist((set, get) => ({
  pins: {},   // kitchenId -> pinned at
  isPinned: (id) => !!get().pins[id],
  toggle: (id) => {
    const on = !get().pins[id]
    set((s) => { const pins = { ...s.pins }; if (on) pins[id] = Date.now(); else delete pins[id]; return { pins } })
    return on
  },
  clearAll: () => set({ pins: {} }),
}), { name: 'handi-pins', ...FRESH_V1(() => ({ pins: {} })) }))
