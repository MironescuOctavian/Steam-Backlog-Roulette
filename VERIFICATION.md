# Verification

Verified on Windows with Node 26.8.2 and headless Chrome on November 11, 2026.

- TypeScript check and production build pass.
- 21 unit tests cover validation, persistence, filter boundaries, value ranking, import parsing, Steam metadata mapping, profile input parsing, private profiles, server caching/rate limits, ranking integrity, unknown data, and reel selection.
- Built single-file HTML loads directly through `file://`.
- Browser checks verify a fresh 250-game discovery pool with no default profile or personal statistics. Imported/profile libraries replace it. They also cover status updates, search, Play Next, tags, reload persistence, custom games, JSON preview/merge, both roulette modes, and winning-card alignment.
- Hosted browser checks use explicit mocked Steam responses to verify profile resolution UI, accurate minute-to-hour conversion, private lookup failure preservation, empty-library persistence, switching profiles, and absence of invented completion times/value figures.
- No runtime exceptions or console errors occurred during the browser checks.
- No horizontal page overflow at 1440px or 390px; desktop/mobile screenshots were visually inspected.
- The ranking updater verified 250 unique Steam IDs with contiguous ranks from the attributed Steam 250 source.
- Single-file packaging verifies that local JavaScript, stylesheet, and font references are embedded.

Live Steam access still requires a server API key. No default profile or account credential is shipped. Private-profile and network failures are tested with fixtures. Audible output and desktop Steam launching require user-side verification. External CDN resources need a network connection; use JSON exports as backups.
