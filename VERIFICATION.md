# Verification

Verified on Windows with Node 26.8.2 and headless Chrome on November 11, 2026.

- TypeScript check and production build pass.
- 15 unit tests cover validation, persistence, failed writes, filter boundaries, value ranking, import parsing, Steam metadata mapping, and reel selection.
- Built single-file HTML loads directly through `file://`.
- Browser checks cover status updates, search, Play Next, tags, persistence after reload, custom game creation, JSON preview/merge, winner actions, both reduced-motion and animated roulette, and winning-card alignment.
- No runtime exceptions or console errors occurred during the browser checks.
- No horizontal page overflow at 1440px or 390px; desktop/mobile screenshots were visually inspected.
- All 30 demo Steam cover URLs returned HTTP 200.
- Single-file packaging verifies that local JavaScript, stylesheet, and font references are embedded.

Live Steam credentials, AllOrigins availability, audible output, and desktop Steam launching require user-side verification. The app labels imported estimates and unknown costs and reports network failures without storing credentials. External CDN resources require a network connection. Browser persistence depends on origin and browser policy; use JSON exports as backups.
