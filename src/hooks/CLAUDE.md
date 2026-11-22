# src/hooks: query cache, PWA install detection, theme, clock

## Purpose
App-wide React hooks with module-level state: a small fetch cache for backend reads, PWA install detection, and theme application.

## Files
| File | Role | Key types / entry points |
|---|---|---|
| `index.js` | All hooks | `useQueryState(key, fn, {refreshMs, enabled})` → `{data, error, reload}`, `invalidate(prefix)`, `clearQueryCache()`, `cachedQuery(key)`, `useQuery` (unused); `useInstallPrompt()`, `installedHere()`; `useTheme(pref)`; `useNow(ms=1000)` |

## How it works
- **`useQueryState`**:
  - A module `cache` Map (key → last data) shows cached data immediately while a fresh copy loads.
  - `inflight` dedupes concurrent fetches of one key. This matters because the Eat swiper keeps Orders, Home and Cart mounted together.
  - `reloaders` (key → Set of mounted reload fns) lets `invalidate(prefix)` drop cached copies and reload every mounted query whose key starts with `prefix`.
  - A failure shows one antd `Toast` per failure streak and keeps the last good data.
  - `key == null` or `enabled:false` disables the query. `refreshMs` polls.
- **Keys in use**:
  - `orders:<userId>` (`ordersKey` in lib/data.js)
  - `order:<orderId>` (OrderDetail)
  - `reviews:<kitchenId>`, `myReviews:<userId>` (lib/data.js)
  - `preorder:<societyId>` (Home)
  - RateOrder invalidates the first four after posting a review.
- **Install detection**:
  - Runs at module load: `main.jsx` imports this file, because Chrome fires `beforeinstallprompt` once, right after load.
  - Stores the deferred prompt and a `localStorage['handi-installed']` flag. `appinstalled` sets the flag; `beforeinstallprompt` clears it again after an uninstall.
  - `installed` = standalone display mode OR that flag. Safari never reports installs.
- **`useTheme(pref)`** (`'light'|'dark'|'system'`): sets `<html data-theme>` (our tokens), `data-prefers-color-scheme` (antd-mobile's dark mode), `color-scheme` and the theme-color meta tag (`THEME_BG`).

## Invariants & gotchas
- Only `key` changes trigger a refetch; a changed `fn` closure is ignored. The key must encode every input `fn` uses.
- `invalidate` is prefix-based, so `invalidate('order')` would also hit `orders:*`. Pass the full family prefix, e.g. `order:<id>`.
- The cache is in-memory only. Settings → Sign out calls `clearQueryCache()`.
- Don't move the install listeners into a component or effect. They'd attach too late and `canPrompt` would stay false.
- `THEME_BG` must match `--paper` in theme.css for both themes.

## How to extend
- **New backend read in a page**: add the call to `api` (services/api.js), then `useQueryState('<family>:<id>', () => api.x(id))`. After a write, `invalidate('<family>:<id>')`. Put reusable composite hooks in `lib/data.js`.

## Tests
None.
