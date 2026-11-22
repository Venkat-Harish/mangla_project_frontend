# src/pages: Eat-mode screens, login/settings, and shared UI pieces

## Purpose
Every buyer-facing screen (Home, Kitchen, Cart, Orders, reviews, custom-order chat), plus Login, Profile/Settings, kitchen registration and the reusable components used across modes. Cook-mode screens are in [cook/](cook/CLAUDE.md).

## Files
| File | Role | Key types / entry points |
|---|---|---|
| `Home.jsx` | `/` Eat home: install banner, Notify-me alerts, own stories, order tracker, search, filter tabs, kitchen grid | `Home` (default), local `KitchenTile` |
| `Kitchen.jsx` | `/kitchen/:id`: hero, pin, menu with add-to-cart, off-menu "Notify me", custom-order request popup, Posts tab | `Kitchen` |
| `Cart.jsx` | `/cart`: one-kitchen cart, note, pickup, bill, slide-to-pay (simulated) | `Cart` |
| `Orders.jsx` | `/orders`: custom requests + active/past orders (backend + demo) | `Orders`; exports `statusColor`, `statusTagStyle`, `rateable`, `isReviewed` (used by OrderDetail) |
| `OrderDetail.jsx` | `/orders/:id`: status card, stepper, pickup code, rate CTA; polls backend orders | `OrderDetail`, local `mergeOrder` |
| `RateOrder.jsx` | `/orders/:id/rate`: per-dish stars, comment, photos, anonymous; backend or local submit | `RateOrder` |
| `Reviews.jsx` | `/kitchen/:id/reviews?dish=`: rating summary, dish and photo filters | `Reviews` |
| `MyReviews.jsx` | `/settings/reviews`: every review the user wrote | `MyReviews` |
| `Settings.jsx` | `/settings` Profile: society, Eat/Cook mode switch, kitchen, theme, install, sign-out (clears all local state) | `Settings` |
| `RegisterKitchen.jsx` | `/settings/kitchen`: register/edit own kitchen (mock API, local store) | `RegisterKitchen` |
| `RequestChat.jsx` | `/requests/:id` (buyer) and `/cook/requests/:id` (cook): custom-order chat, quote, pay, ready, pickup | `RequestChat`, local `QuoteSheet` |
| `Login.jsx` | `/login`: phone → OTP (always `123456`) → backend demo user; pilot cooks open Cook mode | `Login` |
| `SlideToConfirm.jsx` | Drag-to-confirm pill (`variant` `bold`/`soft`, `size` `large`/`compact`) on use-gesture + react-spring | `SlideToConfirm` (default) props `label, releaseLabel, doneLabel, onConfirm, onDone, disabled, size, tone, variant` |
| `install.jsx` | Install flow and the Home banner | `useInstallFlow()`, `InstallBanner`, `resetInstallBanner()` |
| `shared.jsx` | Small antd compositions used by several pages | `MediaView`, `ReviewItem`, `RequestList`, `LoadError`, `PinIcon` |
| `stories.jsx` | Story avatar row and full-screen viewer (react-insta-stories in an antd Popup) | `StoryRow`, `keepTouch` |

## How it works
- **Data sources**: pages read the kitchen list from `useCatalog` (store/catalog.js) and resolve single kitchens with `kitchenById`. Orders and reviews come through `lib/data.js` hooks; other backend reads go through `useQueryState` + `api`. Local-only state (cart, demo orders, requests, notify) comes from the zustand stores.
- **Own kitchen as buyer**: `useMyBuyerKitchen()` (lib/myKitchen.js) is rendered like any catalog kitchen (`k.mine === true`).
  - Home inserts it after the pinned kitchens, but only if it has dishes and no catalog kitchen has the same **name** (a pilot cook's backend kitchen wins).
  - `isMyKitchenId(id)` switches Kitchen and Reviews to the local copy.
- **Order sources**: always branch on `order.source === 'api'`.
  - Backend orders: one dish, no price, read-only status, rated via `/orders/review`, polled.
  - Demo orders (from Cart or a paid custom request): timer- or cook-driven stage, local "I've picked it up" and local reviews.
- **Checkout**: Cart's slide waits 1.1 s (simulated UPI), then `useOrders.place`. For the user's own kitchen it also calls `useCook.addFromBuyer`. Then it navigates to `/orders/:id?paid=1`.
- **OrderDetail for backend orders**: polls `/orders/details` (`order:<id>`, every 20 s) and merges in names and photos from the orders list via `mergeOrder`, because details carry no names.
- **RateOrder**:
  - Backend: photos upload immediately (`api.uploadReviewPhoto` → storage path). On submit it invalidates `orders:`, `order:`, `reviews:` and `myReviews:` keys. A 409 means already reviewed.
  - Demo: writes to `useMyReviews` and `markRated`.
- **RequestChat**: the role comes from the path prefix (`/cook/` means cook). The buyer pays a quote with a SlideToConfirm (`useOrders.place({requestId})` + `pay()`). The cook quotes in `QuoteSheet` and marks ready with a soft slider.
- **Login**:
  1. `verifyOtp`, then `api.getUser(DEMO_USER_ID)`. Everyone in Eat mode is the same backend user.
  2. A pilot cook registers their kitchen locally (wiping `useCook` if it's a different kitchen), switches to Cook mode, runs `seedPilotMenu()`, and keeps their own name with `pilotCook: true`, plus the backend id and `societyId` when reachable.
  3. `resetInstallBanner()` on every sign-in.

## Invariants & gotchas
- `Orders`, `Home` and `Cart` are section pages: always mounted inside the Eat swiper (see [../CLAUDE.md](../CLAUDE.md)). Don't assume they're visible, and wrap horizontal scrollers or tab strips in `{...keepTouch}`. `SlideToConfirm` already stops touch propagation itself.
- Cart allows one kitchen. Adding from another kitchen asks to clear it (`useCart.conflicts`).
- Backend calls are gated on `isUuid(id)`. Local kitchen ids (`my-…` from RegisterKitchen, pilot slugs) have no backend rows.
- Stories and Posts have no backend: only the user's own kitchen shows any. The poster/`headsup` branches in Kitchen's Posts tab are for post types nothing creates any more.
- Custom requests and demo orders are **local to this phone** (see store/CLAUDE.md). Requests to backend kitchens never get a reply.
- Backend users' `society` is the literal `'Your society'` (no societies table yet).
- `SlideToConfirm`: a throwing `onConfirm` resets the knob. `onDone` fires 1.3 s after success, so the tick animation plays before the caller swaps the slider out.
- `StoryViewer` must keep its `slides` memoised, or react-insta-stories restarts its timer every render. IndexedDB slides are turned into object URLs first and revoked on close.
- Settings → Sign out must clear **every** persisted store, plus `clearMedia()`, `useCatalog.clear()` and `clearQueryCache()`. Add any new store there.
- Build UI from antd-mobile components and theme.css classes/tokens. Avoid hand-built widgets and raw colours.

## How to extend
- **New Eat page**: create `X.jsx` here and add a route in `App.jsx` inside `<Shell>`. Use `NavBar onBack={() => navigate(-1)}` for detail pages and `useQueryState`/`lib/data.js` for backend data, and handle `undefined` (Skeleton) and `failed` (`LoadError`) states. Add a row to the Files table above.
- **New component used by more than one page**: put it in `shared.jsx`, or in its own file if it's large like `SlideToConfirm.jsx`.
- **New backend-backed action**: add an `api` method (services), call it, Toast `errorText(err)` on failure, then `invalidate()` the keys whose data changed.

## Tests
None.
