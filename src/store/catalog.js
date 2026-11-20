// The society's kitchens and their live / pre-order dishes, from the backend.
// Loaded by the app shell and refreshed every few minutes (which also renews the signed image
// URLs). Not persisted: the server is the source of truth, including which kitchens are pinned.
import { create } from 'zustand'
import { Toast } from 'antd-mobile'
import { api } from '../services/api.js'
import { errorText } from '../services/http.js'
import { isMyKitchenId, myBuyerKitchenNow } from '../lib/myKitchen.js'
import { useAuth } from './index.js'

export const CATALOG_REFRESH_MS = 5 * 60 * 1000

export const useCatalog = create((set, get) => ({
  byId: {},
  order: [],       // kitchen ids: pinned first (in pin order), then the rest
  loaded: false,
  error: null,
  loading: null,   // the load in flight, shared by concurrent callers

  load: () => {
    const user = useAuth.getState().user
    if (!user) return Promise.resolve()
    if (get().loading) return get().loading
    const loading = api.listKitchens(user)
      .then((kitchens) => set({
        byId: Object.fromEntries(kitchens.map((k) => [k.id, k])),
        order: kitchens.map((k) => k.id),
        loaded: true, error: null,
      }))
      .catch((err) => { set({ error: err, loaded: true }); Toast.show({ icon: 'fail', content: errorText(err) }) })
      .finally(() => set({ loading: null }))
    set({ loading })
    return loading
  },

  // Optimistic: flip it here, then let the server's pinned list decide the order.
  togglePin: async (id) => {
    const user = useAuth.getState().user
    const before = get()
    const k = before.byId[id]
    if (!user || !k) return null
    const on = !k.pinned
    set({ byId: { ...before.byId, [id]: { ...k, pinned: on } }, order: reorder(before.order, before.byId, id, on) })
    try {
      const { pinned_kitchen: pinned } = await api.updatePinned(user.id, id, on)
      const s = get()
      const byId = Object.fromEntries(Object.entries(s.byId).map(([kid, x]) => [kid, { ...x, pinned: pinned.includes(kid) }]))
      set({ byId, order: [...pinned.filter((p) => byId[p]), ...s.order.filter((o) => !pinned.includes(o))] })
      return on
    } catch (err) {
      set({ byId: before.byId, order: before.order })
      Toast.show({ icon: 'fail', content: errorText(err) })
      return null
    }
  },

  clear: () => set({ byId: {}, order: [], loaded: false, error: null }),
}))

// Pinning moves a kitchen to the end of the pinned block; unpinning moves it just after it.
function reorder(order, byId, id, on) {
  const rest = order.filter((o) => o !== id)
  const pinnedCount = rest.filter((o) => byId[o]?.pinned).length
  return [...rest.slice(0, pinnedCount), id, ...rest.slice(pinnedCount)]
}

// Synchronous lookup for places that already hold an id (cart, orders, chats).
// Includes your own kitchen (cook mode) so cart/orders/reviews work for it too.
export const kitchenById = (id) =>
  useCatalog.getState().byId[id] ?? (isMyKitchenId(id) ? myBuyerKitchenNow() : null)
