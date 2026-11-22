# src/services: backend HTTP client, row adapters, demo phone login

## Purpose
The only code that talks to the Mangla backend (a separate FastAPI repo), plus the adapters that turn its snake_case rows into the camelCase shapes every page renders. Also the fake OTP login.

## Files
| File | Role | Key types / entry points |
|---|---|---|
| `http.js` | Single transport: every call is `POST <VITE_API_BASE_URL><path>` with a JSON body | `post(path, body)`, `ApiError {status, message, requestId}`, `errorText(err)`, `API_BASE_URL` |
| `api.js` | Endpoint wrappers and adapters (backend row → app shape); Cook-side mocks | `api` object, `mapUser`, `mapDish`, `mapKitchen`, `mapOrder`, `mapReview`, `PLACEHOLDER` (`/logo.svg`), `NEVER` (`Number.MAX_SAFE_INTEGER`), re-export `canReview` |
| `auth.js` | Demo phone login: any number, OTP `DEMO_OTP`; pilot cooks' numbers get their kitchen | `requestOtp(phone)`, `verifyOtp(code, phone)` → `{user, kitchen}`, `tenDigits`, `prettyPhone` |

## How it works
- **`post()`**:
  - Throws `ApiError(0, …)` when `VITE_API_BASE_URL` is unset or the network fails.
  - A non-2xx response throws `ApiError(status, detail)`. FastAPI 422 `detail` lists are flattened to `loc: msg; …`. `requestId` comes from the body's `request_id` or the `X-Request-ID` header.
  - `errorText` appends `(ref xxxxxxxx)` for Toasts, so a failure can be found in the backend logs.
- **`api` endpoints** (path → body):
  - `getUser` `/account/user-info` `{user_id}`
  - `setAppInstalled` `/account/update-installed` `{user_id, installed:true}`
  - `listKitchens(user)` = `/home/kitchen-society-all` `{user_id}` + `/home/kitchen-live` `{society_id}`, merged. Live kitchens missing from the society list are appended.
  - `listPreorderKitchenIds` `/home/kitchen-preorder` `{society_id}`
  - `updatePinned` `/home/update-pinned` `{user_id, kitchen_id, pin}` → `{pinned_kitchen: [ids]}`
  - `listOrders` `/orders/user-all` `{user_id}`
  - `getOrder` `/orders/details` `{order_id}` (returned **raw**; OrderDetail merges it via `mapOrder`)
  - `reviewOrder` `/orders/review` `{order_id, rating, description, images, anonymous_flag}`
  - `listKitchenReviews` `/review/kitchen` `{kitchen_id}`
  - `listMyReviews` `/review/user-all` `{user_id}`
  - `uploadReviewPhoto`: `prepareMedia`, then `/media/upload-url` `{kind:'review', user_id, file_names}`, then a raw `fetch` PUT to the signed `upload_url`. Returns `{url: objectURL, path}`, and `path` goes into `reviewOrder.images`.
  - `registerKitchen` / `updateKitchen` are **mocks** (setTimeout echo); no cook endpoints exist yet.
- **App shapes the pages rely on**:
  - Kitchen: `{id, name, owner, phone, block, flat, cuisine, about, cover, thumb, pinned, nextOpen, items[], offMenu[]}`
  - Dish: `{id, name, desc, price, photo, gallery[], preorder, availableNow, readyAt, closesAt, left, total}`
  - Order: `{id, code, source:'api', kitchenId, kitchenName, dishId, lines[{itemId,name,qty,price,photo,readyAt}], total, placedAt, rawStatus, statusLabel, stage, rejected, reviewId}`
  - Review: `{id, source, kitchenId, itemName, userName, anonymous, rating, comment, photos[], createdAt}`
  - `lib/myKitchen.js` `buildBuyerKitchen` produces the same kitchen/dish shape for the user's own Cook-mode kitchen. Keep both in step.
- **Login** (`pages/Login.jsx`): `verifyOtp` checks the code, then `cookByPhone` (data/cooks.js). Eat mode then signs everyone in as the **same** backend user, `api.getUser(DEMO_USER_ID)`, because the backend has no login yet.

## Invariants & gotchas
- No auth: ids (`user_id`, `kitchen_id`, `order_id`, `society_id`) travel in the request body, and there are no tokens. Never add a second fetch wrapper; route new calls through `post()`.
- Pages must only see mapped shapes. Add a field in the adapter, not in the page.
- Backend kitchens get owner, phone, cuisine, about, logo, flat and dish photos from `data/cooks.js`, matched by exact kitchen name (`pilotByName`) and dish name (`pilotDishPhotos`).
- `mapDish` rules:
  - `active_order_flag === 2` means pre-order.
  - `availableNow` = not pre-order AND (`pickup_time` is null or already past).
  - A missing `order_close_time` becomes `NEVER`.
  - A missing `portions_count` means `left: 99`, `total: null`.
- Backend orders carry no price (`price`/`total` are `null`) and are one dish each. There's **no place-order endpoint**: checkout creates local demo orders (store/index.js `useOrders`).
- Signed image URLs expire. The catalog's 5-minute refresh (store/catalog.js) renews them.
- `.env` values are baked in at build time (`import.meta.env`). CI fails the build if either variable is empty.

## How to extend
- **New endpoint**: add a method to `api` that calls `post('/path', {snake_case body})` and maps the result with an existing or new `mapX`. Read it from a page via `useQueryState` (hooks) or a hook in `lib/data.js`. After a write, `invalidate()` the affected keys.
- **Real cook endpoints**: replace the `registerKitchen`/`updateKitchen` mocks here. Cook-mode stores (store/cook.js) are still local and would need the same adapter treatment.

## Tests
None.
