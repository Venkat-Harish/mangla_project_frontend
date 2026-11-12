// Thin async data layer. Today it returns mock data; swap these bodies for real
// fetch() calls when the backend exists — pages only talk to these functions.
import { kitchens, posts, reviews, society, stories } from '../data/mock.js'
import { isMyKitchenId, myBuyerKitchenNow } from '../lib/myKitchen.js'

const respond = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 120))

export const api = {
  getSociety: () => respond(society),
  listKitchens: () => respond(kitchens),
  getKitchen: (id) => respond(kitchenById(id)),
  listPosts: (kitchenId) => respond(posts.filter((p) => p.kitchenId === kitchenId).sort((a, b) => b.at - a.at)),
  listReviews: (kitchenId) => respond(reviews.filter((r) => r.kitchenId === kitchenId)),
  // Cook side. Mock: echoes the kitchen back with an id; the real backend will store it.
  registerKitchen: (data) => new Promise((resolve) => setTimeout(() => resolve({ ...data, id: 'my-' + Date.now().toString(36), createdAt: Date.now() }), 700)),
  updateKitchen: (data) => new Promise((resolve) => setTimeout(() => resolve(data), 500)),
  // Stories grouped per kitchen, oldest slide first (the order they play in).
  listStories: () => respond(
    kitchens
      .map((k) => ({ kitchen: k, slides: stories.filter((s) => s.kitchenId === k.id).sort((a, b) => a.at - b.at) }))
      .filter((g) => g.slides.length),
  ),
}

// Synchronous lookup for places that already hold an id (cart, orders).
// Your own kitchen (cook mode) wins over its listed entry, so buyers see your live menu.
export const kitchenById = (id) => (isMyKitchenId(id) ? myBuyerKitchenNow() : null) ?? kitchens.find((k) => k.id === id) ?? null
