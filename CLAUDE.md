# Handi prototype (handi-prototype 0.1.0)

Handi ("Society Kitchens") is a mobile-first PWA for ordering home-cooked food from neighbours' kitchens inside one housing society.
- **Eat mode** (buyer): reads kitchens, orders and reviews from the separate **Mangla backend** (FastAPI, repo `mangla_project_backend`).
- **Cook mode** (kitchen owner): entirely local to the phone for now.
- **Still simulated locally:** login (everyone shares one backend user), checkout and UPI payment, custom-order chats, and all of Cook mode.

There is no README yet; this file and the folder docs are the only project documentation.

## Stack and commands
- React 18.3 + React Router 6.30 (lockfile versions), plain JS/JSX (no TypeScript), Vite 5.4, vite-plugin-pwa 0.21 (`autoUpdate` service worker, manifest in `vite.config.js`).
- UI: antd-mobile 5.43 + antd-mobile-icons, @chatscope chat kit, react-insta-stories, recharts 2.15, dnd-kit, @use-gesture + @react-spring. Fonts via @fontsource (Fraunces, DM Sans, DM Mono).
- State: zustand 5 (`persist` → localStorage). Media: idb-keyval (IndexedDB). CI uses Node 20.

```
npm install                # CI uses npm ci
npm run dev                # vite --host; .claude/launch.json "handi-dev" pins port 5173
npm run build              # → dist/
npm run preview            # serve dist/
npm run icons              # regenerate PWA icons from public/logo.svg (pwa-assets.config.js)
```
**No tests, no linter or formatter configured.** Verify changes with `npm run build` and by driving the app in a browser at phone width.

**Env**: copy `.env.example` to `.env.local` and set:
- `VITE_API_BASE_URL`: backend including its `/app` prefix, e.g. `http://localhost:8000/app`.
- `VITE_DEMO_USER_ID`: a backend `users.user_id`.

Run the backend locally with `python -m app` in `mangla_project_backend`; there, `python -m scripts.seed_demo_eat` prints the demo buyer's id (both per `.env.example`).

**Login**: any phone number with OTP `123456`. The pilot cooks' numbers in `src/data/cooks.js` open Cook mode.

**Deploy**: a push to `main` runs `.github/workflows/azure-static-web-apps.yml`, which builds with both `VITE_*` values from the repo's Actions *variables* (the build fails if either is empty) and uploads `dist/` to Azure Static Web Apps. `public/staticwebapp.config.json` provides the SPA fallback and `no-cache` on `sw.js`/`index.html`.

**Git**: work on `feat/…`, `feature/…` or `fix/…` branches and merge into `main` by PR. A merge to `main` deploys.

## Architecture
```
index.html → src/main.jsx (fonts, theme.css, install-prompt listener, pilot-cook boot)
  → App.jsx <Routes>
      /login
      <Shell>  auth guard · Eat/Cook redirect · tab bars · 1 s chat tick · 5 min catalog poll
        ├ Eat sections   /orders | / | /cart                          (one Swiper, all mounted)
        ├ Cook sections  /cook/posts | /cook | /cook/orders | /cook/metrics
        └ detail pages   /kitchen/:id, /orders/:id(/rate), /requests/:id, /settings…, /cook/dish/:id

pages ─► store/catalog.js ──────────────┐
      ─► lib/data.js → hooks/useQueryState ─┴► services/api.js (adapters) ─► services/http.js POST ─► Mangla backend
      ◄► store/*.js  zustand persist → localStorage "handi-*"   (cart, demo orders, Cook mode, chats, notify)
      ◄► lib/media.js  IndexedDB "handi-media"                   (cook photos/videos, posts, stories)
      ◄─ src/data/cooks.js  pilot kitchens: fills owner/logo/photos for backend kitchens by name
```
Not built on the backend yet: real login, place-order, payments (UPI is simulated), Cook endpoints, posts/stories.

## Code map
- [src/CLAUDE.md](src/CLAUDE.md): entry, routes, `Shell`/`Sections`, `config.js`, `styles/theme.css`
- [src/services/CLAUDE.md](src/services/CLAUDE.md): HTTP client, endpoint list, backend → app shape adapters, demo OTP login
- [src/store/CLAUDE.md](src/store/CLAUDE.md): zustand stores, persist keys/versions, order-stage model, simulations
- [src/lib/CLAUDE.md](src/lib/CLAUDE.md): merged data hooks, formatting, IndexedDB media, own-kitchen adapter, status/ratings/sales maths
- [src/hooks/CLAUDE.md](src/hooks/CLAUDE.md): query cache + `invalidate`, PWA install detection, theme
- [src/data/CLAUDE.md](src/data/CLAUDE.md): pilot kitchens and menus, demo fixtures
- [src/pages/CLAUDE.md](src/pages/CLAUDE.md): Eat screens, Login, Settings, chat, shared components
- [src/pages/cook/CLAUDE.md](src/pages/cook/CLAUDE.md): Cook screens (dishes, orders, posts, metrics)

## Rules that always hold
- **One transport.** All backend traffic goes through `services/http.js` `post()`: POST with a JSON body carrying the ids (`user_id`, `kitchen_id`, `order_id`, `society_id`), no auth headers or tokens. Never call `fetch` for the API elsewhere (the only exception is the signed-URL PUT in `api.uploadReviewPhoto`).
- **Adapt at the edge.** Backend snake_case rows are mapped in `services/api.js`, so pages only see the app shapes (kitchen/dish/order/review, listed in services/CLAUDE.md). `lib/myKitchen.js` builds the same shapes for the user's local kitchen. Keep the two in step.
- **Two sources of orders and reviews.** Branch on `source === 'api'`. Only UUID ids hit the backend (`isUuid` in lib/data.js); local ids (`HD-####`, `my-…`, pilot slugs) never do.
- **Names are join keys.** Backend kitchens and dishes get their logo, owner and photos from `src/data/cooks.js` by exact name. Renaming one side breaks the other.
- **Persisted stores.**
  - Key `handi-<name>`.
  - Changing a stored shape means bumping `version` and adding a `migrate`.
  - Every persisted store, plus IndexedDB media and the query cache, is cleared in Settings → Sign out.
  - Cross-store access only inside functions (`useX.getState()`), because the stores import each other in cycles.
- **UI from libraries.** Build screens from antd-mobile (then the other UI libraries already in package.json), themed through `src/styles/theme.css`; don't hand-build widgets. Use `var(--token)` colours, and give every token a light **and** a dark value.
- **Mobile frame.** Layout is capped at 480px. Eat and Cook tabs are swipe sections that stay mounted. Horizontal scrollers inside them spread `keepTouch` (pages/stories.jsx).
- **Config.** App name, strings and prototype knobs live in `src/config.js`. `VITE_*` values are baked in at build time, so a new one also goes in `.env.example` and the deploy workflow.
- **Media.** Small images are stored as data URLs inside stores (`shrinkImage`). Videos, posts and stories are IndexedDB blobs referenced by key (`lib/media.js`). Delete the key when deleting what owns it.

## Keeping docs current
- When you add, rename or delete a file, or change behaviour in a folder, update that folder's CLAUDE.md in the same change.
- A new folder with real logic gets its own CLAUDE.md (same headings) and a line in the code map.
- Edit this root file only when the architecture, commands or cross-cutting rules change. Keep it short.
- User-visible changes also update the README.
- Docs explain the why, the connections and the gotchas. Don't restate code line by line. Delete anything that's no longer true.
