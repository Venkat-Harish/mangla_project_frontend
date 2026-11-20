// Ratings model.
// Each dish has its own rating = average of that dish's ratings (baseline from mock data
// + reviews written in the app). A kitchen's rating is the average of ALL its dishes'
// ratings weighted by how many ratings each dish has — every single rating counts once.
//   kitchen avg = Σ(dish avg × dish count) ÷ Σ(dish count)

const EMPTY = [0, 0, 0, 0, 0]   // counts of [5★, 4★, 3★, 2★, 1★]

export function summarize(dist) {
  const count = dist.reduce((a, b) => a + b, 0)
  const avg = count ? dist.reduce((s, n, i) => s + n * (5 - i), 0) / count : 0
  return { dist, count, avg: Math.round(avg * 10) / 10 }
}

const allDishes = (kitchen) => [...(kitchen?.items ?? []), ...(kitchen?.offMenu ?? [])]

function dishDist(kitchen, dishName, myReviews) {
  const base = allDishes(kitchen).find((d) => d.name === dishName)?.ratings ?? EMPTY
  const dist = [...base]
  myReviews.filter((r) => r.kitchenId === kitchen.id && r.itemName === dishName).forEach((r) => {
    // Half stars (e.g. 4.5) split evenly between the two neighbouring buckets so the average stays exact.
    const lo = Math.floor(r.rating), hi = Math.ceil(r.rating)
    if (lo === hi) dist[5 - lo] += 1
    else { dist[5 - hi] += 0.5; dist[5 - lo] += 0.5 }
  })
  return dist
}

export const dishRating = (kitchen, dishName, myReviews = []) => summarize(dishDist(kitchen, dishName, myReviews))

export function kitchenRating(kitchen, myReviews = []) {
  if (!kitchen) return summarize(EMPTY)
  const names = new Set([...allDishes(kitchen).map((d) => d.name), ...myReviews.filter((r) => r.kitchenId === kitchen.id).map((r) => r.itemName)])
  const dist = [...EMPTY]
  names.forEach((n) => dishDist(kitchen, n, myReviews).forEach((c, i) => { dist[i] += c }))
  return summarize(dist)
}

// Rating from a list of reviews (backend reviews plus this phone's demo reviews). Every rating
// counts once, so a kitchen's number from all its reviews is the same weighted average as above.
// Pass a dish name to rate just that dish.
export function summarizeReviews(reviews = [], dishName = null) {
  const dist = [...EMPTY]
  reviews.filter((r) => !dishName || r.itemName === dishName).forEach((r) => {
    // 0.5★ has no bucket of its own; it counts as 1★.
    const lo = Math.max(1, Math.floor(r.rating)), hi = Math.max(1, Math.ceil(r.rating))
    if (!(hi <= 5)) return
    if (lo === hi) dist[5 - lo] += 1
    else { dist[5 - hi] += 0.5; dist[5 - lo] += 0.5 }
  })
  return summarize(dist)
}

// Per-dish breakdown, e.g. to show how the kitchen number is built.
export const dishRatings = (kitchen, myReviews = []) => allDishes(kitchen).map((d) => ({ name: d.name, ...dishRating(kitchen, d.name, myReviews) }))
