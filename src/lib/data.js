// Hooks that combine backend data with what this phone keeps locally (demo checkout orders and
// their reviews), so pages get one list in the shapes they already render.
import { useMemo } from 'react'
import { cachedQuery, useQueryState } from '../hooks/index.js'
import { api } from '../services/api.js'
import { useAuth, useMyReviews, useOrders } from '../store/index.js'
import { kitchenById, useCatalog } from '../store/catalog.js'

export const ORDERS_REFRESH_MS = 30000
export const ORDER_REFRESH_MS = 20000

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (id) => UUID.test(String(id ?? ''))

const newestFirst = (a, b) => (b.placedAt ?? b.createdAt ?? 0) - (a.placedAt ?? a.createdAt ?? 0)

export const ordersKey = (userId) => `orders:${userId}`

// The user's backend orders, each line showing the dish photo when the dish is in the catalog.
// (Orders carry no price, so amounts stay unknown.)
export function useApiOrders() {
  const userId = useAuth((s) => s.user?.id)
  const q = useQueryState(userId ? ordersKey(userId) : null, () => api.listOrders(userId), { refreshMs: ORDERS_REFRESH_MS })
  const byId = useCatalog((s) => s.byId)
  const data = useMemo(() => q.data?.map((o) => {
    const dish = byId[o.kitchenId]?.items.find((i) => i.id === o.dishId)
    return dish ? { ...o, lines: o.lines.map((l) => ({ ...l, photo: dish.photo })) } : o
  }), [q.data, byId])
  return { ...q, data }
}

// Backend orders + local demo orders, newest first. `loaded` turns true once the backend answered
// (or failed), so empty states don't flash while loading.
export function useAllOrders() {
  const { data, error, reload } = useApiOrders()
  const local = useOrders((s) => s.orders)
  const orders = useMemo(() => [...(data ?? []), ...local].sort(newestFirst), [data, local])
  return { orders, loaded: data !== undefined || !!error, failed: !!error && data === undefined, error, reload }
}

// Every review of a kitchen: the backend's plus this phone's demo reviews. `reviews` is undefined
// while the first load runs. Your own cook-mode kitchen isn't on the backend yet: local only.
export function useKitchenReviews(kitchenId) {
  const remote = isUuid(kitchenId)
  const q = useQueryState(remote ? `reviews:${kitchenId}` : null, () => api.listKitchenReviews(kitchenId))
  const local = useMyReviews((s) => s.reviews)
  const reviews = useMemo(() => {
    const base = remote ? (q.data ?? (q.error ? [] : undefined)) : []
    return base && [...local.filter((r) => r.kitchenId === kitchenId), ...base].sort(newestFirst)
  }, [q.data, q.error, local, kitchenId, remote])
  return { reviews, failed: remote && !!q.error && q.data === undefined, error: q.error, reload: q.reload }
}

// Every review the user wrote: backend + local demo ones.
export function useAllMyReviews() {
  const userId = useAuth((s) => s.user?.id)
  const q = useQueryState(userId ? `myReviews:${userId}` : null, () => api.listMyReviews(userId))
  const local = useMyReviews((s) => s.reviews)
  const reviews = useMemo(() => {
    const base = q.data ?? (q.error ? [] : undefined)
    return base && [...local, ...base].sort(newestFirst)
  }, [q.data, q.error, local])
  return { reviews, failed: !!q.error && q.data === undefined, error: q.error, reload: q.reload }
}

// A kitchen's name for lists that only hold its id: the catalog first, else an order row.
export function kitchenName(kitchenId) {
  const k = kitchenById(kitchenId)
  if (k) return k.name
  const userId = useAuth.getState().user?.id
  return cachedQuery(ordersKey(userId))?.find((o) => o.kitchenId === kitchenId)?.kitchenName ?? 'Kitchen'
}
