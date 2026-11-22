# src/pages/cook: Cook-mode screens (local only, no backend)

## Purpose
The kitchen owner's side: manage dishes and their live availability, handle incoming orders and custom requests, post photos/videos and 24-hour stories, and see sales metrics. Everything reads and writes local stores (`useCook`, `useRequests`, `useNotify`) and IndexedDB media.

## Files
| File | Role | Key types / entry points |
|---|---|---|
| `Dishes.jsx` | `/cook` (Cook home tab): ready strip, dish list sorted now → pre-order → off, "Load sample dishes" | `Dishes` (default) |
| `Dish.jsx` | `/cook/dish/:id` (`new` = create): availability (go live / pre-order / offline), media grid with drag-reorder, details form, delete | `Dish`, local `Availability`, `SortableTile` |
| `Orders.jsx` | `/cook/orders`: per-dish boxes, custom-request box, accept / accept-all-that-fit / multi-select reject, demo simulators | `CookOrders` (default) |
| `Posts.jsx` | `/cook/posts`: new post / add story (camera or gallery), story strip with expiry, post edit/delete | `Posts` (default) |
| `Metrics.jsx` | `/cook/metrics`: revenue bars by day/week/month, donuts (orders, revenue, portions, Notify-me) via recharts | `Metrics` (default), local `Donut`, `Tick`, `BarTip` |
| `parts.jsx` | Cook building blocks | `CookHeader`, `availability(dish, now)` → `{kind:'off'|'now'|'preorder', label}`, `ReadyStrip`, `Composer`, re-export `MediaView` |

## How it works
- `/cook`, `/cook/posts`, `/cook/orders` and `/cook/metrics` are the Cook swiper sections (`COOK` in App.jsx). `Shell` only allows `/cook*` while `useMyKitchen.mode === 'cook'` and a kitchen exists, so these pages can assume `useMyKitchen.kitchen` is set (`CookHeader` dereferences it).
- **Availability** (`Dish.jsx` → `useCook.goLive`):
  - "Available now" = `{now:true, portions, closesAt:null, readyAt:now}`.
  - "Pre-order" = `{now:false, portions, closesAt, readyAt}`.
  - Validation: a price must be set, portions ≥ already ordered, the close time is in the future, and pickup is no earlier than close.
  - First go-live seeds simulated neighbour orders (store/cook.js) and Toasts the Notify-me count from `notifyCounts`.
- **Incoming orders** (`Orders.jsx`):
  - `acceptOne` checks `dishStats(...).left`.
  - "Accept all that fit" accepts pending orders oldest-first while portions last.
  - Reject is multi-select.
  - Orders from the user's own Eat side (`buyerOrderId`, `buyer.you`) show a "You" tag, and stay listed while active even if the dish went offline.
- **`ReadyStrip`** (on Dishes and Orders): one soft `SlideToConfirm` per live dish with accepted orders, plus one per paid custom request.
  - Pre-order rows stay locked until `closesAt` passes.
  - Sliding calls `useCook.markReady(dishId)` or `useRequests.markReady(id)`. The buyer's demo order then reads READY through `statusIndex`.
- **Media**:
  - Dish images are data URLs (`shrinkImage(f, 900)`); dish videos are IndexedDB keys (`saveMedia`). `media[0]` is the cover. Drag-reorder uses dnd-kit (pointer distance 6, touch delay 220 ms).
  - Posts and stories go through `Composer`: `saveMedia(prepareMedia(file))`, then `addPost`/`addStory`.
  - Stories expire after `STORY_TTL_MS` (24 h) and appear on the buyer Home via `useMyStoryGroup`.
- **Metrics**: `lib/sales.js` builds records (sample history + real orders + paid custom requests). The page only buckets and renders them. Colours are CSS tokens (`--bar`, `--bar-current`, `--series-1..5`, `--series-other`) with dark variants in theme.css.

## Invariants & gotchas
- No backend here. Data lives in this phone's localStorage and IndexedDB, and buyers on other phones never see it. A pilot cook's buyer-visible kitchen is the **backend** one, not this local copy.
- Deleting a dish, post or story must also `deleteMedia(key)` for IndexedDB items, or blobs leak (Dish/Posts already do this).
- `Orders.jsx` `STATUS` still maps the retired `cooking` status. Keep it unless the `handi-cook` migration guarantees no old rows remain.
- Charts and horizontal strips are wrapped in `{...keepTouch}` so touches don't swipe the Cook sections. Do the same for new ones.
- `availability()` is the single source for off/now/preorder labels and the `dish-*` / `avail-*` CSS classes. Reuse it rather than re-deriving.

## How to extend
- **New cook tab**: add the path to `COOK`, the page to the cook children array and a `TabBar.Item` in `App.jsx` (same index everywhere). Start the page with `<CookHeader title=… />`.
- **New dish field**: add it to the form in `Dish.jsx`, `useCook.addDish`/`updateDish` callers, and `buildBuyerKitchen` in lib/myKitchen.js (so buyers see it). If old data needs converting, bump the `handi-cook` version with a migration.
- **Moving Cook mode to the backend**: replace the `useCook` actions with `api` calls (services/api.js) and keep the page code working on the same dish shape.

## Tests
None.
