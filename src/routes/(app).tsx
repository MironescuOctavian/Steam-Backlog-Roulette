import type {RouteSectionProps} from '@solidjs/router';
import {useHref,useLocation} from '@solidjs/router';
import {LibraryProvider,useLibrary} from '../library-state';
import {createEffect} from 'solid-js';

function AppShell(props:RouteSectionProps){
  const {loaded}=useLibrary();const location=useLocation();
  createEffect(()=>location.pathname,pathname=>{document.title=pathname.startsWith('/activity')?'Steam pulse · Backlog Roulette':'Steam Backlog Roulette & Time-to-Beat Planner';});
  const home=useHref(()=>'/#main');const roulette=useHref(()=>'/#roulette');const library=useHref(()=>'/#library');const activity=useHref(()=>'/activity');
  return <><a class="skip-link" href={home()}>Skip to content</a><header class="site-header"><div class="header-inner flex items-center justify-between gap-4"><a class="brand flex items-center gap-3" href={home()} aria-label="Backlog Roulette home"><span class="brand-icon i-lucide-shuffle" aria-hidden="true" /><span>BACKLOG<span class="brand-light"> / ROULETTE</span><small>LESS SCROLLING. MORE PLAYING.</small></span></a><nav class="flex items-center gap-6" aria-label="Main navigation"><a href={home()} class={location.pathname==='/'?'nav-active':''}>Backlog</a><a href={roulette()}>Roulette</a><a href={library()}>Library</a><a href={activity()} class={location.pathname==='/activity'?'nav-active':''}>Steam pulse</a></nav><span class="build-badge">{location.pathname==='/activity'?'STEAM ACTIVITY':loaded()?'PERSONAL LIBRARY':'TOP 250 DISCOVERY'}</span></div></header><main id="main" class="page-wrap">{props.children}</main><footer class="page-wrap site-footer"><span>BACKLOG / ROULETTE <span class="footer-divider">·</span> Make time for play.</span><span>Independent project. Not affiliated with Valve or Steam.</span></footer></>;
}
export default function AppLayout(props:RouteSectionProps){return <LibraryProvider><AppShell {...props} /></LibraryProvider>;}
