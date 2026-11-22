# src/lib: pure helpers and composite data hooks

## Purpose
Logic shared by pages: hooks that merge backend and local data, formatting, IndexedDB media, the "own kitchen seen as a buyer" adapter, order-status mapping, ratings and Cook metrics maths.

## Files
| File | Role | Key types / entry points |
|---|---|---|
| `data.js` | Hooks merging backend reads with this phone's demo data | `useApiOrders`, `useAllOrders` → `{orders, loaded, failed, error, reload}`, `useKitchenReviews(id)`, `useAllMyReviews`, `kitchenName(id)`, `isUuid`, `ordersKey`, `ORDERS_REFRESH_MS` (30 s), `ORDER_REFRESH_MS` (20 s) |
| `format.js` | Display formatting (en-IN) | `rupees` (`null` → "Price soon"), `clock`, `dayLabel`, `dateTime`, `timeAgo`, `closing(closesAt)` (uses `CLOSING_SOON_MIN`), `initials`, `shrinkImage` (data-URL JPEG), `ownerFirst`, `pickupPlace` |
| `media.js` | Photos/videos on the phone in IndexedDB (`handi-media`/`files` via idb-keyval) | `saveMedia(blob)` → key, `deleteMedia`, `clearMedia`, `getMediaUrl`, `useMediaUrl` (auto-revokes), `pickMedia({capture, multiple})`, `prepareMedia(file)` (JPEG Blob ≤1280px) |
| `myKitchen.js` | The user's Cook-mode kitchen in the buyer kitchen shape | `isMyKitchenId`, `buildBuyerKitchen`, `useMyBuyerKitchen`, `myBuyerKitchenNow`, `useMyBuyerPosts`, `useMyStoryGroup`, `seedPilotMenu` |
| `orderStatus.js` | Free-text backend `order_status` → app stage | `orderStage`, `isRejectedStatus(status, refundFlag)`, `statusLabel`, `canReview(order)` |
| `ratings.js` | Star maths | `summarizeReviews(reviews, dishName?)` → `{dist, count, avg}`, `summarize`; `dishRating`/`kitchenRating`/`dishRatings` are unused leftovers |
| `sales.js` | Cook → Metrics data | `salesRecords`, `buckets(range)`, `barData`, `colourKeys`, `pieData`, `notifyCounts`, `CUSTOM_KEY` |

## How it works
- **`data.js`**:
  - `useApiOrders` polls `orders:<userId>` every 30 s and swaps in dish photos from the catalog.
  - `useAllOrders` = backend orders + `useOrders` demo orders, newest first.
  - Review hooks merge `/review/*` with `useMyReviews` demo reviews, and return `undefined` while the first load runs.
  - `useKitchenReviews` only calls the backend when the id `isUuid`: the user's own local kitchen has no backend row.
- **`myKitchen.js`**:
  - `buildBuyerKitchen` maps live dishes → `items` (`availableNow = live.now`; `closesAt` = `MAX_SAFE_INTEGER` when available now) and non-live dishes → `offMenu`. Pilot kitchens take owner, cuisine and flat from `data/cooks.js`.
  - `seedPilotMenu` copies new menu dish names from `cooks.js` into `useCook` once each, and fills missing prices.
- **`orderStatus.js`**:
  - Folds a status (lowercase, strip spaces, `_` and `-`) and looks it up in `STAGE_WORDS`. An unknown word means stage 0.
  - `REJECTED` words, or `refund_flag`, mean rejected.
  - `canReview` requires a backend order, no review yet, and status `delivered|completed`. This mirrors the backend's `review.allowed_order_statuses`; the backend has the final say (422/409).
- **`ratings.js`**: half stars split 0.5 into each neighbouring bucket so averages stay exact. In `summarizeReviews`, 0.5★ counts as 1★.
- **`sales.js`**:
  - `salesRecords` = 190 days of deterministic **sample history** (seeded RNG per dish + day) + real accepted/ready/picked incoming orders + paid custom requests.
  - Weeks run Monday to Sunday.
  - `colourKeys` gives the top 5 by all-time revenue stable colours (`--series-1..5`), in menu order; everything else is "Other".

## Invariants & gotchas
- Shapes produced here must match services/api.js adapters (kitchen, dish, order, review). Pages treat backend kitchens and your own kitchen identically.
- Two image shrinkers exist on purpose:
  - `format.shrinkImage` → data URL, small enough for localStorage (logos, dish photos in `useCook`, demo review photos).
  - `media.prepareMedia` → Blob, for IndexedDB posts/stories and backend uploads.
  - Videos only go to IndexedDB (`saveMedia`).
- `useMediaUrl` revokes its object URL on unmount. `getMediaUrl` doesn't; the caller revokes it (stories.jsx does).
- Metrics always include sample data. The UI says so, and real figures are added on top. Replace `salesRecords` when a sales endpoint exists.
- `seededDishes` is keyed by dish **name** (see data/CLAUDE.md).

## How to extend
- **New merged list (backend + local)**: write a hook in `data.js` on top of `useQueryState`, return `undefined` until loaded, and expose `failed`/`reload` for `LoadError`.
- **New backend status word**: add it to `STAGE_WORDS`/`REJECTED`/`REVIEWABLE` in `orderStatus.js`.
- **New metric**: derive it from `salesRecords` records `{at, key, qty, revenue, sample?}` and render it in `pages/cook/Metrics.jsx`.

## Tests
None.
