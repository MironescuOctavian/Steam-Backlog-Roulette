# Steam Backlog Roulette & Time-to-Beat Planner

A browser-local backlog planner using Solid 2, TypeScript, Rimelight UI, UnoCSS, and Vite+. Styling follows octavianmironescu.com: amber palettes, neutral dark surfaces, and fine orbital/grid decoration.

## Development

Use Node 26.10+ (required by Rimelight UI) and pnpm 12.16.1.

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

Demo playtime, USD purchase prices, review scores, and completion times are illustrative, not account data. Completion times are estimates, especially for sandbox and replayable games. Artwork uses real Steam CDN headers.

**Run immediately:** open `standalone/index.html` in your browser. No installation or build step is needed for this file.

The production build refreshes both `standalone/index.html` and `dist/index.html` with JavaScript, CSS, icons, and fonts embedded. You can also serve `dist/` with a static web server. Steam cover images and optional Canvas Confetti are loaded from external CDNs. A network connection is needed for these resources and Steam import. This is an independent project, not affiliated with Valve or Steam.

## Local data

The library is saved in this browser's localStorage. Clearing browser data removes it. Invalid or unsupported saved data is preserved; the app displays a temporary demo library and a warning instead.

LocalStorage is scoped to the browser and origin; behavior under `file://` varies by browser. Use a static server for consistent persistence. Export JSON for backups or transfers between origins. Imports provide a preview and merge by App ID by default; replacement is an explicit choice.

## Steam import and estimates

Use a 17-digit Steam64 ID and a Steam Web API key with public profile/Game details. Direct browser requests are usually blocked by CORS. The optional AllOrigins proxy receives the ID and key; enable it only if you trust that service. The app never persists or exports credentials. The proxy may be unavailable or rate limited; JSON import works independently.

Steam provides playtime, not completion times, review scores, or prices paid. Known demo titles supply illustrative metadata; unknown titles receive a labeled 20-hour estimate and unknown score/cost. Unknown costs are excluded from value analytics. Remaining hours subtract recorded playtime from the estimate and are not a measure of actual story completion. Weekly planning assumes those hours count toward finishing.

Status, custom tags, and the independent Play Next priority are saved immediately. Failed writes preserve the previous library. Roulette draws equally from matching unfinished games; completed and dropped games are excluded even when shown in the grid. Reduced motion skips the long reel and confetti. Steam launch links require the desktop client.

## Verification

`pnpm test` covers persistence, validation, filters, value calculations, Steam response mapping, JSON transfers, and reel selection. `pnpm test:browser` runs headless Chrome against the built single-file app, checking desktop/mobile overflow, editing and reload persistence, custom game creation, JSON merge, both roulette animation modes, pointer alignment, and winner actions. Set `CHROME_PATH` if Chrome is installed outside the default Windows location. Browser checks use a fresh temporary profile and save screenshots to `artifacts/`.

Live Steam/proxy requests require your credentials and were not verified against a real account.
