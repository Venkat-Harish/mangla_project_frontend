# src/data: pilot kitchens and demo fixtures (static, in-bundle)

## Purpose
The six real pilot kitchens and their menus (`cooks.js`), plus demo-only fixtures (`mock.js`) for things the backend doesn't serve yet.

## Files
| File | Role | Key types / entry points |
|---|---|---|
| `cooks.js` | Pilot kitchens: id, name, owner, phone(s), logo, cuisine, about, block/flat, `menu` | `cooks`, `cookByPhone(phone)`, `cookById(id)`, `photosOf(dish)`; local helper `item()` builds price-list rows |
| `mock.js` | Demo fixtures | `society`, `demoUser`, `kitchens` (pilots in buyer shape, `items: []`), `sampleDishes`, `neighbours`, `photo()` (Unsplash URL); `posts`, `stories`, `reviews` are empty and unused |

## How it works
- Pilot ids: `mks-bakestudio`, `yummy-food`, `smritis-kitchen`, `aunty-kitchen`, `yoat-bowl`, `real-food-co`. Images live in `public/kitchens/<id>.png|webp` and `public/kitchens/<id>/*.webp`.
- Consumers of `cooks.js`:
  - `services/auth.js` `verifyOtp`: a number matching `cookByPhone` (last 10 digits of `phone` or `otherPhones`) signs in as that kitchen's cook.
  - `services/api.js` `mapKitchen` / `mapDish` / `mapOrder`: owner, phone, cuisine, about, logo, flat and dish photos for backend kitchens, matched by **kitchen name** and **dish name**.
  - `lib/myKitchen.js` `seedPilotMenu` and `buildBuyerKitchen`: seeds the cook's local menu and fills the cook's own buyer-facing details.
- Consumers of `mock.js`:
  - `kitchens` → `Login` logo grid, and `store/requests.js` (decides which chats get a simulated cook).
  - `neighbours` → fake buyers in `store/cook.js` and `store/requests.js`.
  - `sampleDishes` → Cook "Load sample dishes".
  - `demoUser` / `society` → `services/auth.js`.

## Invariants & gotchas
- **Names are join keys.** The backend's kitchens were seeded from this file, and `api.js` finds the pilot entry with `cooks.find(c => c.name === k.kitchen_name)`. Renaming a kitchen or dish here, without the same rename on the backend, silently drops its logo, owner and photos.
- `seedPilotMenu` adds each menu dish to Cook mode **once per dish name**, tracked in `useMyKitchen.kitchen.seededDishes`. Consequences:
  - Renaming a dish here adds it again as a new dish.
  - Dishes the cook deleted stay deleted.
  - A `price` added later fills in only dishes the cook hasn't priced.
- `price: null` means not set yet: buyers see "Price soon", and Cook mode refuses to go live until a price is set.
- Blank `block`/`flat` hides the pickup place in the UI (`lib/format.js` `pickupPlace`).
- The phone numbers are real pilot cooks' numbers. Any number not in this file signs in as an Eat-mode user.

## How to extend
- **Add a dish to a pilot menu**: append to that kitchen's `menu` (`{ name, desc?, price, photo? | photos? }`, first photo is the cover) and put the images under `public/kitchens/<id>/`. The next app start (`main.jsx` → `seedPilotMenu`) adds it to that cook's phone. Backend photos fall back to these by dish name.
- **Add a pilot kitchen**: add an entry with a unique `id`, `logo` and phone. The backend needs a kitchen with the identical `name`, which is seeded on the backend side.

## Tests
None.
