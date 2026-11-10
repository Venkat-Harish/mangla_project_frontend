// Everything a cook manages: menu, live availability, incoming orders, posts and stories.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { neighbours } from '../data/mock.js'

const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Incoming order lifecycle. Orders placed through the buyer side carry `buyerOrderId`.
// Accepted orders become "ready" only when the cook slides the ready slider for that dish.
export const COOK_STATUSES = ['pending', 'accepted', 'ready', 'picked', 'rejected']
const COUNTS_AS_ORDERED = ['accepted', 'ready', 'picked']

// Dish media: ordered list of { id, type: 'image'|'video', url? (image data/remote URL), key? (video in IndexedDB) }.
export const coverOf = (dish) => dish.media?.find((m) => m.type === 'image')?.url ?? null
export const newMediaId = () => uid('m')

// Portions picture for one dish.
export function dishStats(dish, incoming) {
  const mine = incoming.filter((o) => o.dishId === dish.id)
  const portions = dish.live?.portions ?? 0
  const ordered = mine.filter((o) => COUNTS_AS_ORDERED.includes(o.status)).reduce((s, o) => s + o.qty, 0)
  const pending = mine.filter((o) => o.status === 'pending').reduce((s, o) => s + o.qty, 0)
  const pendingCount = mine.filter((o) => o.status === 'pending').length
  const left = portions - ordered
  // What a buyer may still order: pending orders hold their portions so nobody oversells.
  return { portions, ordered, pending, pendingCount, left, buyerLeft: Math.max(0, left - pending), over: Math.max(0, pending - left) }
}

const fakeOrder = (dishId, qty, minsAgo = 0) => {
  const [name, flat] = pick(neighbours)
  return { id: uid('o'), dishId, buyer: { name, flat }, qty, at: Date.now() - minsAgo * 60000, status: 'pending' }
}

// Demo: a dish going live attracts a few neighbour orders adding up to a little more than its portions.
function seedOrders(dishId, portions) {
  const target = portions + 2; const out = []; let sum = 0; let mins = 1 + Math.floor(Math.random() * 4)
  while (sum < target) { const q = Math.min(3, 1 + Math.floor(Math.random() * 3), target - sum + 1); out.push(fakeOrder(dishId, q, mins)); sum += q; mins += 1 + Math.floor(Math.random() * 5) }
  return out
}

const setStatus = (s, ids, status) => ({ incoming: s.incoming.map((o) => (ids.includes(o.id) ? { ...o, status, [`${status}At`]: Date.now() } : o)) })

export const useCook = create(persist((set, get) => ({
  dishes: [],
  incoming: [],
  posts: [],     // { id, type: 'image'|'video', mediaKey, text, at }
  stories: [],   // same shape; shown for 24 h

  addDish: (d) => { const id = uid('d'); set((s) => ({ dishes: [...s.dishes, { id, live: null, media: [], ...d }] })); return id },
  updateDish: (id, patch) => set((s) => ({ dishes: s.dishes.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
  deleteDish: (id) => set((s) => ({ dishes: s.dishes.filter((d) => d.id !== id), incoming: s.incoming.filter((o) => o.dishId !== id || o.buyerOrderId) })),

  // live: { now: boolean, portions, closesAt|null, readyAt }
  goLive: (id, live) => set((s) => {
    const wasLive = !!s.dishes.find((d) => d.id === id)?.live
    return {
      dishes: s.dishes.map((d) => (d.id === id ? { ...d, live: { ...live, since: wasLive ? d.live.since : Date.now() } } : d)),
      incoming: wasLive ? s.incoming : [...s.incoming.filter((o) => o.dishId !== id || o.buyerOrderId), ...seedOrders(id, live.portions)],
    }
  }),
  // Simulated orders vanish; real buyer orders still pending are rejected (refunded).
  takeOffline: (id) => set((s) => ({
    dishes: s.dishes.map((d) => (d.id === id ? { ...d, live: null } : d)),
    incoming: s.incoming
      .filter((o) => o.dishId !== id || o.buyerOrderId)
      .map((o) => (o.dishId === id && o.status === 'pending' ? { ...o, status: 'rejected', rejectedAt: Date.now() } : o)),
  })),

  accept: (ids) => set((s) => setStatus(s, ids, 'accepted')),
  reject: (ids) => set((s) => setStatus(s, ids, 'rejected')),
  // Slide-to-confirm: every accepted order for this dish is ready; returns how many buyers were alerted.
  markReady: (dishId) => {
    const ids = get().incoming.filter((o) => o.dishId === dishId && o.status === 'accepted').map((o) => o.id)
    if (ids.length) set((s) => setStatus(s, ids, 'ready'))
    return ids.length
  },
  // From the buyer side.
  addFromBuyer: (orders) => set((s) => ({ incoming: [...orders.map((o) => ({ id: uid('o'), at: Date.now(), status: 'pending', ...o })), ...s.incoming] })),
  markPicked: (buyerOrderId) => set((s) => ({ incoming: s.incoming.map((o) => (o.buyerOrderId === buyerOrderId && o.status === 'ready' ? { ...o, status: 'picked', pickedAt: Date.now() } : o)) })),
  simulateOrder: (dishId) => {
    const live = get().dishes.filter((d) => d.live)
    const dish = live.find((d) => d.id === dishId) ?? pick(live)
    if (!dish) return false
    set((s) => ({ incoming: [fakeOrder(dish.id, 1 + Math.floor(Math.random() * 2)), ...s.incoming] }))
    return true
  },

  addPost: (p) => set((s) => ({ posts: [{ id: uid('p'), at: Date.now(), ...p }, ...s.posts] })),
  editPost: (id, text) => set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, text } : p)) })),
  deletePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
  addStory: (p) => set((s) => ({ stories: [{ id: uid('s'), at: Date.now(), ...p }, ...s.stories] })),
  deleteStory: (id) => set((s) => ({ stories: s.stories.filter((p) => p.id !== id) })),

  clearAll: () => set({ dishes: [], incoming: [], posts: [], stories: [] }),
}), {
  name: 'handi-cook',
  version: 2,
  // v0 dishes had a single `photo`; v1 keeps an ordered media list.
  migrate: (state, version) => {
    if (version < 1 && state?.dishes) {
      state.dishes = state.dishes.map(({ photo, ...d }) => ({ ...d, media: d.media ?? (photo ? [{ id: newMediaId(), type: 'image', url: photo }] : []) }))
    }
    // v2 drops the "cooking" step.
    if (version < 2 && state?.incoming) state.incoming = state.incoming.map((o) => (o.status === 'cooking' ? { ...o, status: 'accepted' } : o))
    return state
  },
}))

export const STORY_TTL_MS = 24 * 60 * 60 * 1000
