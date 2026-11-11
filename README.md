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

The current production build emits HTML and separate assets to `dist/`. Serve that directory with a static web server. This is an independent project, not affiliated with Valve or Steam.

## Local data

The library is saved in this browser's localStorage. Clearing browser data removes it. Invalid or unsupported saved data is preserved; the app displays a temporary demo library and a warning instead.
