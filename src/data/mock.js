// All mock content. Replace with backend responses later (see src/services/api.js).

// Free-licence food photos from Unsplash, cropped on the fly.
export const photo = (id, w = 640, h = 480) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=70&auto=format`

const P = {
  bananaLeafMeal: '1625398407796-82650a8c135f',
  idliVada: '1630383249896-424e482df921',
  idli: '1589301760014-d929f3979dbc',
  rajma: '1585937421612-70a008356fbe',
  bread: '1509440159596-0249088772ff',
  cookies: '1499636136210-6f4ee915583e',
  pancakes: '1567620905732-2d1ec7ab7445',
  andhraCurry: '1596797038530-2c107229654b',
  butterChicken: '1606471191009-63994c53433b',
  fishCurry: '1574484284002-952d92456975',
  kebabs: '1599487488170-d11ec9c172f0',
  paneer: '1588166524941-3bf61a9c41db',
  biryani: '1563379091339-03b21ab4a4f8',
  chickenBiryani: '1631515243349-e0cb75fb8d3a',
  tomatoRice: '1645177628172-a94c1f96e6db',
  momos: '1534422298391-e4f8c172dddb',
  dumplings: '1496116218417-1a781b1c416c',
  chaatPlates: '1613292443284-8d10ef9383fe',
  samosa: '1601050690597-df0568f70950',
  pavBhaji: '1606491956689-2ea866880c84',
  dahiPuri: '1610192244261-3f33de3f55e4',
}

const now = Date.now()
const MIN = 60000
// Round to the next 5 minutes so times read naturally ("7:30 PM", not "7:33 PM").
const at = (mins) => Math.ceil((now + mins * MIN) / (5 * MIN)) * 5 * MIN
const ago = (mins) => now - mins * MIN

export const society = { id: 'ashvattha-greens', name: 'Ashvattha Greens', blocks: ['A', 'B', 'C', 'D', 'E', 'F'] }

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

export const kitchens = [
  {
    id: 'meeras-tiffin',
    name: "Meera's Tiffin Corner",
    owner: 'Meera Iyer',
    block: 'C', flat: 'C-304',
    cuisine: 'South Indian tiffin',
    about: 'Weekday tiffins the way my amma packed them. Steel boxes, no plastic.',
    cover: photo(P.bananaLeafMeal, 900, 600),
    thumb: photo(P.bananaLeafMeal, 400, 300),
    rating: { avg: 4.8, count: 126, dist: [98, 20, 5, 2, 1] },
    nextOpen: null,
    // not cooking right now — buyers can tap “Notify me”
    offMenu: [
      { name: 'Mini meals on banana leaf', desc: 'Rice, sambar, rasam, poriyal, kootu, curd and payasam.', price: 180, photo: photo(P.bananaLeafMeal, 400, 400), ratings: [22, 5, 1, 0, 0] },
      { name: 'Lemon rice & curd rice combo', desc: 'Tangy lemon rice with a cool curd rice. Good for lunch boxes.', price: 110, photo: photo(P.tomatoRice, 400, 400), ratings: [8, 4, 2, 1, 0] },
    ],
    items: [
      { id: 'm1', ratings: [52, 10, 2, 1, 0], name: 'Rajma chawal combo', desc: 'Slow-cooked Kashmiri rajma, jeera rice, onion-lemon salad. Serves 1.', price: 140, photo: photo(P.rajma, 400, 400), readyAt: at(85), closesAt: at(50), left: 6, total: 12 },
      { id: 'm2', ratings: [34, 7, 2, 1, 1], name: 'Idli, vada & sambar', desc: '4 soft idlis, 1 medu vada, sambar and two chutneys.', price: 110, photo: photo(P.idliVada, 400, 400), readyAt: at(70), closesAt: at(20), left: 3, total: 15 },
      { id: 'm3', ratings: [10, 2, 1, 0, 0], name: 'Rava idli box (6)', desc: 'With coconut chutney and gunpowder. Good for kids’ tiffin.', price: 120, photo: photo(P.idli, 400, 400), readyAt: at(24 * 60 - 120), closesAt: at(240), left: 10, total: 10 },
    ],
  },
  {
    id: 'bake-theory',
    name: 'Bake Theory by Ritu',
    owner: 'Ritu Saxena',
    block: 'A', flat: 'A-1201',
    cuisine: 'Breads & bakes',
    about: 'Sourdough on weekends, cookies whenever the oven is warm.',
    cover: photo(P.bread, 900, 600),
    thumb: photo(P.bread, 400, 300),
    rating: { avg: 4.9, count: 88, dist: [80, 6, 2, 0, 0] },
    nextOpen: null,
    // not cooking right now — buyers can tap “Notify me”
    offMenu: [
      { name: 'Banana pancake breakfast box', desc: 'Stack of 4 with maple and berries.', price: 260, photo: photo(P.pancakes, 400, 400), ratings: [12, 2, 0, 0, 0] },
    ],
    items: [
      { id: 'b1', ratings: [40, 4, 1, 0, 0], name: 'Country sourdough loaf', desc: '48-hour ferment, 750 g. Sliced on request.', price: 320, photo: photo(P.bread, 400, 400), readyAt: at(150), closesAt: at(95), left: 4, total: 8 },
      { id: 'b2', ratings: [30, 2, 1, 0, 0], name: 'Brown-butter choc chip cookies (6)', desc: 'Crisp edges, gooey middle, flaky salt.', price: 240, photo: photo(P.cookies, 400, 400), readyAt: at(60), closesAt: at(35), left: 9, total: 20 },
    ],
  },
  {
    id: 'andhra-spice',
    name: 'Andhra Spice Box',
    owner: 'Lakshmi Reddy',
    block: 'E', flat: 'E-502',
    cuisine: 'Andhra home meals',
    about: 'Proper Guntur heat. Ask for “less spicy” in the note if you need it.',
    cover: photo(P.andhraCurry, 900, 600),
    thumb: photo(P.andhraCurry, 400, 300),
    rating: { avg: 4.6, count: 64, dist: [44, 14, 4, 1, 1] },
    nextOpen: null,
    // not cooking right now — buyers can tap “Notify me”
    offMenu: [
      { name: 'Andhra veg thali', desc: 'Pappu, two curries, rasam, rice, pickle and papad.', price: 200, photo: photo(P.tomatoRice, 400, 400), ratings: [5, 3, 1, 0, 0] },
    ],
    items: [
      { id: 'a1', ratings: [20, 6, 2, 0, 1], name: 'Gongura chicken + rice', desc: 'Sorrel-leaf chicken curry, steamed rice, papad.', price: 220, photo: photo(P.butterChicken, 400, 400), readyAt: at(95), closesAt: at(55), left: 5, total: 10 },
      { id: 'a2', ratings: [10, 4, 1, 1, 0], name: 'Chepala pulusu (fish curry)', desc: 'Tamarind fish curry, Andhra style. Rice included.', price: 260, photo: photo(P.fishCurry, 400, 400), readyAt: at(100), closesAt: at(25), left: 2, total: 6 },
      { id: 'a3', ratings: [6, 2, 1, 0, 0], name: 'Paneer curry meal', desc: 'For the vegetarians — paneer in tomato-cashew gravy with rice.', price: 180, photo: photo(P.paneer, 400, 400), readyAt: at(95), closesAt: at(55), left: 7, total: 8 },
      { id: 'a4', ratings: [9, 2, 0, 0, 0], name: 'Chicken kebabs (8)', desc: 'Charcoal grilled, mint chutney.', price: 240, photo: photo(P.kebabs, 400, 400), readyAt: at(40), closesAt: at(-15), left: 0, total: 12 },
    ],
  },
  {
    id: 'biryani-club',
    name: 'Sunday Biryani Club',
    owner: 'Imran & Sana Qureshi',
    block: 'B', flat: 'B-904',
    cuisine: 'Dum biryani',
    about: 'One big handi every Sunday. Pre-orders open Saturday night.',
    cover: photo(P.biryani, 900, 600),
    thumb: photo(P.biryani, 400, 300),
    rating: { avg: 4.7, count: 210, dist: [160, 35, 10, 3, 2] },
    nextOpen: 'Opens Sunday',
    // not cooking right now — buyers can tap “Notify me”
    offMenu: [
      { name: 'Hyderabadi dum biryani', desc: 'Mutton, slow-cooked on dum. Raita and salan included.', price: 380, photo: photo(P.biryani, 400, 400), ratings: [120, 22, 6, 2, 1] },
      { name: 'Veg dum biryani', desc: 'Seasonal vegetables and paneer, same handi, same love.', price: 280, photo: photo(P.chickenBiryani, 400, 400), ratings: [40, 12, 4, 1, 1] },
      { name: 'Mirchi ka salan (extra)', desc: 'Peanut-sesame chilli curry, 250 ml.', price: 90, photo: photo(P.andhraCurry, 400, 400), ratings: [12, 3, 1, 0, 0] },
    ],
    items: [],
  },
  {
    id: 'momo-house',
    name: 'Little Momo House',
    owner: 'Pema Bhutia',
    block: 'F', flat: 'F-208',
    cuisine: 'Momos & thukpa',
    about: 'Darjeeling recipes from my grandmother. Fiery tomato achar on the side.',
    cover: photo(P.momos, 900, 600),
    thumb: photo(P.momos, 400, 300),
    rating: { avg: 4.5, count: 41, dist: [26, 10, 3, 1, 1] },
    nextOpen: null,
    // not cooking right now — buyers can tap “Notify me”
    offMenu: [
      { name: 'Chicken thukpa', desc: 'Noodle soup with greens. Friday nights only.', price: 140, photo: photo(P.andhraCurry, 400, 400), ratings: [4, 2, 1, 0, 0] },
    ],
    items: [
      { id: 'mo1', ratings: [18, 6, 2, 1, 1], name: 'Chicken steamed momos (8)', desc: 'Juicy, hand-pleated, with tomato-sesame achar.', price: 160, photo: photo(P.momos, 400, 400), readyAt: at(55), closesAt: at(28), left: 11, total: 24 },
      { id: 'mo2', ratings: [6, 3, 1, 0, 0], name: 'Veg dumplings in chilli oil', desc: 'Cabbage-carrot filling, Sichuan chilli oil.', price: 150, photo: photo(P.dumplings, 400, 400), readyAt: at(55), closesAt: at(40), left: 8, total: 16 },
    ],
  },
  {
    id: 'neha-chaat',
    name: "Neha's Chaat Corner",
    owner: 'Neha Agarwal',
    block: 'D', flat: 'D-1103',
    cuisine: 'Street snacks',
    about: 'Evening chaat, Saturdays only. Bring your own bowl and get ₹10 off.',
    cover: photo(P.chaatPlates, 900, 600),
    thumb: photo(P.chaatPlates, 400, 300),
    rating: { avg: 4.7, count: 57, dist: [44, 9, 2, 1, 1] },
    nextOpen: 'Opens Saturday',
    // not cooking right now — buyers can tap “Notify me”
    offMenu: [
      { name: 'Pav bhaji', desc: 'Butter-loaded bhaji, 2 toasted pavs.', price: 120, photo: photo(P.pavBhaji, 400, 400), ratings: [22, 4, 1, 1, 0] },
      { name: 'Samosa chaat', desc: 'Crushed samosa, chole, chutneys, sev.', price: 80, photo: photo(P.samosa, 400, 400), ratings: [14, 3, 1, 0, 1] },
      { name: 'Dahi puri (6)', desc: 'Crisp puris, sweet curd, tamarind.', price: 90, photo: photo(P.dahiPuri, 400, 400), ratings: [8, 2, 0, 0, 0] },
    ],
    items: [],
  },
]

// Off-menu dishes get stable ids: <kitchen>-off-<n>
kitchens.forEach((k) => { k.offMenu = (k.offMenu ?? []).map((d, i) => ({ id: `${k.id}-off-${i}`, ...d })) })

export const posts = [
  { id: 'p1', kitchenId: 'meeras-tiffin', type: 'video', poster: photo(P.rajma, 900, 1200), duration: '0:42', caption: "Tadka going into tonight's rajma. 6 portions left — orders close soon.", at: ago(12) },
  { id: 'p2', kitchenId: 'meeras-tiffin', type: 'headsup', title: 'Tomorrow: Mini meals on banana leaf', caption: 'Rice, sambar, rasam, poriyal, kootu, curd and payasam. Pre-orders open at 8 PM tonight. Only 12 leaves.', at: ago(60) },
  { id: 'p3', kitchenId: 'meeras-tiffin', type: 'photo', image: photo(P.idliVada, 900, 700), caption: 'This morning’s idli batch — the batter was perfect today.', at: ago(60 * 9) },
  { id: 'p4', kitchenId: 'bake-theory', type: 'video', poster: photo(P.bread, 900, 1200), duration: '0:28', caption: 'Scoring the loaves before they go in. 4 left for tonight.', at: ago(30) },
  { id: 'p5', kitchenId: 'bake-theory', type: 'headsup', title: 'Sunday: Banana pancake breakfast box', caption: 'Stack of 4 with maple and berries, ready at 9 AM. Order by Saturday 9 PM.', at: ago(60 * 3) },
  { id: 'p6', kitchenId: 'bake-theory', type: 'photo', image: photo(P.cookies, 900, 700), caption: 'Brown butter is the whole secret.', at: ago(60 * 26) },
  { id: 'p7', kitchenId: 'andhra-spice', type: 'video', poster: photo(P.andhraCurry, 900, 1200), duration: '0:51', caption: 'Gongura going in. The whole floor will smell this in 10 minutes.', at: ago(20) },
  { id: 'p8', kitchenId: 'andhra-spice', type: 'photo', image: photo(P.kebabs, 900, 700), caption: 'Kebabs are sold out for today — thank you E-block!', at: ago(45) },
  { id: 'p9', kitchenId: 'biryani-club', type: 'headsup', title: 'This Sunday: Hyderabadi dum biryani', caption: 'Mutton and veg. Pre-orders open Saturday 8 PM — only 20 handis.', at: ago(60 * 5) },
  { id: 'p10', kitchenId: 'biryani-club', type: 'video', poster: photo(P.chickenBiryani, 900, 1200), duration: '1:05', caption: 'Opening the dum last Sunday. Worth the wait.', at: ago(60 * 24 * 6) },
  { id: 'p11', kitchenId: 'biryani-club', type: 'photo', image: photo(P.tomatoRice, 900, 700), caption: 'Our tomato pulao for the kids’ table.', at: ago(60 * 24 * 6) },
  { id: 'p12', kitchenId: 'momo-house', type: 'video', poster: photo(P.momos, 900, 1200), duration: '0:35', caption: 'Pleating the second batch. Steamer goes on at 7.', at: ago(15) },
  { id: 'p13', kitchenId: 'momo-house', type: 'headsup', title: 'Friday: Thukpa night', caption: 'Chicken and veg thukpa, limited to 15 bowls.', at: ago(60 * 7) },
  { id: 'p14', kitchenId: 'neha-chaat', type: 'headsup', title: 'Saturday 5 PM: Chaat counter', caption: 'Pav bhaji, samosa chaat, dahi puri. Pre-order to skip the queue.', at: ago(60 * 2) },
  { id: 'p15', kitchenId: 'neha-chaat', type: 'photo', image: photo(P.pavBhaji, 900, 700), caption: 'Last week’s pav bhaji — butter was not optional.', at: ago(60 * 24 * 5) },
  { id: 'p16', kitchenId: 'neha-chaat', type: 'photo', image: photo(P.samosa, 900, 700), caption: 'Samosas, fresh out of the kadhai.', at: ago(60 * 24 * 5 + 30) },
]

// Instagram-style stories: short-lived ads a kitchen puts at the top of Home.
// `video` is optional — when set, the slide plays it instead of the image.
export const stories = [
  { id: 's1', kitchenId: 'meeras-tiffin', image: photo(P.rajma, 720, 1280), caption: 'Rajma tonight — only 6 portions left!', at: ago(25) },
  { id: 's2', kitchenId: 'meeras-tiffin', image: photo(P.bananaLeafMeal, 720, 1280), caption: 'Tomorrow: mini meals on banana leaf. Pre-orders open 8 PM.', at: ago(70) },
  { id: 's3', kitchenId: 'andhra-spice', image: photo(P.andhraCurry, 720, 1280), caption: 'Gongura going in now. Guntur heat, as promised 🌶', at: ago(18) },
  { id: 's4', kitchenId: 'andhra-spice', image: photo(P.fishCurry, 720, 1280), caption: 'Fish pulusu — 2 left, closes soon.', at: ago(40) },
  { id: 's5', kitchenId: 'bake-theory', image: photo(P.bread, 720, 1280), caption: 'Loaves just out. 4 sourdough left for tonight.', at: ago(35) },
  { id: 's6', kitchenId: 'bake-theory', image: photo(P.cookies, 720, 1280), caption: 'Cookie tray #2 coming at 8.', at: ago(90) },
  { id: 's7', kitchenId: 'bake-theory', image: photo(P.pancakes, 720, 1280), caption: 'Sunday: pancake breakfast boxes. Order by Saturday 9 PM.', at: ago(180) },
  { id: 's8', kitchenId: 'biryani-club', image: photo(P.chickenBiryani, 720, 1280), caption: 'Sunday dum biryani — pre-orders open Saturday 8 PM. 20 handis only.', at: ago(300) },
  { id: 's9', kitchenId: 'momo-house', image: photo(P.momos, 720, 1280), caption: 'Second steamer batch at 7. Achar is extra spicy today.', at: ago(50) },
]

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

const r = (id, kitchenId, item, name, flat, rating, comment, daysAgo, photos = []) => ({
  id, kitchenId, itemName: item, userName: name, flat, rating, comment, photos: photos.map((p) => photo(p, 600, 600)), createdAt: ago(daysAgo * 24 * 60 + (id.length * 37) % 600),
})

export const reviews = [
  r('r1', 'meeras-tiffin', 'Rajma chawal combo', 'Ananya K.', 'B-1102', 5, "Rajma was creamy without being heavy, rice perfectly separate. Tastes like my nani's on a Sunday. Packed in steel — nice touch.", 1, [P.rajma]),
  r('r2', 'meeras-tiffin', 'Idli, vada & sambar', 'Vikram S.', 'A-402', 5, 'Softest idlis in the society, no contest. Sambar had real drumstick pieces.', 2, [P.idliVada, P.idli]),
  r('r3', 'meeras-tiffin', 'Rajma chawal combo', 'Farah M.', 'F-610', 4, 'Lovely, but a little salty for my kids. Will add a note next time.', 4),
  r('r4', 'meeras-tiffin', 'Rava idli box (6)', 'Deepa R.', 'C-901', 5, 'Ordered for school tiffin — came back empty. Gunpowder is excellent.', 6),
  r('r5', 'meeras-tiffin', 'Idli, vada & sambar', 'Karthik N.', 'E-210', 4, 'Vada was crisp even after the walk home. Chutney could be thicker.', 9, [P.idliVada]),
  r('r6', 'bake-theory', 'Country sourdough loaf', 'Ishaan P.', 'D-305', 5, 'Better than the bakery on the main road. Great crust, open crumb.', 1, [P.bread]),
  r('r7', 'bake-theory', 'Brown-butter choc chip cookies (6)', 'Meghna T.', 'B-707', 5, 'Dangerous. We finished the box standing at the door.', 3, [P.cookies]),
  r('r8', 'bake-theory', 'Country sourdough loaf', 'Arjun D.', 'C-1004', 4, 'Very good loaf — slightly dense this week.', 8),
  r('r9', 'andhra-spice', 'Gongura chicken + rice', 'Sravya K.', 'A-1105', 5, 'Exactly like home in Vijayawada. Brought tears (the spice, also the nostalgia).', 2, [P.butterChicken]),
  r('r10', 'andhra-spice', 'Chepala pulusu (fish curry)', 'Rahul J.', 'D-402', 4, 'Tangy and fresh. Asked for less spicy and she actually listened.', 5),
  r('r11', 'andhra-spice', 'Chicken kebabs (8)', 'Nikhil V.', 'F-901', 5, 'Smoky, tender, gone in five minutes.', 7, [P.kebabs]),
  r('r12', 'biryani-club', 'Hyderabadi dum biryani', 'Sameer A.', 'E-1201', 5, 'The dum opening is a society event now. Mutton falls off the bone.', 7, [P.chickenBiryani]),
  r('r13', 'biryani-club', 'Hyderabadi dum biryani', 'Priya G.', 'C-208', 5, 'Veg biryani that does not feel like a compromise.', 14, [P.biryani]),
  r('r14', 'momo-house', 'Chicken steamed momos (8)', 'Tenzin L.', 'A-604', 5, 'Proper Darjeeling momos. The achar is the star.', 2, [P.momos]),
  r('r15', 'momo-house', 'Veg dumplings in chilli oil', 'Aditi B.', 'B-305', 4, 'Chilli oil is fantastic, filling could use more seasoning.', 4, [P.dumplings]),
  r('r16', 'neha-chaat', 'Pav bhaji', 'Kunal R.', 'D-802', 5, 'Saturday plans are now built around this pav bhaji.', 5, [P.pavBhaji]),
  r('r17', 'neha-chaat', 'Samosa chaat', 'Ritika S.', 'E-306', 5, 'Crunchy, tangy, perfect. Brought my own bowl for the discount.', 5, [P.dahiPuri]),
]
