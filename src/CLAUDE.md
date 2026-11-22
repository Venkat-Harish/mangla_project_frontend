# src: app entry, routing shell, global config and the one stylesheet

## Purpose
Boots the React app, defines every route and the Eat/Cook mode shell (swipeable tab sections, tab bars, background polling), and holds app-wide constants (`config.js`) and the design system (`styles/theme.css`).

## Files
| File | Role | Key types / entry points |
|---|---|---|
| `main.jsx` | Boot: fonts, `styles/theme.css`, side-effect import of `hooks/index.js`, pilot-cook boot fix-up, `<BrowserRouter><App/>` in StrictMode | top-level code only |
| `App.jsx` | All routes; `Shell` (auth guard, mode redirects, tab bars, polling); `Sections` (antd `Swiper` kept in sync with the URL) | `App` (default), `Shell`, `Sections`, `EAT`, `COOK` path arrays |
| `config.js` | App name/strings and prototype knobs; everything renames from here | `APP_NAME`, `APP_WORDMARK`, `APP_TAGLINE`, `DEMO_OTP` (`'123456'`), `DEMO_USER_ID` (`VITE_DEMO_USER_ID`), `STATUS_STEP_MS` (15000), `CLOSING_SOON_MIN` (30) |
| `styles/theme.css` | The only stylesheet: palette tokens, antd-mobile `--adm-*` mapping, phone frame, utility classes, per-feature blocks, dark theme | `:root:root` tokens, `.frame`, `.scroll`, `.sections`, `[data-theme="dark"]` block, chart `--series-*` tokens |

Subfolders with their own docs: [data](data/CLAUDE.md), [hooks](hooks/CLAUDE.md), [lib](lib/CLAUDE.md), [pages](pages/CLAUDE.md), [pages/cook](pages/cook/CLAUDE.md), [services](services/CLAUDE.md), [store](store/CLAUDE.md). `styles/` (one file) is covered here.

## How it works
- **Boot (`main.jsx`)**: if the persisted user has `kitchenId` and `useMyKitchen` holds a kitchen (a pilot cook), it forces `mode='cook'` and calls `seedPilotMenu()` (lib/myKitchen.js) so dishes added to `data/cooks.js` show up. Importing `hooks/index.js` here is what attaches the `beforeinstallprompt` listener early enough.
- **Routes (`App`)**: `/login` sits outside the shell. Everything else is a child of `<Shell>`:
  - Eat sections `EAT = ['/orders', '/', '/cart']` → `Orders`, `Home`, `Cart`, all inside one `Sections` swiper.
  - Cook sections `COOK = ['/cook/posts', '/cook', '/cook/orders', '/cook/metrics']` → cook `Posts`, `Dishes`, `Orders`, `Metrics`.
  - Detail pages: `/kitchen/:id`, `/kitchen/:id/reviews`, `/orders/:id`, `/orders/:id/rate`, `/settings`, `/settings/reviews`, `/settings/kitchen`, `/cook/dish/:id` (`new` = create), `/requests/:id` (buyer chat), `/cook/requests/:id` (cook chat). `*` redirects to `/`.
- **`Sections`**: one antd `Swiper` per mode holds every section page **mounted at once**. A swipe calls `navigate(path, {replace:true})`; a URL change calls `swipeTo`. A `current` ref stops the two from fighting.
- **`Shell`**, on every render:
  1. No user → `/login`.
  2. Cook mode (`useMyKitchen.mode==='cook'` with a kitchen) on an Eat section → `/cook`. Eat mode on any `/cook*` path → `/`.
  3. Section pages render bare. Any other page is wrapped in `<div className="scroll" key={pathname}>`, so scroll resets per page.
  4. Tab bars: the Eat bar has a cart-count badge. The Cook bar's badge = pending incoming orders on live dishes + open custom requests for my kitchen.
- **Background effects in `Shell`**:
  - `useRequests.tick()` every 1 s, which drives the simulated chat partners (store/requests.js).
  - When `user.id` is a backend UUID (`isUuid`): `api.getUser` once per start to refresh the profile. A pilot cook keeps their own name and kitchen; only `societyId` and `appInstalled` are copied. A 404 logs out non-cooks. Then `useCatalog.load()` runs now and every `CATALOG_REFRESH_MS` (5 min).
  - App-installed metric: when `useInstallPrompt().installed` is true and the user isn't flagged yet, calls `api.setAppInstalled` at most once per page load (module-level `installedSent`).

## Invariants & gotchas
- `EAT`/`COOK` order = swiper order = the children array order in `App()` = TabBar item order. Change all of them together, or swipes navigate to the wrong page.
- Section pages stay mounted while hidden, so their hooks and timers keep running. Shared queries are deduped in `hooks/index.js` for that reason.
- Horizontal scrollers inside a section page must spread `keepTouch` (pages/stories.jsx), or a scroll turns into a section swipe.
- `.adm-swiper.sections` uses `overflow: clip`, not `hidden`. With `hidden`, code-driven `scrollIntoView` (CapsuleTabs) slides the whole strip sideways and leaves it stuck there (see the comment in theme.css).
- Tokens are declared on `:root:root` (double specificity) to beat antd-mobile's own `:root` variables. Every new colour token needs a value in **both** the light block and the `:root:root[data-theme="dark"]` block. Chart tokens (`--series-*`, `--bar*`) have separate dark overrides.
- The paper colour `#F5EFE4` is repeated in `vite.config.js` (manifest), `index.html` (meta theme-color), `pwa-assets.config.js` and `useTheme`'s `THEME_BG`. Change them together.
- `.frame` caps the layout at 480px. Bottom popups are re-centred to the same width.
- `STATUS_STEP_MS`'s comment names "Received/Cooking" stages that no longer exist. The real stages are `STATUSES` in store/index.js.

## How to extend
- **New detail page**: create it in `pages/` (or `pages/cook/`), then add a `<Route>` inside the `<Shell>` route in `App.jsx`. It gets the `.scroll` wrapper and the auth guard for free.
- **New section tab**: add the path to `EAT` or `COOK`, add the page to that mode's children array in `App()` at the same index, and add a `TabBar.Item` with the same `key`. Then update [pages/CLAUDE.md](pages/CLAUDE.md) or [pages/cook/CLAUDE.md](pages/cook/CLAUDE.md).
- **New global constant**: put it in `config.js`. Read `VITE_*` env vars only via `import.meta.env` there or in `services/http.js`, and add new ones to `.env.example` and the deploy workflow.
- **New styles**: add a commented block to `theme.css` using tokens (`var(--ink)` etc.), never raw hex for themeable colours. Prefer theming antd-mobile through `--adm-*` and component CSS variables over hand-built components.

## Tests
None.
