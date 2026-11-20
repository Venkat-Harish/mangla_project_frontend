// "Notify me" — dishes a buyer wants to hear about when they go live.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const subKey = (kitchenId, dishId) => `${kitchenId}|${dishId}`

export const useNotify = create(persist((set, get) => ({
  subs: {},       // key -> { kitchenId, dishId, dishName, at }
  dismissed: {},  // key -> the live "since" we already showed an alert for
  isOn: (kitchenId, dishId) => !!get().subs[subKey(kitchenId, dishId)],
  toggle: (kitchenId, dish) => {
    const k = subKey(kitchenId, dish.id)
    const on = !get().subs[k]
    set((s) => {
      const subs = { ...s.subs }
      if (on) subs[k] = { kitchenId, dishId: dish.id, dishName: dish.name, at: Date.now() }; else delete subs[k]
      return { subs }
    })
    return on
  },
  dismiss: (key, since) => set((s) => ({ dismissed: { ...s.dismissed, [key]: since } })),
  clearAll: () => set({ subs: {}, dismissed: {} }),
}), { name: 'handi-notify', version: 1, migrate: () => ({ subs: {}, dismissed: {} }) }))
