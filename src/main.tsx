import { render } from "@solidjs/web";
import { createSignal, For, Show } from "solid-js";
import { coverUrl, costPerHour, loadLibrary, remainingHours, saveLibrary, statuses, type Game } from "./library";
import { RLButton } from "@rimelight/ui/components/button/RLButton.tsx";
import "virtual:uno.css";
import "./styles.css";
import "./cards.css";
import { defaultFilters, filterGames, type Filters } from "./planner";
import "./features.css";

function App() {
  const storage: Pick<Storage, "getItem" | "setItem"> = {
    getItem: key => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  };
  const library = loadLibrary(storage);
  const [games, setGames] = createSignal(library.games);
  const [saveMessage, setSaveMessage] = createSignal("");
  const [saveFailed, setSaveFailed] = createSignal(false);
  const [filters, setFilters] = createSignal<Filters>({...defaultFilters});
  const filtered = () => filterGames(games(), filters());
  const genres = () => [...new Set(games().flatMap(g => g.genres))].sort();
  const changeFilter = (patch: Partial<Filters>) => setFilters({...filters(), ...patch});
  const backlog = () => games().filter(game => game.status !== "Completed" && game.status !== "Dropped");
  const hoursLeft = () => backlog().reduce((sum, game) => sum + remainingHours(game), 0);
  function updateGame(appId: number, patch: Partial<Pick<Game, "status" | "playNext">>): boolean {
    if (library.warning) return false;
    const next = games().map(game => game.appId === appId ? { ...game, ...patch } : game);
    try {
      saveLibrary(storage, next);
      setGames(next);
      setSaveFailed(false);
      setSaveMessage("Library saved on this device.");
      return true;
    } catch {
      setSaveFailed(true);
      setSaveMessage("Could not save this change. Your previous library is unchanged. Check browser storage and try again.");
      return false;
    }
  }
  return (
    <>
      <a class="skip-link" href="#main">Skip to content</a>
      <header class="site-header">
        <div class="header-inner flex items-center justify-between gap-4">
          <a class="brand flex items-center gap-3" href="#main" aria-label="Backlog Roulette home">
            <span class="brand-icon i-lucide-shuffle" aria-hidden="true" />
            <span>BACKLOG<span class="brand-light"> / ROULETTE</span><small>LESS SCROLLING. MORE PLAYING.</small></span>
          </a>
          <nav class="flex items-center gap-6" aria-label="Main navigation">
            <a href="#roulette" class="nav-active">Roulette</a>
            <a href="#library">Library</a>
            <a href="#insights">Insights</a>
          </nav>
          <span class="build-badge">LOCAL LIBRARY</span>
        </div>
      </header>

      <main id="main" class="page-wrap">
        <div class="project-progress"><label for="project-progress">Project progress</label><progress id="project-progress" max="10" value="5">50%</progress><span>5 of 10 stages complete · 50%</span></div>
        <section id="roulette" class="hero" aria-labelledby="hero-title">
          <div class="hero-copy">
            <p class="eyebrow"><span class="status-dot" /> YOUR NEXT ADVENTURE IS ALREADY IN YOUR LIBRARY</p>
            <h1 id="hero-title">Great games.<br />Unplayed stories.<br /><span>Let fate pick one.</span></h1>
            <p class="hero-description">Stop staring at your backlog. Find something that fits your mood, your time, and tonight.</p>
            <div class="hero-actions flex flex-wrap items-center gap-4">
              <RLButton label="Explore your command center" href="#library" class="explore-button" />
              <span class="local-note">Browser-local. No account needed.</span>
            </div>
          </div>
          <aside class="feature-art" aria-label="Featured game artwork from Hades and Hollow Knight">
            <div class="orbit orbit-one" /><div class="orbit orbit-two" />
            <div class="art-card art-back"><img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/367520/header.jpg" alt="Hollow Knight" /><span>ONE MORE WORLD TO DISCOVER</span></div>
            <div class="art-card art-front"><img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1145360/header.jpg" alt="Hades" /><div class="art-caption"><span>YOUR NEXT FAVORITE?</span><span class="i-lucide-arrow-up-right" aria-hidden="true" /></div></div>
            <span class="art-label"><span class="i-lucide-sparkles" aria-hidden="true" /> GOOD GAMES DON'T EXPIRE.</span>
          </aside>
        </section>

        <section class="roulette-panel" aria-labelledby="spin-title">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div><p class="eyebrow">THE DECISION-FREE ZONE</p><h2 id="spin-title">Leave your next game to chance.</h2></div>
            <span class="coming-label">ROULETTE ARRIVES IN STAGE 07</span>
          </div>
          <div class="reel-preview" aria-hidden="true"><span>?</span><span>?</span><span class="selected-slot"><i class="i-lucide-shuffle" /></span><span>?</span><span>?</span></div>
          <div class="reel-footer"><span><i class="i-lucide-clock-3" aria-hidden="true" /> Your time. Your filters. A little fate.</span><button class="spin-button" disabled>SPIN THE ROULETTE <span class="i-lucide-shuffle" aria-hidden="true" /></button></div>
        </section>

        <section id="insights" class="insights-section" aria-labelledby="insights-title">
          <div class="section-heading"><div><p class="eyebrow">A LITTLE PERSPECTIVE</p><h2 id="insights-title">Your backlog, at a glance.</h2></div><span class="section-note">Analytics arrive in stage 06</span></div>
          <div class="kpi-grid">
            <article class="kpi"><span class="i-lucide-library kpi-icon" aria-hidden="true" /><h3>Games in backlog</h3><p>{backlog().length}<small>excludes completed and dropped</small></p></article>
            <article class="kpi"><span class="i-lucide-clock-3 kpi-icon" aria-hidden="true" /><h3>Hours to clear</h3><p>~{Math.round(hoursLeft()).toLocaleString()}<small>estimated remaining hours</small></p></article>
            <article class="kpi"><span class="i-lucide-gamepad-2 kpi-icon" aria-hidden="true" /><h3>Pile of shame</h3><p>—<small>haven't hit play yet</small></p></article>
            <article class="kpi"><span class="i-lucide-chart-no-axes-combined kpi-icon" aria-hidden="true" /><h3>Average cost / hour</h3><p>—<small>every hour counts</small></p></article>
          </div>
        </section>

        <section id="library" class="library-section" aria-labelledby="library-title">
          <div class="section-heading"><div><p class="eyebrow">LESS COLLECTING. MORE COMPLETING.</p><h2 id="library-title">Your next great game lives here.</h2></div><span class="section-note">{games().length} games · Browser-local library</span></div>
          <Show when={library.warning}><p class="storage-warning" role="alert">{library.warning}</p></Show>
          <p class="demo-note">Demo prices (USD), playtime, review scores, and completion times are illustrative. Time-to-beat is an estimate, not a session length. Sandbox and replayable games have no fixed finish line.</p>
          <p class={["save-message", {"save-error": saveFailed()}]} role="status" aria-live="polite">{saveMessage()}</p>
          <section class="filter-panel" aria-label="What should I play tonight?">
            <div class="filter-heading"><h3>What should I play tonight?</h3><button onClick={() => setFilters({...defaultFilters})}>Reset filters</button></div>
            <div class="filter-fields">
              <label>Search your library<input type="search" placeholder="Find a game…" value={filters().search} onInput={e => changeFilter({search:e.currentTarget.value})} /></label>
              <label>Playtime state<select value={filters().state} onChange={e => changeFilter({state:e.currentTarget.value})}><option value="backlog">All backlog</option><option value="never">Never played (0 hours)</option><option value="under2">Under 2 hours</option><option value="next">Play Next</option><option value="all">All library, including finished</option></select></label>
              <label>Minimum Metacritic: {filters().score || "Any"}<input type="range" min="0" max="100" step="5" value={filters().score} onInput={e => changeFilter({score:Number(e.currentTarget.value)})} /></label>
              <label>Maximum remaining: {filters().maxHours}h<input type="range" min="0" max="200" step="1" value={filters().maxHours} onInput={e => changeFilter({maxHours:Number(e.currentTarget.value)})} /></label>
            </div>
            <div class="pills" aria-label="Remaining time presets"><For each={[["all","Any length"],["quick","Quick · under 10h"],["medium","Medium · 10–30h"],["epic","Epic · 50h+"]]}>{item => <button aria-pressed={filters().time === item[0] ? "true" : "false"} onClick={() => changeFilter({time:item[0]!})}>{item[1]}</button>}</For></div>
            <div class="pills" aria-label="Genres"><button aria-pressed={!filters().genre ? "true" : "false"} onClick={() => changeFilter({genre:""})}>All genres</button><For each={genres()}>{genre => <button aria-pressed={filters().genre === genre ? "true" : "false"} onClick={() => changeFilter({genre})}>{genre}</button>}</For></div>
            <p class="demo-note">Filter by estimated hours remaining, not the length of a single session. <strong aria-live="polite">{filtered().length} matching games</strong></p>
          </section>
          <ul class="game-grid" aria-label="Game library">
            <For each={filtered()}>{game => <li class="game-card">
              <div class="game-cover">
                <span class="cover-fallback" aria-hidden="true">{game.title}</span>
                <img src={coverUrl(game.appId)} alt="" loading="lazy" width="460" height="215" onError={event => { event.currentTarget.style.visibility = "hidden"; }} />
                <span class="score-badge" title="Illustrative Metacritic score">MC {game.metacritic ?? "—"}</span>
              </div>
              <div class="game-content">
                <div class="game-title-row"><h3>{game.title}</h3><span class="value-badge">{costPerHour(game) === null ? "Unplayed" : `$${costPerHour(game)!.toFixed(2)}/h`}</span></div>
                <p class="game-genres">{game.genres.join(" · ")}</p>
                <div class="game-hours"><span>{game.playtimeHours}h played</span><span>~{game.timeToBeatHours}h to beat</span></div>
                <progress class="game-progress" aria-label={`${game.title}: playtime relative to estimated completion time, not actual completion`} max={Math.max(1, game.timeToBeatHours)} value={Math.min(game.playtimeHours, Math.max(1, game.timeToBeatHours))} />
                <p class="remaining-note">{game.status === "Completed" ? "Completed" : game.status === "Dropped" ? "Dropped · excluded from plan" : `~${Number(remainingHours(game).toFixed(1))}h remaining (estimate)`}</p>
                <div class="game-controls">
                  <label class="status-label">Status
                    <select value={game.status} disabled={Boolean(library.warning)} onChange={event => {
                      const select = event.currentTarget;
                      if (!updateGame(game.appId, { status: select.value as Game["status"] })) select.value = game.status;
                    }} aria-label={`Status for ${game.title}`}>
                      <For each={statuses}>{status => <option value={status}>{status}</option>}</For>
                    </select>
                  </label>
                  <button type="button" class={["play-next", {"is-next": game.playNext}]} aria-pressed={game.playNext ? "true" : "false"} aria-label={`Play next: ${game.title}`} disabled={Boolean(library.warning)} onClick={() => updateGame(game.appId, { playNext: !game.playNext })}>{game.playNext ? "✓ Play Next" : "+ Play Next"}</button>
                </div>
              </div>
            </li>}</For>
          </ul>
          <Show when={games().length > 0 && filtered().length === 0}><div class="library-empty"><h3>No games match these filters.</h3><button onClick={() => setFilters({...defaultFilters})}>Reset filters</button></div></Show>
          <Show when={games().length === 0}><div class="library-empty"><h3>Your library is empty.</h3><p>No games have been saved.</p></div></Show>
        </section>
      </main>
      <footer class="page-wrap site-footer"><span>BACKLOG / ROULETTE <span class="footer-divider">·</span> Make time for play.</span><span>Independent project. Not affiliated with Valve or Steam.</span></footer>
    </>
  );
}

const root = document.getElementById("app");
if (!root) throw new Error("Application root is missing");
render(() => <App />, root);
