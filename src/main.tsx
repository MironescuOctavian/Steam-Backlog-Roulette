import { render } from "@solidjs/web";
import { createSignal, For, onCleanup, Show } from "solid-js";
import { coverUrl, costPerHour, loadLibrary, remainingHours, saveLibrary, statuses, type Game, type SteamProfile } from "./library";
import "virtual:uno.css";
import "./styles.css";
import "./cards.css";
import { analytics, defaultFilters, filterGames, rankValue, type Filters } from "./planner";
import "./features.css";
import { Roulette } from "./roulette";
import { createRouletteSound } from "./sound";
import { DataTools } from "./data-tools";
import { ProfileLookup } from "./profile-lookup";
import { top250, catalogSource, catalogUpdatedAt } from "./catalog";

function App() {
  const storage: Pick<Storage, "getItem" | "setItem"> = {
    getItem: key => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  };
  const library = loadLibrary(storage);
  const [games, setGames] = createSignal(library.games);
  const [loaded,setLoaded]=createSignal(library.loaded);
  const [profile,setProfile]=createSignal<SteamProfile|null>(library.profile);
  const activeGames=()=>loaded()?games():top250;
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
  const filtered = () => filterGames(activeGames(), filters());
  const genres = () => [...new Set(activeGames().flatMap(g => g.genres))].sort();
  const changeFilter = (patch: Partial<Filters>) => setFilters(current => ({...current, ...patch}));
  const backlog = () => games().filter(game => game.status !== "Completed" && game.status !== "Dropped");
  const hoursLeft = () => backlog().reduce((sum, game) => sum + (remainingHours(game)??0), 0);
  function applyLibrary(next: Game[],nextProfile:SteamProfile|null=profile()): boolean {
    if (library.warning) return false;
    try {
      saveLibrary(storage, next,nextProfile);
      setGames(next);
      setProfile(nextProfile);
      setLoaded(true);
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
    return applyLibrary(games().map(game => game.appId === appId ? { ...game, ...patch, userManaged:true } : game));
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
            <a href={loaded()?"#insights":"#steam-profile"}>{loaded()?"Insights":"Profile lookup"}</a>
          </nav>
          <span class="build-badge">{loaded()?'PERSONAL LIBRARY':'TOP 250 DISCOVERY'}</span>
        </div>
      </header>

      <main id="main" class="page-wrap">
        <section class="hero" aria-labelledby="hero-title">
          <div class="hero-copy">
            <p class="eyebrow"><span class="status-dot" /> YOUR LIBRARY. YOUR NEXT ADVENTURE.</p>
            <h1 id="hero-title">Less deciding.<br /><span>More playing.</span></h1>
            <p class="hero-description">Look up any public Steam profile. We’ll pick from that library—or explore the Top 250 before loading one.</p>
            <ProfileLookup profile={profile()} games={games()} disabled={Boolean(library.warning)} onLoad={(next,p)=>{if(!applyLibrary(next,p))return false;setFilters({...defaultFilters});return true;}} />
            <Show when={library.warning}><p class="storage-warning" role="alert">{library.warning}</p></Show>
          </div>
          <aside class="feature-art" aria-label="Featured game artwork from Hades and Hollow Knight">
            <div class="orbit orbit-one" /><div class="orbit orbit-two" />
            <div class="art-card art-back"><img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/367520/header.jpg" alt="Hollow Knight" /><span>ONE MORE WORLD TO DISCOVER</span></div>
            <div class="art-card art-front"><img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1145360/header.jpg" alt="Hades" /><div class="art-caption"><span>YOUR NEXT FAVORITE?</span><span class="i-lucide-arrow-up-right" aria-hidden="true" /></div></div>
            <span class="art-label"><span class="i-lucide-sparkles" aria-hidden="true" /> GOOD GAMES DON'T EXPIRE.</span>
          </aside>
        </section>

        <DataTools games={games()} onApply={next=>{if(!applyLibrary(next,null))return false;setFilters({...defaultFilters});return true;}} readOnly={Boolean(library.warning)} />
          <section class="filter-panel" aria-label="What should I play tonight?">
            <div class="filter-heading"><h3>What should I play tonight?</h3><button onClick={() => setFilters({...defaultFilters})}>Reset filters</button></div>
            <div class="filter-fields">
              <label>{loaded()?'Search this library':'Search Top 250'}<input type="search" placeholder="Find a game…" value={filters().search} onInput={e => changeFilter({search:e.currentTarget.value})} /></label>
              <Show when={loaded()}><label>Playtime state<select value={filters().state} onChange={e => changeFilter({state:e.currentTarget.value})}><option value="backlog">All backlog</option><option value="never">Never played (0 hours)</option><option value="under2">Under 2 hours</option><option value="next">Play Next</option><option value="all">All library, including finished</option></select></label></Show>
              <label>Minimum review score: {filters().score || "Any"}<input type="range" min="0" max="100" step="5" value={filters().score} onInput={e => changeFilter({score:Number(e.currentTarget.value)})} /></label>
              <label>Maximum remaining: {filters().maxHours===200?'Any':filters().maxHours+'h'}<input type="range" min="0" max="200" step="1" value={filters().maxHours} onInput={e => changeFilter({maxHours:Number(e.currentTarget.value)})} /></label>
            </div>
            <div class="pills" aria-label="Remaining time presets"><For each={[["all","Any length"],["quick","Quick · under 10h"],["medium","Medium · 10–30h"],["epic","Epic · 50h+"]]}>{item => <button aria-pressed={filters().time === item[0] ? "true" : "false"} onClick={() => changeFilter({time:item[0]!})}>{item[1]}</button>}</For></div>
            <div class="pills" aria-label="Genres"><button aria-pressed={!filters().genre ? "true" : "false"} onClick={() => changeFilter({genre:""})}>All genres</button><For each={genres()}>{genre => <button aria-pressed={filters().genre === genre ? "true" : "false"} onClick={() => changeFilter({genre})}>{genre}</button>}</For></div>
            <p class="demo-note">Time filters exclude unknown completion times. Review score uses Steam positive reviews where available, otherwise Metacritic. <strong aria-live="polite">{filtered().length} matching games</strong></p>
          </section>
        <div id="roulette"><p class="pool-label">{loaded()?`Picking only from ${profile()?.name ? profile()!.name+"’s" : 'your loaded'} library. The Top 250 is no longer in this pool.`:'Discover from 250 top-rated games. No profile is loaded.'}</p><label class="sound-toggle"><input type="checkbox" checked={soundEnabled()} onChange={e=>setSoundEnabled(e.currentTarget.checked)} /> Roulette sound</label><For each={[loaded()?`personal:${profile()?.steamId??'local'}`:'catalog']}>{()=> <Roulette discovery={!loaded()} games={filtered()} onWinner={celebrate} onStart={()=>{if(soundEnabled())void sound.start();}} onTick={()=>{if(soundEnabled())sound.tick();}} />}</For></div>

        <Show when={loaded()}>
        <section id="insights" class="insights-section" aria-labelledby="insights-title">
          <div class="section-heading"><div><p class="eyebrow">A LITTLE PERSPECTIVE</p><h2 id="insights-title">Your backlog, at a glance.</h2></div><span class="section-note">Entire library · Updates as you play</span></div>
          <div class="kpi-grid">
            <article class="kpi"><span class="i-lucide-library kpi-icon" aria-hidden="true" /><h3>Games in backlog</h3><p>{backlog().length}<small>excludes completed and dropped</small></p></article>
            <article class="kpi"><span class="i-lucide-clock-3 kpi-icon" aria-hidden="true" /><h3>Known remaining hours</h3><p>{stats().unknownTimes===backlog().length&&backlog().length>0?'—':`~${Math.round(hoursLeft()).toLocaleString()}`}<small>{stats().unknownTimes} games have unknown completion times</small></p></article>
            <article class="kpi"><span class="i-lucide-gamepad-2 kpi-icon" aria-hidden="true" /><h3>Pile of shame</h3><p>{stats().unplayedPercent.toFixed(0)}%<small>zero hours across all games</small></p></article>
            <Show when={stats().averageCost!==null}><article class="kpi"><span class="i-lucide-chart-no-axes-combined kpi-icon" aria-hidden="true" /><h3>Average cost / hour</h3><p>${stats().averageCost?.toFixed(2)}<small>known costs · played games only</small></p></article></Show>
          </div>
          <Show when={hoursLeft()>0}><div class="session-plan"><label>My weekly gaming budget<input type="number" min="1" max="168" value={weeklyHours()} onInput={e => {const n=Number(e.currentTarget.value); if(Number.isFinite(n)&&n>=1&&n<=168)setWeeklyHours(n);}} />hours</label><p>At {weeklyHours()}h/week: approximately {Math.ceil(hoursLeft()/weeklyHours()).toLocaleString()} weeks for games with known completion estimates. {stats().unknownTimes} games excluded because time-to-beat is unknown.</p></div></Show>
          <Show when={games().some(g=>g.priceKnown!==false)}>
          <section class="leaderboard" aria-labelledby="value-title"><div class="filter-heading"><h3 id="value-title">Cost per hour · {worstValue() ? "Worst value" : "Best value"}</h3><button onClick={() => setWorstValue(!worstValue())}>Show {worstValue() ? "best" : "worst"} value</button></div>
            <p class="demo-note">Unknown purchase costs are excluded. Unplayed games have no cost/hour yet; worst value puts them first by purchase price. Best value includes played games only.</p>
            <ol><For each={rankValue(games(),worstValue()).slice(0,8)}>{(game,index) => <li><div class="rank-row"><strong>{game.title}</strong><span>{game.playtimeHours === 0 ? `$${game.pricePaid.toFixed(2)} · Unplayed` : `$${costPerHour(game)!.toFixed(2)}/h`}</span></div><div class="rank-meter" aria-hidden="true"><span style={{width:`${100-index()*10}%`}} /></div></li>}</For></ol>
            <Show when={rankValue(games(),worstValue()).length===0}><p>No played games to rank yet.</p></Show>
          </section>
          </Show>
        </section>
        </Show>

        <section id="library" class="library-section" aria-labelledby="library-title">
          <div class="section-heading"><div><p class="eyebrow">LESS COLLECTING. MORE COMPLETING.</p><h2 id="library-title">{loaded()?'Your loaded library':'Explore the Top 250'}</h2></div><span class="section-note">{activeGames().length} games · {loaded()?'Saved on this device':'Top-rated discovery'}</span></div>
          <Show when={!loaded()}><p class="demo-note">Ranking: <a href={catalogSource} target="_blank" rel="noopener noreferrer">Steam 250 ↗</a> · Snapshot {new Date(catalogUpdatedAt).toLocaleDateString()}. Based on Steam player reviews; not an official Valve ranking. These are recommendations, not games you own.</p></Show>
          <Show when={loaded()}><p class="demo-note">Playtime comes from the loaded library. Prices paid and completion times are unknown unless supplied; unknown values are excluded from planning and value calculations.</p></Show>
          <p class={["save-message", {"save-error": saveFailed()}]} role="status" aria-live="polite">{saveMessage()}</p>

          <ul class="game-grid" aria-label="Game library">
            <For each={filtered()}>{game => <li class="game-card">
              <div class="game-cover">
                <span class="cover-fallback" aria-hidden="true">{game.title}</span>
                <img src={coverUrl(game.appId)} alt="" loading="lazy" width="460" height="215" onError={event => { event.currentTarget.style.visibility = "hidden"; }} />
                <span class="score-badge">{game.steamPositivePercent!==undefined?`Steam ${game.steamPositivePercent}%`:game.metacritic!==null?`MC ${game.metacritic}`:'Score unknown'}</span>
              </div>
              <div class="game-content">
                <div class="game-title-row"><h3>{game.title}</h3><Show when={loaded()}><span class="value-badge">{game.priceKnown===false ? "Cost unknown" : costPerHour(game) === null ? "Unplayed" : `$${costPerHour(game)!.toFixed(2)}/h`}</span></Show></div>
                <p class="game-genres">{game.genres.join(" · ")}</p>
                <Show when={loaded()}>
                <div class="game-hours"><span>{game.playtimeHours}h played</span><span>{game.timeToBeatHours===null?'Completion time unknown':`~${game.timeToBeatHours}h to beat`}</span></div>
                <Show when={game.timeToBeatHours!==null}><progress class="game-progress" aria-label={`${game.title}: playtime relative to estimated completion time, not actual completion`} max={Math.max(1, game.timeToBeatHours??1)} value={Math.min(game.playtimeHours, Math.max(1, game.timeToBeatHours??1))} /></Show>
                <p class="remaining-note">{game.status === "Completed" ? "Completed" : game.status === "Dropped" ? "Dropped · excluded from plan" : remainingHours(game)===null?'Remaining time unknown':`~${Number(remainingHours(game)?.toFixed(1))}h remaining (estimate)`}</p>
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
                </Show>
                <Show when={!loaded()}><p class="catalog-rank">#{game.rank} in Steam 250</p></Show>
                <a class="game-store" href={`https://store.steampowered.com/app/${game.appId}/`} target="_blank" rel="noopener noreferrer">View on Steam ↗</a>
                <p class="metadata-label">{game.metadataSource}</p>
              </div>
            </li>}</For>
          </ul>
          <Show when={activeGames().length > 0 && filtered().length === 0}><div class="library-empty"><h3>No games match these filters.</h3><button onClick={() => setFilters({...defaultFilters})}>Reset filters</button></div></Show>
          <Show when={loaded()&&games().length === 0}><div class="library-empty"><h3>This library is empty.</h3><p>There are no games to spin. Look up another profile or import a library.</p></div></Show>
        </section>
      </main>
      <dialog class="modal winner-modal" ref={winnerDialog} onClose={()=>setWinner(null)} aria-labelledby="winner-title">
        <button class="modal-close" autofocus onClick={()=>winnerDialog.close()} aria-label="Close winner spotlight">✕</button>
        <Show when={winnerGame()}><div>
          <p class="eyebrow">FATE HAS EXCELLENT TASTE</p><h2 id="winner-title">{winnerGame()?.title}</h2>
          <img class="winner-cover" src={coverUrl(winnerGame()?.appId ?? 0)} alt={winnerGame()?.title ?? ""} onError={e=>{e.currentTarget.style.display='none';}} />
          <p class="demo-note">{winnerGame()?.genres.join(' · ')} · {winnerGame()?.metadataSource}</p>
          <dl class="winner-stats"><Show when={loaded()}><div><dt>Played</dt><dd>{winnerGame()?.playtimeHours}h</dd></div></Show><div><dt>Completion time</dt><dd>{winnerGame()?.timeToBeatHours==null?'Unknown':`~${winnerGame()?.timeToBeatHours}h`}</dd></div><div><dt>Reviews</dt><dd>{winnerGame()?.steamPositivePercent!==undefined?`${winnerGame()?.steamPositivePercent}% positive`:winnerGame()?.metacritic??'Unknown'}</dd></div><Show when={loaded()}><div><dt>Status</dt><dd>{winnerGame()?.status}</dd></div></Show></dl>
          <div class="tool-actions"><Show when={loaded()}><a href={`steam://run/${winnerGame()?.appId}`}>Launch in Steam ↗</a></Show><a href={`https://store.steampowered.com/app/${winnerGame()?.appId}/`} target="_blank" rel="noopener noreferrer">Store page ↗</a><Show when={loaded()}><button disabled={Boolean(library.warning) || winnerGame()?.status==='Playing'} onClick={()=>{const game=winnerGame();if(game)updateGame(game.appId,{status:'Playing'});}}>Mark currently playing</button></Show></div>
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
