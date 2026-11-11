# Verification

Verified on Windows with Node 26.8.2 and headless Chrome on November 11, 2026.

- TypeScript check and production build pass.
- 29 unit tests cover validation, persistence, filters, value ranking, imports, profile lookup, caching, rankings, unknown data, reel selection, activity aggregation, extended-ranking parsing, failure backoff, observation history, and chart gaps.
- Built single-file HTML loads directly through `file://`.
- Browser checks verify a fresh 250-game discovery pool with no default profile or personal statistics. Imported/profile libraries replace it. They also cover status updates, search, Play Next, tags, reload persistence, custom games, JSON preview/merge, both roulette modes, and winning-card alignment.
- Hosted browser checks use explicit mocked Steam responses to verify profile resolution UI, accurate minute-to-hour conversion, private lookup failure preservation, empty-library persistence, switching profiles, and absence of invented completion times/value figures.
- Steam pulse browser checks verify the 1,000-game ranking, ten entries in each of four cards, comparisons, owned-only filtering, saved Play Next actions, return-to-backlog navigation, honest history state, and mobile layout.
- Discovery starts with six cards; expand/collapse checks verify all 250 remain available to roulette regardless of the grid preview.
- Filesystem routing checks cover clean hosted `/activity` URLs and direct reloads, standalone hash navigation, and persisted library state across page changes.
- The snapshot updater captured 1,000 distinct entries using Steam Charts' extended ranking and official Steam data. Extended counts refresh hourly; official top-100 counts refresh every five minutes. No profile API key is needed for activity data.
- No runtime exceptions or console errors occurred during the browser checks.
- No horizontal page overflow at 1440px or 390px; desktop/mobile screenshots were visually inspected.
- The ranking updater verified 250 unique Steam IDs with contiguous ranks from the attributed Steam 250 source.
- Single-file packaging verifies that local JavaScript, stylesheet, and font references are embedded.

Live Steam access still requires a server API key. No default profile or account credential is shipped. Private-profile and network failures are tested with fixtures. Audible output and desktop Steam launching require user-side verification. External CDN resources need a network connection; use JSON exports as backups.
