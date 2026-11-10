// Your own kitchen, seen from the buyer side. Turns cook-mode data (registration,
// dishes, posts, stories) into the same shape as the mock kitchens, so every buyer
// page (Home, Kitchen, Cart, Orders, Reviews) works with it unchanged.
import { useMemo } from 'react'
import { useAuth, useMyKitchen } from '../store/index.js'
import { STORY_TTL_MS, coverOf, dishStats, useCook } from '../store/cook.js'

export const isMyKitchenId = (id) => !!id && useMyKitchen.getState().kitchen?.id === id

export function buildBuyerKitchen(kitchen, user, dishes, incoming, now = Date.now()) {
  if (!kitchen || !user) return null
  const anyCover = dishes.map(coverOf).find(Boolean)
  const items = dishes.filter((d) => d.live).map((d) => {
    const s = dishStats(d, incoming)
    return {
      id: d.id, name: d.name, desc: d.desc, price: d.price,
      photo: coverOf(d) ?? kitchen.logo,
      gallery: d.media.filter((m) => m.type === 'image').map((m) => m.url),
      media: d.media,
      availableNow: d.live.now,
      readyAt: d.live.now ? now : d.live.readyAt,
      closesAt: d.live.now ? Number.MAX_SAFE_INTEGER : d.live.closesAt,
      // Pending requests don't block buyers — the cook decides what to accept.
      left: Math.max(0, s.left), total: s.portions,
      liveSince: d.live.since,
    }
  })
  return {
    id: kitchen.id, mine: true,
    name: kitchen.name, owner: user.name, phone: kitchen.phone,
    block: user.block, flat: user.flat,
    cuisine: 'Home kitchen',
    about: `Home cooking from ${user.flat}. Call ${kitchen.phone} about pickups.`,
    cover: items[0]?.photo ?? anyCover ?? kitchen.logo,
    thumb: kitchen.logo,
    rating: { avg: 0, count: 0, dist: [0, 0, 0, 0, 0] },
    nextOpen: 'Opens later',
    items,
    // dishes on your menu that aren't live — buyers see them greyed with "Notify me"
    offMenu: dishes.filter((d) => !d.live).map((d) => ({
      id: d.id, name: d.name, desc: d.desc, price: d.price, photo: coverOf(d) ?? kitchen.logo,
      gallery: d.media.filter((m) => m.type === 'image').map((m) => m.url),
    })),
    hasDishes: dishes.length > 0,
  }
}

// Reactive version for pages.
export function useMyBuyerKitchen() {
  const kitchen = useMyKitchen((s) => s.kitchen)
  const user = useAuth((s) => s.user)
  const dishes = useCook((s) => s.dishes)
  const incoming = useCook((s) => s.incoming)
  return useMemo(() => buildBuyerKitchen(kitchen, user, dishes, incoming), [kitchen, user, dishes, incoming])
}

// Snapshot for non-React lookups (kitchenById).
export function myBuyerKitchenNow() {
  const { dishes, incoming } = useCook.getState()
  return buildBuyerKitchen(useMyKitchen.getState().kitchen, useAuth.getState().user, dishes, incoming)
}

// Your posts in the buyer Posts-tab shape.
export function useMyBuyerPosts() {
  const kitchen = useMyKitchen((s) => s.kitchen)
  const posts = useCook((s) => s.posts)
  return useMemo(() => (kitchen ? posts.map((p) => ({ id: p.id, kitchenId: kitchen.id, type: p.type === 'video' ? 'video' : 'photo', mediaKey: p.mediaKey, caption: p.text, at: p.at })) : []), [kitchen, posts])
}

// Your live stories as one group for the Home stories row.
export function useMyStoryGroup(buyerKitchen) {
  const stories = useCook((s) => s.stories)
  return useMemo(() => {
    if (!buyerKitchen) return null
    const live = stories.filter((s) => Date.now() - s.at < STORY_TTL_MS).sort((a, b) => a.at - b.at)
    return live.length ? { kitchen: buyerKitchen, slides: live.map((s) => ({ id: s.id, kitchenId: buyerKitchen.id, mediaKey: s.mediaKey, type: s.type, caption: s.text, at: s.at })) } : null
  }, [stories, buyerKitchen])
}
