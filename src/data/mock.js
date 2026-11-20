// All mock content. Replace with backend responses later (see src/services/api.js).
import { cooks, photosOf } from './cooks.js'

// Free-licence food photos from Unsplash, cropped on the fly.
export const photo = (id, w = 640, h = 480) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=70&auto=format`

const P = {
  rajma: '1585937421612-70a008356fbe',
  butterChicken: '1606471191009-63994c53433b',
  paneer: '1588166524941-3bf61a9c41db',
  chaatPlates: '1613292443284-8d10ef9383fe',
  samosa: '1601050690597-df0568f70950',
  pavBhaji: '1606491956689-2ea866880c84',
}

export const society = { id: 'ashvattha-greens', name: 'Ashvattha Greens', blocks: ['A', 'B', 'C', 'D', 'E', 'F'] }

// Who you are when you sign in with a number that isn't one of the cooks.
export const demoUser = {
  id: 'u-rohan',
  name: 'Rohan Mehta',
  initials: 'RM',
  flat: 'D-704',
  block: 'D',
  society: society.name,
  phone: '+91 98765 43210',
  email: 'rohan.mehta@gmail.com',
}

// The pilot kitchens (src/data/cooks.js) in the buyer shape. Menus start empty;
// product photos and dishes come later.
export const kitchens = cooks.map((c) => ({
  id: c.id,
  name: c.name,
  owner: c.owner,
  phone: c.phone,
  block: c.block, flat: c.flat,
  cuisine: c.cuisine,
  about: c.about,
  cover: c.menu?.map(photosOf).find((p) => p.length)?.[0] ?? c.logo,
  thumb: c.logo,
  rating: { avg: 0, count: 0, dist: [0, 0, 0, 0, 0] },
  nextOpen: c.menu?.length ? 'Opens later' : 'Menu coming soon',
  // not cooking right now — buyers see the menu greyed with "Notify me"
  offMenu: (c.menu ?? []).map((d, i) => ({
    id: `${c.id}-off-${i}`, name: d.name, desc: d.desc ?? '', price: d.price ?? null,
    photo: photosOf(d)[0] ?? c.logo, gallery: photosOf(d),
  })),
  items: [],
}))

export const posts = []

// Instagram-style stories: short-lived ads a kitchen puts at the top of Home.
// `video` is optional — when set, the slide plays it instead of the image.
export const stories = []

// Cook mode: starter menu for "Load sample dishes", and neighbours who place simulated orders.
export const sampleDishes = [
  { name: 'Paneer butter masala + 2 rotis', desc: 'Creamy tomato-cashew gravy, soft phulkas.', price: 180, media: [P.paneer, P.butterChicken] },
  { name: 'Rajma chawal', desc: 'Slow-cooked rajma with jeera rice.', price: 140, media: [P.rajma] },
  { name: 'Pav bhaji', desc: 'Butter-loaded bhaji, 2 toasted pavs, onion and lemon.', price: 120, media: [P.pavBhaji, P.chaatPlates] },
  { name: 'Samosa (2) with chutney', desc: 'Crisp, peppery potato filling. Mint and tamarind chutney.', price: 60, media: [P.samosa] },
].map((d, i) => ({ ...d, media: d.media.map((p, j) => ({ id: `sample-${i}-${j}`, type: 'image', url: photo(p, 600, 600) })) }))

export const neighbours = [
  ['Ananya K.', 'B-1102'], ['Vikram S.', 'A-402'], ['Farah M.', 'F-610'], ['Deepa R.', 'C-901'],
  ['Karthik N.', 'E-210'], ['Ishaan P.', 'D-305'], ['Meghna T.', 'B-707'], ['Sravya K.', 'A-1105'],
  ['Rahul J.', 'D-402'], ['Tenzin L.', 'A-604'], ['Aditi B.', 'B-305'], ['Kunal R.', 'D-802'],
]

// Reviews from other residents; reviews you write in the app are merged in on kitchen pages.
export const reviews = []
