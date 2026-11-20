// The pilot cooks. Signing in with one of these numbers opens that kitchen in Cook mode.
// Fill in `block` / `flat` when known — the UI hides them while they're blank.
// `otherPhones`: extra numbers that sign in to the same kitchen.
// `menu`: the kitchen's dishes ({ name, desc?, price, photo? | photos?: [] } — the first photo is the cover). `price: null` means not set yet —
// the cook sets it in Cook mode before the dish can go live; buyers see "Price soon".
const digitsOf = (phone = '') => phone.replace(/\D/g, '').slice(-10)
// Price-list item: "<category> · <size>", flagged when it's one of the kitchen's most ordered.
const item = (name, category, size, price, mostOrdered = false) =>
  ({ name, desc: `${category} · ${size}${mostOrdered ? ' · Most ordered' : ''}`, price })
const TOP = true

export const cooks = [
  {
    id: 'mks-bakestudio', name: "MK's Bake Studio", owner: 'Mouni K', phone: '+91 79937 53928',
    logo: '/kitchens/mks-bakestudio.png', cuisine: 'Cakes & bakes',
    about: 'Home-baked cakes and bakes, made to order.',
    block: '', flat: '',
    // Sample prices — confirm with Mouni.
    menu: [
      { name: 'Cake Pop', desc: 'Per piece', price: 60, photo: '/kitchens/mks-bakestudio/cake-pop.webp' },
      { name: 'Caramel Brownie', desc: 'Per piece', price: 90, photo: '/kitchens/mks-bakestudio/caramel-brownie.webp' },
      { name: 'Mini Cupcakes', desc: 'Box of 6', price: 240, photo: '/kitchens/mks-bakestudio/mini-cupcakes.webp' },
      { name: 'Cupcakes', desc: 'Box of 4', price: 280, photo: '/kitchens/mks-bakestudio/cupcakes.webp' },
      { name: 'Cakesicle', desc: 'Per piece', price: 80, photo: '/kitchens/mks-bakestudio/cakesicle.webp' },
      { name: 'Choco Chip Cookie (Cookieman style)', desc: 'Per piece', price: 80, photos: ['/kitchens/mks-bakestudio/choco-chip-cookie.webp', '/kitchens/mks-bakestudio/choco-chip-cookie-2.webp'] },
      { name: 'Cookie with Jam', desc: 'Box of 6', price: 150, photo: '/kitchens/mks-bakestudio/jam-cookie.webp' },
      { name: 'Biscoff Cupcake', desc: 'Per piece', price: 90, photo: '/kitchens/mks-bakestudio/biscoff-cupcake.webp' },
    ],
  },
  {
    id: 'yummy-food', name: 'Yummy Food', owner: 'Yaminee Sowri', phone: '+91 96420 96060',
    otherPhones: ['+91 80082 65601'],
    logo: '/kitchens/yummy-food.png', cuisine: 'Batters & homemade',
    about: 'Delight in every bite! Fresh idly, dosa and millet batters, plus homemade rotis and pooris.',
    block: '', flat: '',
    menu: [
      // Sprouted batters
      { name: 'Sprouted Ragi Dosa Batter', desc: '1 kg · Sprouted batter', price: 150 },
      { name: 'Multigrain Dosa Batter', desc: '1 kg · Sprouted batter', price: 160 },
      { name: 'Sprouted Jowar Dosa Batter', desc: '1 kg · Sprouted batter', price: 160 },
      // Regular & millet batters
      { name: 'Idly Batter', desc: '1 kg · Regular batter', price: 90 },
      { name: 'Dosa Batter', desc: '1 kg · Regular batter', price: 90 },
      { name: 'Ragi Idly Batter', desc: '1 kg · Millet batter', price: 130 },
      { name: 'Ragi Dosa Batter', desc: '1 kg · Millet batter', price: 130 },
      { name: 'Jowar Idly Batter', desc: '1 kg · Millet batter', price: 140 },
      { name: 'Jowar Dosa Batter', desc: '1 kg · Millet batter · Most selling!', price: 140 },
      // Special batters — pre-order required
      { name: 'Vada Batter', desc: '1 kg · Pre-order 2 hours in advance', price: 150 },
      { name: 'Pesarattu Batter', desc: '1 kg · Pre-order 7 hours in advance', price: 150 },
      // Ready-to-cook homemade
      { name: 'Roti (10 pieces)', desc: 'Ready to cook · Homemade', price: 100 },
      { name: 'Poori (10 pieces)', desc: 'Ready to cook · Homemade', price: 100 },
    ],
  },
  {
    id: 'smritis-kitchen', name: "Smriti's Kitchen", owner: 'Smriti', phone: '+91 76758 00115',
    logo: '/kitchens/smritis-kitchen.png', cuisine: 'Homely food',
    about: 'Happy, healthy and homely food. FSSAI Reg 23624032001130.',
    block: '', flat: '',
    // Raita and egg curry prices are samples — confirm with Smriti.
    menu: [
      { name: 'Pineapple Raita', price: 80, photo: '/kitchens/smritis-kitchen/pineapple-raita.webp' },
      { name: 'Egg Curry with 3 Rotis', price: 150, photo: '/kitchens/smritis-kitchen/egg-curry.webp' },
      { name: 'Lauki Kofta Curry with Jeera Rice', price: 190, photo: '/kitchens/smritis-kitchen/lauki-kofta.png' },
      { name: 'Tikki Chaat', desc: '250 ml box', price: 140, photo: '/kitchens/smritis-kitchen/tikki-chaat.webp' },
      { name: 'Rajma Chawal', price: 170, photo: '/kitchens/smritis-kitchen/rajma-chawal.webp' },
      { name: 'Onion Curry with 3 Beetroot Parathas', price: 180, photos: ['/kitchens/smritis-kitchen/beetroot-paratha.webp', '/kitchens/smritis-kitchen/onion-curry.webp'] },
    ],
  },
  {
    id: 'aunty-kitchen', name: 'Aunty Kitchen', owner: 'Vijaya Lakshmi C', phone: '+91 94918 71484',
    logo: '/kitchens/aunty-kitchen.png', cuisine: 'Home cooking',
    about: 'Home cooking, the way aunty makes it.',
    block: '', flat: '',
    // Sample prices — confirm with Vijaya Lakshmi.
    menu: [
      { name: 'Boneless Chicken Biryani', price: 280, photo: '/kitchens/aunty-kitchen/boneless-chicken-biryani.webp' },
      { name: 'Boneless Fish Iguru', price: 300, photo: '/kitchens/aunty-kitchen/boneless-fish-iguru.webp' },
      { name: 'Mutton Dum Biryani', price: 380 },
      { name: 'Moringa Chicken Fry', price: 260 },
      { name: 'Chicken Fry', price: 240 },
      { name: 'Chicken Pulav', price: 220 },
    ],
  },
  {
    id: 'yoat-bowl', name: 'Yoat Bowl', owner: 'Pallavi N', phone: '+91 81230 14935',
    logo: '/kitchens/yoat-bowl.png', cuisine: 'Healthy bowls',
    about: 'Eating healthy bowls — oats, protein, yogurt.',
    block: '', flat: '',
    menu: [
      { name: 'High Protein Yogurt Bowl', desc: '44–52 g protein', price: 350 },
      { name: 'Classic Oat Bowl', desc: '23–25 g protein', price: 150 },
      { name: 'Yogurt Bowl', desc: '20–26 g protein', price: 250 },
      { name: 'Protein Sandwich', desc: '20–24 g protein', price: 150 },
      // Extras — the app has no add-ons yet, so they're listed as small items.
      { name: 'Extra: Black Raisins', desc: 'Add to any bowl', price: 10 },
      { name: 'Extra: Peanut Butter', desc: 'Add to any bowl', price: 25 },
      { name: 'Extra: Blueberries', desc: 'Add to any bowl', price: 30 },
      { name: 'Extra: Whey', desc: 'Add to any bowl · +24 g protein', price: 50 },
    ],
  },
  {
    id: 'real-food-co', name: 'The Real Food Co.', owner: 'Sahithi G', phone: '+91 95504 20545',
    logo: '/kitchens/real-food-co.webp', cuisine: 'Millets, oils & pantry',
    about: 'Eating right, living bright. Millet snacks and tiffins, appadams, vadiyams, cold-pressed oils, ghee, pickles and podis.',
    block: '', flat: '',
    menu: [
      // Snacks
      item('Vegetable Chips', 'Snacks', '200 g', 299, TOP),
      item('Coconut Candy', 'Snacks', 'Pack', 199, TOP),
      item('Murukulu / Bundi / Chakralu', 'Snacks', 'Pack', 159, TOP),
      item('Taati Tandra', 'Snacks', '200 g', 149),
      item('Anjeer Tandra Roll', 'Snacks', '100 g', 199, TOP),
      item('Hemp Seeds', 'Snacks', '250 g', 249),
      item('Halim Seeds', 'Snacks', '250 g', 129),
      item('Multi Millet Noodles (with special masala seasoning)', 'Snacks', '250 g', 149, TOP),
      item('Multi Millet Mix Powder (27 varieties)', 'Snacks', '500 g', 229),
      item('Puffed Quinoa', 'Snacks', '250 g', 199, TOP),
      item('18 Sprouts Mix Protein Powder', 'Snacks', '500 g', 199),
      // Tiffins
      item('Rava Dosa / Minapa Dosa / Pesara Dosa / Jowar Dosa', 'Tiffins', 'Pack', 119),
      item('Protein Rich Upma Rawa (Whole Moong + Rice)', 'Tiffins', '500 g', 149),
      item('Multi Millet Vermicelli', 'Tiffins', '500 g', 149, TOP),
      item('Brown Rice Poha', 'Tiffins', '200 g', 89),
      item('Red Rice Poha', 'Tiffins', '200 g', 99),
      item('Multi Millet Poha', 'Tiffins', '250 g', 99, TOP),
      item('Millet Instant Dosa Mix', 'Tiffins', '500 g', 199),
      item('Bold Quinoa (Premium)', 'Tiffins', '1 kg', 279),
      // Appadams
      item('Minapa (Urad Dal) Appadams', 'Appadams', 'Pack', 89),
      item('Pesara (Moong Dal) Appadams', 'Appadams', 'Pack', 89),
      item('Kandi (Toor Dal) Appadams', 'Appadams', 'Pack', 89),
      item('Masala Appadams', 'Appadams', 'Pack', 89),
      // Vadiyams
      item('Minapa Pindi (Urad Dal)', 'Vadiyams', '100 g', 79),
      item('Pesara Pindi (Moong Dal)', 'Vadiyams', '100 g', 79),
      item('Gummidi (Ash Gourd)', 'Vadiyams', '100 g', 79),
      item('Saggubiyyam (Sabudana)', 'Vadiyams', '100 g', 79),
      item('Biyyampindi (Rice Flour)', 'Vadiyams', '200 g', 79, TOP),
      // Cold pressed oils
      item('White Sesame Oil', 'Cold pressed oils', '1 litre', 539, TOP),
      item('Black Sesame Oil', 'Cold pressed oils', '1 litre', 519),
      item('Safflower Oil', 'Cold pressed oils', '1 litre', 569),
      item('White Rice Bran Oil', 'Cold pressed oils', '1 litre', 269),
      item('Groundnut Oil', 'Cold pressed oils', '1 litre', 359, TOP),
      item('Mustard Oil (Sarson ka Tel)', 'Cold pressed oils', '1 litre', 369),
      item('Premium White Jumbo Groundnut Oil', 'Cold pressed oils', '1 litre', 399),
      // Ghee
      item('Buffalo Ghee', 'Ghee', 'Per kg (min 500 g)', 899, TOP),
      item('Desi Cow Ghee (1 kg)', 'Ghee', '1 kg', 1049),
      item('Desi Cow Ghee (500 g)', 'Ghee', '500 g', 540),
      // Pickles
      item('Panasapottu (Shredded Jackfruit) Avakai Pickle (500 g)', 'Pickles', '500 g', 199, TOP),
      item('Panasapottu (Shredded Jackfruit) Avakai Pickle (250 g)', 'Pickles', '250 g', 120, TOP),
      item('Pacchi Mirapakaya (Green Chilli) Pickle (500 g)', 'Pickles', '500 g', 199),
      item('Pacchi Mirapakaya (Green Chilli) Pickle (250 g)', 'Pickles', '250 g', 120),
      item('Usirikaya (Amla) Pickle (500 g)', 'Pickles', '500 g', 199),
      item('Usirikaya (Amla) Pickle (250 g)', 'Pickles', '250 g', 120),
      item('Biryani Aavakaya (500 g)', 'Pickles', '500 g', 299),
      item('Biryani Aavakaya (250 g)', 'Pickles', '250 g', 150),
      // Specials
      item('Organic Un-polished Hand Pound Toor Dal (1 kg)', 'Specials', '1 kg', 329, TOP),
      item('Organic Un-polished Hand Pound Toor Dal (500 g)', 'Specials', '500 g', 169, TOP),
      item('Roasted Whole Cashew (unpeeled)', 'Specials', '500 g', 599, TOP),
      // Podis
      item('Dhaniyalu Podi', 'Podis', '200 g', 119),
      item('Kobbari Karampodi', 'Podis', '200 g', 119),
      item('Idli Karampodi', 'Podis', '200 g', 119, TOP),
      item('Nalla Karampodi', 'Podis', '200 g', 119),
      item('Kandi Karampodi', 'Podis', '200 g', 119),
      item('Chutney Podi', 'Podis', '200 g', 119, TOP),
      item('Palli Karampodi (Peanut)', 'Podis', '200 g', 169),
      item('Avisa Ginjala Podi (Flaxseed)', 'Podis', '200 g', 169),
      item('Munagaaku Podi (Moringa)', 'Podis', '200 g', 169, TOP),
    ],
  },
]

export const cookByPhone = (phone) => cooks.find((c) => [c.phone, ...(c.otherPhones ?? [])].some((p) => digitsOf(p) === digitsOf(phone))) ?? null
export const cookById = (id) => cooks.find((c) => c.id === id) ?? null
export const photosOf = (dish) => dish.photos ?? (dish.photo ? [dish.photo] : [])
