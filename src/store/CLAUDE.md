# src/store: zustand stores (persisted to localStorage) and simulated timelines

## Purpose
All client state. Most stores `persist` to localStorage under `handi-*` keys. Holds the parts the backend doesn't serve yet: cart, demo checkout orders, Cook mode, custom-order chats and "Notify me". `catalog.js` is the in-memory mirror of backend kitchens.

## Files
| File | Role | Key types / entry points |
|---|---|---|
| `index.js` | Core buyer stores and the order-stage model | `useAuth`, `useCart`, `useOrders`, `useMyKitchen`, `useStories`, `useMyReviews`, `usePrefs`, `usePins` (legacy); `STATUSES`, `ACCEPTED`/`READY`/`PICKED`, `statusIndex(order, now)`, `stepTime(order, i)`, `isRejected(order)` |
| `catalog.js` | Backend kitchens (not persisted); optimistic pinning | `useCatalog` (`byId`, `order`, `loaded`, `error`, `load()`, `togglePin(id)`, `clear()`), `kitchenById(id)`, `CATALOG_REFRESH_MS` (5 min) |
| `cook.js` | Cook mode: dishes, live availability, incoming orders, posts, stories | `useCook`, `dishStats(dish, incoming)`, `coverOf(dish)`, `newMediaId()`, `STORY_TTL_MS` (24 h), `COOK_STATUSES` (unused) |
| `notify.js` | "Notify me when live" subscriptions | `useNotify` (`subs`, `dismissed`, `toggle`, `isOn`, `dismiss`), `subKey(kitchenId, dishId)` |
| `requests.js` | Custom-order chat threads plus their simulated other side | `useRequests` (`create`, `send`, `quote`, `decline`, `pay`, `markReady`, `markPicked`, `simulateIncoming`, `tick`), `REQUEST_TAG`, `requestTag(r)` |

## How it works
- **Persist keys / versions**:
  - `handi-auth` v2, `handi-cart` v2, `handi-orders` v2, `handi-reviews` v2, `handi-pins` v2: every `migrate` **wipes** the store.
  - `handi-stories` v1 (`FRESH_V1`, also wipes).
  - `handi-cook` v2: real migrate. v0 `photo` → `media[]`; v2 `cooking` → `accepted`.
  - `handi-notify` v1, `handi-requests` v1: wipe.
  - `handi-my-kitchen`, `handi-prefs`: unversioned.
- **Order stages**: `STATUSES = ['Paid','Order accepted','Ready for pickup','Picked up']`. `statusIndex` decides the stage by order kind:
  - backend order (`source:'api'`) → `order.stage` (from lib/orderStatus.js);
  - `pickedUpAt` set → `PICKED`;
  - custom-request order (`requestId`) → follows the request status;
  - order to the user's own Cook-mode kitchen (`cookLinked`) → the slowest linked `useCook.incoming` line;
  - otherwise a timer, `floor((now − placedAt + skipMs) / STATUS_STEP_MS)`, capped at `READY`.
  - "Picked up" only happens by user action (`pickUp`). `advance()` bumps `skipMs` for the "Demo: next step" button.
- **Checkout** (`useOrders.place`) is local: id `HD-####`, `pickupCode` = the digits. If the kitchen is the user's own, Cart also pushes lines into `useCook.addFromBuyer` with `buyerOrderId`, so the cook side sees them.
- **Catalog**:
  - `load()` dedupes concurrent calls and stores kitchens in server order: pinned first.
  - `togglePin` flips state locally, then adopts the server's `pinned_kitchen` list; it rolls back and Toasts on error.
  - `kitchenById` returns the user's own kitchen (`myBuyerKitchenNow`) before the catalog's.
- **Cook dish shape**: `{id, name, desc, price, media[{id,type,url|key}], live: null | {now, portions, closesAt|null, readyAt, since}}`.
  - `goLive` on a dish that wasn't live **seeds simulated neighbour orders** totalling portions + 2.
  - `takeOffline` drops simulated orders and rejects pending real buyer orders.
  - `markReady(dishId)` moves all accepted orders to ready.
  - `dishStats` → `{portions, ordered, pending, left, buyerLeft, over}`.
- **Requests**: `open → quoted → paid → ready → picked` (or `declined`). `tick()` runs every second from `App.jsx`:
  - Chats to the pilot kitchens in `data/mock.js` get a simulated cook (`sim`: reply, then a quote about 5 s later, then ready about 20 s after paying).
  - `simulateIncoming` creates a simulated neighbour (`neighbourSim`) who pays and picks up by themselves.

## Invariants & gotchas
- **Changing a persisted shape**: bump `version` and write a `migrate`. Otherwise old phones load stale shapes. Most stores choose to wipe.
- **A new persisted store**: add its `clearAll()` to Settings → Sign out (`pages/Settings.jsx`), which also calls `clearMedia()`, `useCatalog.clear()` and `clearQueryCache()`.
- Circular imports: `index.js` ↔ `cook.js`/`requests.js`, and `catalog.js`/`requests.js` → `lib/myKitchen.js` → `index.js`. They work only because cross-store access happens inside functions (`useX.getState()`). Never read another store at module top level.
- Custom requests and checkout are **local to this phone**:
  - A request to a backend kitchen (UUID id) gets no simulated cook (`isMock` only matches the `mock.js` pilot ids) and no backend, so it stays `open`.
  - Only a kitchen registered in Cook mode on the same phone receives orders and requests end to end.
- `usePins` is legacy (Eat pins now come from the backend via `useCatalog`); it's only cleared on sign-out.
- Media blobs aren't in these stores. Cook media items hold either a data-URL `url` (images) or an IndexedDB `key` (videos), per lib/media.js.

## How to extend
- **New local feature state**: add a store with `create(persist(..., { name: 'handi-<x>', version: 1, migrate }))`, add its `clearAll` to sign-out, and document the key here.
- **Moving a store to the backend**: follow `catalog.js`. Make it unpersisted, load through `api`, mirror server truth, do optimistic writes with rollback, and Toast `errorText(err)` on failure.
- **New order status**: keep `STATUSES`, `ACCEPTED/READY/PICKED`, lib/orderStatus.js `STAGE_WORDS`, and the cook `STAGE` map in sync.

## Tests
None.
