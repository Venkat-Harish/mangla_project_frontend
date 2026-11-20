// Data layer. EAT mode talks to the Mangla backend (src/services/http.js); the adapters below turn
// its rows into the shapes the pages already use. Cook mode is still local (registerKitchen /
// updateKitchen are mocks until the cook endpoints exist).
import { post } from './http.js'
import { prepareMedia } from '../lib/media.js'
import { initials } from '../lib/format.js'
import { canReview, isRejectedStatus, orderStage, statusLabel } from '../lib/orderStatus.js'
import { cooks, photosOf } from '../data/cooks.js'

// Shown where the backend has no picture yet (dishes are seeded with images = []).
export const PLACEHOLDER = '/logo.svg'

// The backend's pilot kitchens were seeded from src/data/cooks.js, so names match. Until the backend
// serves them, owner, cuisine, about, logo, pickup flat and dish photos come from that file.
const pilotByName = (name) => cooks.find((c) => c.name === name) ?? null
const pilotDishPhotos = (pilot, dishName) => photosOf(pilot?.menu.find((m) => m.name === dishName) ?? {})
// "No closing time": orders stay open (same sentinel your own kitchen uses for "available now").
export const NEVER = Number.MAX_SAFE_INTEGER

const time = (iso) => (iso ? Date.parse(iso) : null)
const urls = (images) => (images ?? []).map((i) => i.url).filter(Boolean)

// ---- adapters: backend row → app shape ----

export function mapUser(u) {
  return {
    id: u.user_id,
    name: u.user_name,
    initials: initials(u.user_name || '?'),
    phone: u.phone_number,
    block: u.block_number,
    flat: u.flat_number,
    societyId: u.society_id,
    society: 'Your society', // no societies table yet: only the id is known
    kitchenId: u.kitchen_id,
    appInstalled: !!u.app_installed,
  }
}

export function mapDish(d, pilot = null, now = Date.now()) {
  const uploaded = urls(d.images)
  const gallery = uploaded.length ? uploaded : pilotDishPhotos(pilot, d.dish_name)
  const readyAt = time(d.pickup_time)
  const preorder = d.active_order_flag === 2
  return {
    id: d.dish_id,
    name: d.dish_name,
    desc: d.description ?? '',
    price: Number(d.dish_price),
    photo: gallery[0] ?? PLACEHOLDER,
    gallery,
    preorder,
    // live (flag 1) and ready now, or no pickup time given
    availableNow: !preorder && (readyAt === null || readyAt <= now),
    readyAt: readyAt ?? now,
    closesAt: time(d.order_close_time) ?? NEVER,
    left: d.portions_count ?? 99,
    total: d.portions_count ?? null,
  }
}

export function mapKitchen(k, dishes = []) {
  const pilot = pilotByName(k.kitchen_name)
  const items = dishes.map((d) => mapDish(d, pilot))
  const dishCover = items.find((i) => i.gallery.length)?.photo
  return {
    id: k.kitchen_id,
    code: k.kitchen_alphanumeric_id,
    name: k.kitchen_name,
    societyId: k.society_id,
    ownerIds: [k.user_id1, k.user_id2, k.user_id3].filter(Boolean),
    // not served by the backend yet: from src/data/cooks.js for the pilot kitchens
    owner: pilot?.owner ?? null,
    phone: pilot?.phone ?? null,
    block: pilot?.block || null,
    flat: pilot?.flat || null,
    cuisine: pilot?.cuisine ?? '',
    about: pilot?.about ?? '',
    cover: dishCover ?? pilot?.logo ?? PLACEHOLDER,
    thumb: pilot?.logo ?? dishCover ?? PLACEHOLDER,
    pinned: !!k.pinned,
    nextOpen: 'Not cooking right now',
    items,
    offMenu: [],
  }
}

export function mapOrder(o) {
  return {
    id: o.order_id,
    code: o.order_alphanumeric_id,
    source: 'api',
    kitchenId: o.kitchen_id,
    kitchenName: o.kitchen_name ?? null,
    dishId: o.dish_id,
    lines: [{ itemId: o.dish_id, name: o.dish_name ?? 'Dish', qty: o.portion_count, price: null, photo: pilotDishPhotos(pilotByName(o.kitchen_name), o.dish_name)[0] ?? PLACEHOLDER, readyAt: null }],
    total: null,
    placedAt: time(o.order_time),
    rawStatus: o.order_status,
    statusLabel: statusLabel(o.order_status),
    stage: orderStage(o.order_status),
    rejected: isRejectedStatus(o.order_status, o.refund_flag),
    reviewId: o.review_id,
  }
}

export function mapReview(r) {
  return {
    id: r.review_id,
    source: 'api',
    kitchenId: r.kitchen_id,
    dishId: r.dish_id,
    orderId: r.order_id,
    itemName: r.dish_name,
    userName: r.user_name ?? 'Anonymous neighbour',
    anonymous: !!r.anonymous_flag,
    rating: Number(r.rating),
    comment: r.review_text ?? '',
    photos: urls(r.images),
    createdAt: time(r.review_time),
    likes: r.like_count,
    dislikes: r.dislike_count,
  }
}

export { canReview }

// ---- calls ----

export const api = {
  getUser: async (userId) => mapUser(await post('/account/user-info', { user_id: userId })),
  // Metrics only: marks users.app_installed once the app has been installed on this phone.
  setAppInstalled: (userId) => post('/account/update-installed', { user_id: userId, installed: true }),

  // Pinned kitchens first, then the rest of the society; each with its live / pre-order dishes.
  listKitchens: async (user) => {
    const [all, live] = await Promise.all([
      post('/home/kitchen-society-all', { user_id: user.id }),
      user.societyId ? post('/home/kitchen-live', { society_id: user.societyId }) : [],
    ])
    const dishes = new Map(live.map((k) => [k.kitchen_id, k.dishes]))
    const listed = new Set(all.map((k) => k.kitchen_id))
    return [
      ...all.map((k) => mapKitchen(k, dishes.get(k.kitchen_id))),
      ...live.filter((k) => !listed.has(k.kitchen_id)).map((k) => mapKitchen(k, k.dishes)),
    ]
  },
  listPreorderKitchenIds: async (societyId) =>
    (societyId ? await post('/home/kitchen-preorder', { society_id: societyId }) : []).map((k) => k.kitchen_id),
  updatePinned: (userId, kitchenId, pin) => post('/home/update-pinned', { user_id: userId, kitchen_id: kitchenId, pin }),

  listOrders: async (userId) => (await post('/orders/user-all', { user_id: userId })).map(mapOrder),
  getOrder: (orderId) => post('/orders/details', { order_id: orderId }),
  reviewOrder: async ({ orderId, rating, description, images, anonymous }) => mapReview(await post('/orders/review', {
    order_id: orderId, rating, description: description || null, images, anonymous_flag: anonymous,
  })),

  listKitchenReviews: async (kitchenId) => (await post('/review/kitchen', { kitchen_id: kitchenId })).map(mapReview),
  listMyReviews: async (userId) => (await post('/review/user-all', { user_id: userId })).map(mapReview),

  // Review photo: shrink, ask for a signed upload URL in the user's folder, PUT the bytes there.
  // Returns the Storage path (what /orders/review takes) and a local URL to preview it.
  uploadReviewPhoto: async (userId, file) => {
    const blob = await prepareMedia(file)
    const name = blob.type === 'image/jpeg' ? 'photo.jpg' : file.name
    const { uploads } = await post('/media/upload-url', { kind: 'review', user_id: userId, file_names: [name] })
    const res = await fetch(uploads[0].upload_url, {
      method: 'PUT', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob,
    })
    if (!res.ok) throw new Error(`Photo upload failed (${res.status})`)
    return { url: URL.createObjectURL(blob), path: uploads[0].path }
  },

  // Cook side. Mock: echoes the kitchen back with an id; the real backend will store it.
  registerKitchen: (data) => new Promise((resolve) => setTimeout(() => resolve({ ...data, id: 'my-' + Date.now().toString(36), createdAt: Date.now() }), 700)),
  updateKitchen: (data) => new Promise((resolve) => setTimeout(() => resolve(data), 500)),
}
