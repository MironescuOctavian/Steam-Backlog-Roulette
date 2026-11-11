# Steam Backlog Roulette & Time-to-Beat Planner

Stage 2 of 10 (20%): responsive application shell using Solid 2, TypeScript, Rimelight UI, UnoCSS, and Vite+. Styling follows octavianmironescu.com: its exact amber primary/secondary palettes, neutral dark surfaces, soft gold glows, and fine orbital/grid decoration.

## Development

Use Node 26.10+ (required by Rimelight UI) and pnpm 12.16.1.

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm build
```

The shell deliberately labels upcoming features and disables roulette. Stage 3 adds library data and persistence; no fake statistics are displayed. Decorative artwork uses real Steam CDN headers. Fonts are served by Google Fonts with local system fallbacks.

The final delivery targets a single HTML build. The current Vite build emits normal assets until packaging in stage 10. This is an independent project, not affiliated with Valve or Steam.

## Build stages

1. Architecture and package review — complete
2. Project setup and themed shell — complete
3. Demo library and persistent storage
4. Game cards and status management
5. Search and filters
6. Analytics and value leaderboard
7. Animated roulette
8. Winner modal, audio, and confetti
9. Steam loading, custom games, JSON import/export
10. Responsive polish, verification, and single-file packaging

Progress reflects completed stages, not elapsed time. The in-app progress indicator is updated at milestones; chat progress is reported about once a minute during active work.
