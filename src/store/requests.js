// Custom order requests: a chat thread between a buyer and a kitchen.
// open → quoted → paid → ready → picked   (or declined)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { kitchens, neighbours } from '../data/mock.js'

const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const msg = (from, text, extra = {}) => ({ id: uid('m'), from, type: 'text', text, at: Date.now(), ...extra })
const isMock = (kitchenId) => kitchens.some((k) => k.id === kitchenId)

export const REQUEST_TAG = {
  open: ['Waiting for quote', 'default'],
  quoted: ['Quote', 'primary'],
  paid: ['Paid · being made', 'success'],
  ready: ['Ready for pickup', 'success'],
  picked: ['Picked up', 'default'],
  declined: ['Declined', 'danger'],
}
export const requestTag = (r) => (r.status === 'quoted' ? [`Quote ₹${r.quote.price}`, 'primary'] : REQUEST_TAG[r.status])

const SAMPLE_ASKS = [
  ['Can you make 6 phulkas and a mild dal for my parents? Less salt please.', 3],
  ['Birthday at home on Sunday — could you do a small eggless chocolate cake?', 1],
  ['Need lunch boxes for 4 kids tomorrow: something simple, not spicy.', 4],
]

const update = (set, id, fn) => set((s) => ({ requests: s.requests.map((r) => (r.id === id ? fn(r) : r)) }))

export const useRequests = create(persist((set, get) => ({
  requests: [],

  create: ({ kitchenId, buyer, text, portions }) => {
    const id = uid('r')
    const r = { id, kitchenId, buyer, text, portions, status: 'open', quote: null, orderId: null, createdAt: Date.now(),
      sim: isMock(kitchenId) ? { replyAt: Date.now() + 1800, quoteAt: Date.now() + 5000 } : null,
      messages: [msg('buyer', text, { type: 'request', portions })] }
    set((s) => ({ requests: [r, ...s.requests] }))
    return id
  },
  send: (id, from, text) => update(set, id, (r) => ({
    ...r, messages: [...r.messages, msg(from, text)],
    // simulated mock-kitchen cook acknowledges buyer messages
    sim: r.sim && from === 'buyer' ? { ...r.sim, ackAt: Date.now() + 1500 } : r.sim,
  })),
  quote: (id, { price, readyAt, note }) => update(set, id, (r) => ({
    ...r, status: 'quoted', quote: { price, readyAt, note }, quotedAt: Date.now(),
    messages: [...r.messages, msg('cook', note || '', { type: 'quote', price, readyAt })],
  })),
  decline: (id, reason = 'Sorry, I can’t take this one.') => update(set, id, (r) => ({
    ...r, status: 'declined', messages: [...r.messages, msg('cook', reason), msg('system', 'Request declined')],
  })),
  pay: (id, orderId) => update(set, id, (r) => ({
    ...r, status: 'paid', orderId, paidAt: Date.now(),
    sim: r.sim ? { ...r.sim, readyAt: Date.now() + 20000 } : r.sim,
    messages: [...r.messages, msg('system', `Paid ₹${r.quote.price}${orderId ? ` · order #${orderId}` : ''}`)],
  })),
  markReady: (id) => update(set, id, (r) => ({
    ...r, status: 'ready', readyAt: Date.now(), messages: [...r.messages, msg('system', 'Marked ready for pickup')],
  })),
  markPicked: (id) => update(set, id, (r) => (r.status === 'ready' ? { ...r, status: 'picked', pickedAt: Date.now(), messages: [...r.messages, msg('system', 'Picked up')] } : r)),

  // Demo: a neighbour sends your kitchen a custom request.
  simulateIncoming: (kitchenId) => {
    const [name, flat] = pick(neighbours); const [text, portions] = pick(SAMPLE_ASKS)
    const id = uid('r')
    const r = { id, kitchenId, buyer: { name, flat }, text, portions, status: 'open', quote: null, orderId: null, createdAt: Date.now(), sim: null, neighbourSim: true, messages: [msg('buyer', text, { type: 'request', portions })] }
    set((s) => ({ requests: [r, ...s.requests] }))
    return id
  },

  // Advances the simulated side of conversations (called every second from App).
  tick: () => {
    const now = Date.now(); let changed = false
    const next = get().requests.map((r) => {
      let x = r
      const add = (m) => { x = { ...x, messages: [...x.messages, m] }; changed = true }
      if (r.sim) { // a mock kitchen's cook
        const k = kitchens.find((k2) => k2.id === r.kitchenId)
        if (x.sim.replyAt && now >= x.sim.replyAt) { add(msg('cook', `Sure! Let me check what I can do 🙂`)); x = { ...x, sim: { ...x.sim, replyAt: null } } }
        if (x.sim.quoteAt && now >= x.sim.quoteAt && x.status === 'open') {
          const avg = k?.items.length ? k.items.reduce((s, i) => s + i.price, 0) / k.items.length : 150
          const price = Math.round((avg * x.portions) / 10) * 10
          const readyAt = Math.ceil((now + 3 * 3600000) / 1800000) * 1800000
          x = { ...x, status: 'quoted', quote: { price, readyAt, note: 'Fresh, made just for you.' }, quotedAt: now, sim: { ...x.sim, quoteAt: null } }
          add(msg('cook', 'Fresh, made just for you.', { type: 'quote', price, readyAt }))
        }
        if (x.sim.ackAt && now >= x.sim.ackAt) { add(msg('cook', 'Noted 👍')); x = { ...x, sim: { ...x.sim, ackAt: null } } }
        if (x.sim.readyAt && now >= x.sim.readyAt && x.status === 'paid') {
          x = { ...x, status: 'ready', readyAt: now, sim: { ...x.sim, readyAt: null } }
          add(msg('cook', 'It’s ready! 🎉 Come by whenever you like.')); add(msg('system', 'Marked ready for pickup'))
        }
      }
      if (r.neighbourSim) { // a neighbour ordering from your kitchen
        if (x.status === 'quoted' && now >= (x.quotedAt ?? now) + 4000) {
          x = { ...x, status: 'paid', paidAt: now }
          add(msg('buyer', 'Perfect, paying now 🙏')); add(msg('system', `Paid ₹${x.quote.price}`))
        }
        if (x.status === 'ready' && now >= (x.readyAt ?? now) + 15000) {
          x = { ...x, status: 'picked', pickedAt: now }
          add(msg('buyer', 'Picked up — thank you!')); add(msg('system', 'Picked up'))
        }
      }
      return x
    })
    if (changed) set({ requests: next })
  },

  clearAll: () => set({ requests: [] }),
}), { name: 'handi-requests' }))
