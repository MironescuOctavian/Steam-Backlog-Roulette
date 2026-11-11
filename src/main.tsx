import { render } from "@solidjs/web";
import { createSignal, For, onCleanup, Show } from "solid-js";
import { coverUrl, costPerHour, loadLibrary, remainingHours, saveLibrary, statuses, type Game } from "./library";
import { RLButton } from "@rimelight/ui/components/button/RLButton.tsx";
import "virtual:uno.css";
import "./styles.css";
import "./cards.css";
import { analytics, defaultFilters, filterGames, rankValue, type Filters } from "./planner";
import "./features.css";
import { Roulette } from "./roulette";
import { createRouletteSound } from "./sound";
import { DataTools } from "./data-tools";

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
  const [worstValue, setWorstValue] = createSignal(false);
  const [weeklyHours, setWeeklyHours] = createSignal(5);
  const [winner, setWinner] = createSignal<Game | null>(null);
  const [soundEnabled,setSoundEnabled] = createSignal(true);
  const sound=createRouletteSound();
  let winnerDialog!: HTMLDialogElement;
  const winnerGame=()=>games().find(g=>g.appId===winner()?.appId) ?? winner();
  function celebrate(game: Game) {
    setWinner(game);
    if(soundEnabled())sound.win();
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)window.confetti?.({particleCount:100,spread:70,origin:{y:.65},colors:['#ffbf00','#ffdd70','#eeeeee'],disableForReducedMotion:true});
    requestAnimationFrame(()=>{if(!winnerDialog.open)winnerDialog.showModal();});
  }
  onCleanup(()=>sound.close());
  const stats = () => analytics(games());
  const filtered = () => filterGames(games(), filters());
  const genres = () => [...new Set(games().flatMap(g => g.genres))].sort();
  const changeFilter = (patch: Partial<Filters>) => setFilters({...filters(), ...patch});
  const backlog = () => games().filter(game => game.status !== "Completed" && game.status !== "Dropped");
  const hoursLeft = () => backlog().reduce((sum, game) => sum + remainingHours(game), 0);
  function applyLibrary(next: Game[]): boolean {
    if (library.warning) return false;
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
  function updateGame(appId: number, patch: Partial<Pick<Game, "status" | "playNext" | "tags">>): boolean {
    return applyLibrary(games().map(game => game.appId === appId ? { ...game, ...patch } : game));
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
        <div class="project-progress"><label for="project-progress">Project progress</label><progress id="project-progress" max="10" value="9">90%</progress><span>9 of 10 stages complete · 90%</span></div>
        <section class="hero" aria-labelledby="hero-title">
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

        <div id="roulette"><label class="sound-toggle"><input type="checkbox" checked={soundEnabled()} onChange={e=>setSoundEnabled(e.currentTarget.checked)} /> Roulette sound</label><Roulette games={filtered()} onWinner={celebrate} onStart={()=>{if(soundEnabled())void sound.start();}} onTick={()=>{if(soundEnabled())sound.tick();}} /></div>

        <section id="insights" class="insights-section" aria-labelledby="insights-title">
          <div class="section-heading"><div><p class="eyebrow">A LITTLE PERSPECTIVE</p><h2 id="insights-title">Your backlog, at a glance.</h2></div><span class="section-note">Entire library · Updates as you play</span></div>
          <div class="kpi-grid">
            <article class="kpi"><span class="i-lucide-library kpi-icon" aria-hidden="true" /><h3>Games in backlog</h3><p>{backlog().length}<small>excludes completed and dropped</small></p></article>
            <article class="kpi"><span class="i-lucide-clock-3 kpi-icon" aria-hidden="true" /><h3>Hours to clear</h3><p>~{Math.round(hoursLeft()).toLocaleString()}<small>estimated remaining hours</small></p></article>
            <article class="kpi"><span class="i-lucide-gamepad-2 kpi-icon" aria-hidden="true" /><h3>Pile of shame</h3><p>{stats().unplayedPercent.toFixed(0)}%<small>zero hours across all games</small></p></article>
            <article class="kpi"><span class="i-lucide-chart-no-axes-combined kpi-icon" aria-hidden="true" /><h3>Average cost / hour</h3><p>{stats().averageCost === null ? "—" : `$${stats().averageCost!.toFixed(2)}`}<small>mean $/hour · played games only</small></p></article>
          </div>
          <div class="session-plan"><label>My weekly gaming budget<input type="number" min="1" max="168" value={weeklyHours()} onInput={e => {const n=Number(e.currentTarget.value); if(Number.isFinite(n)&&n>=1&&n<=168)setWeeklyHours(n);}} />hours</label><p>At {weeklyHours()}h/week: approximately {Math.ceil(hoursLeft()/weeklyHours()).toLocaleString()} weeks to clear your current backlog. Estimates assume playtime counts toward the main story.</p></div>
          <section class="leaderboard" aria-labelledby="value-title"><div class="filter-heading"><h3 id="value-title">Cost per hour · {worstValue() ? "Worst value" : "Best value"}</h3><button onClick={() => setWorstValue(!worstValue())}>Show {worstValue() ? "best" : "worst"} value</button></div>
            <p class="demo-note">Unplayed games have no cost/hour yet. Worst value puts these first by purchase price; best value includes played games only.</p>
            <ol><For each={rankValue(games(),worstValue()).slice(0,8)}>{(game,index) => <li><div class="rank-row"><strong>{game.title}</strong><span>{game.playtimeHours === 0 ? `$${game.pricePaid.toFixed(2)} · Unplayed` : `$${costPerHour(game)!.toFixed(2)}/h`}</span></div><div class="rank-meter" aria-hidden="true"><span style={{width:`${100-index()*10}%`}} /></div></li>}</For></ol>
            <Show when={rankValue(games(),worstValue()).length===0}><p>No played games to rank yet.</p></Show>
          </section>
        </section>

        <section id="library" class="library-section" aria-labelledby="library-title">
          <div class="section-heading"><div><p class="eyebrow">LESS COLLECTING. MORE COMPLETING.</p><h2 id="library-title">Your next great game lives here.</h2></div><span class="section-note">{games().length} games · Browser-local library</span></div>
          <Show when={library.warning}><p class="storage-warning" role="alert">{library.warning}</p></Show>
          <p class="demo-note">Demo prices (USD), playtime, review scores, and completion times are illustrative. Time-to-beat is an estimate, not a session length. Sandbox and replayable games have no fixed finish line.</p>
          <p class={["save-message", {"save-error": saveFailed()}]} role="status" aria-live="polite">{saveMessage()}</p>
          <DataTools games={games()} onApply={applyLibrary} readOnly={Boolean(library.warning)} />
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
                <span class="score-badge" title={`${game.metadataSource}: Metacritic score`}>MC {game.metacritic ?? "—"}</span>
              </div>
              <div class="game-content">
                <div class="game-title-row"><h3>{game.title}</h3><span class="value-badge">{game.priceKnown===false ? "Cost unknown" : costPerHour(game) === null ? "Unplayed" : `$${costPerHour(game)!.toFixed(2)}/h`}</span></div>
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
                <label class="tag-label">Tags · comma separated<input value={game.tags.join(', ')} maxlength="500" placeholder="weekend, cozy…" disabled={Boolean(library.warning)} aria-label={`Tags for ${game.title}`} onBlur={e=>{const input=e.currentTarget;const tags=input.value.split(',').map(s=>s.trim()).filter(Boolean);if(!updateGame(game.appId,{tags}))input.value=game.tags.join(', ');}} /></label>
                <p class="metadata-label">{game.metadataSource}</p>
              </div>
            </li>}</For>
          </ul>
          <Show when={games().length > 0 && filtered().length === 0}><div class="library-empty"><h3>No games match these filters.</h3><button onClick={() => setFilters({...defaultFilters})}>Reset filters</button></div></Show>
          <Show when={games().length === 0}><div class="library-empty"><h3>Your library is empty.</h3><p>No games have been saved.</p></div></Show>
        </section>
      </main>
      <dialog class="modal winner-modal" ref={winnerDialog} onClose={()=>setWinner(null)} aria-labelledby="winner-title">
        <button class="modal-close" autofocus onClick={()=>winnerDialog.close()} aria-label="Close winner spotlight">✕</button>
        <Show when={winnerGame()}><div>
          <p class="eyebrow">FATE HAS EXCELLENT TASTE</p><h2 id="winner-title">{winnerGame()?.title}</h2>
          <img class="winner-cover" src={coverUrl(winnerGame()?.appId ?? 0)} alt={winnerGame()?.title ?? ""} onError={e=>{e.currentTarget.style.display='none';}} />
          <p class="demo-note">{winnerGame()?.genres.join(' · ')} · {winnerGame()?.metadataSource}</p>
          <dl class="winner-stats"><div><dt>Played</dt><dd>{winnerGame()?.playtimeHours}h</dd></div><div><dt>Estimated to beat</dt><dd>~{winnerGame()?.timeToBeatHours}h</dd></div><div><dt>Metacritic</dt><dd>{winnerGame()?.metacritic ?? 'Unknown'}</dd></div><div><dt>Status</dt><dd>{winnerGame()?.status}</dd></div></dl>
          <div class="tool-actions"><a href={`steam://run/${winnerGame()?.appId}`}>Launch in Steam ↗</a><a href={`https://store.steampowered.com/app/${winnerGame()?.appId}/`} target="_blank" rel="noopener noreferrer">Store page ↗</a><button disabled={Boolean(library.warning) || winnerGame()?.status==='Playing'} onClick={()=>{const game=winnerGame();if(game)updateGame(game.appId,{status:'Playing'});}}>Mark currently playing</button></div>
          <p class="demo-note">Launching requires the Steam desktop app. Completion times are estimates.</p>
          <p role="status">{saveMessage()}</p>
        </div></Show>
      </dialog>
      <footer class="page-wrap site-footer"><span>BACKLOG / ROULETTE <span class="footer-divider">·</span> Make time for play.</span><span>Independent project. Not affiliated with Valve or Steam.</span></footer>
    </>
  );
}

const root = document.getElementById("app");
if (!root) throw new Error("Application root is missing");
render(() => <App />, root);
