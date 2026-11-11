import { render } from "@solidjs/web";
import { RLButton } from "@rimelight/ui/components/button/RLButton.tsx";
import "virtual:uno.css";
import "./styles.css";

function App() {
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
          <span class="build-badge">STAGE 02 <span aria-hidden="true">/</span> 10</span>
        </div>
      </header>

      <main id="main" class="page-wrap">
        <div class="project-progress"><label for="project-progress">Project progress</label><progress id="project-progress" max="10" value="2">20%</progress><span>2 of 10 stages complete · 20%</span></div>
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
            <article class="kpi"><span class="i-lucide-library kpi-icon" aria-hidden="true" /><h3>Games in backlog</h3><p>—<small>games waiting for you</small></p></article>
            <article class="kpi"><span class="i-lucide-clock-3 kpi-icon" aria-hidden="true" /><h3>Hours to clear</h3><p>—<small>adventures ahead</small></p></article>
            <article class="kpi"><span class="i-lucide-gamepad-2 kpi-icon" aria-hidden="true" /><h3>Pile of shame</h3><p>—<small>haven't hit play yet</small></p></article>
            <article class="kpi"><span class="i-lucide-chart-no-axes-combined kpi-icon" aria-hidden="true" /><h3>Average cost / hour</h3><p>—<small>every hour counts</small></p></article>
          </div>
        </section>

        <section id="library" class="library-section" aria-labelledby="library-title">
          <div class="section-heading"><div><p class="eyebrow">LESS COLLECTING. MORE COMPLETING.</p><h2 id="library-title">Your next great game lives here.</h2></div><span class="section-note">Library arrives in stage 03</span></div>
          <div class="library-empty"><span class="i-lucide-library" aria-hidden="true" /><h3>A fresh start for your backlog.</h3><p>The next stage brings a rich demo library.<br />Your own Steam library and JSON imports follow in stage 09.</p></div>
        </section>
      </main>
      <footer class="page-wrap site-footer"><span>BACKLOG / ROULETTE <span class="footer-divider">·</span> Make time for play.</span><span>Independent project. Not affiliated with Valve or Steam.</span></footer>
    </>
  );
}

const root = document.getElementById("app");
if (!root) throw new Error("Application root is missing");
render(() => <App />, root);
