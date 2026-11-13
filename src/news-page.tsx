import {useNewsFilters} from './news-navigation';
import {createEffect,createSignal,For,Show} from 'solid-js';
import {coverUrl} from './library';
import {useLibrary} from './library-state';
import {GameInsights} from './game-insights';
import {steamNewsImage} from './steam-news-image';
type Story={title:string;appId:number;url:string;date:string;summary?:string;images?:string[]};
function newsImageCandidates(story:Story){
  const list=new Set<string>();
  for(const raw of story.images??[]){const valid=steamNewsImage(raw);if(valid)list.add(valid);}
  list.add(coverUrl(story.appId));
  return [...list];
}
export default function NewsPage(){
 const {games,profile}=useLibrary();
 const {section,search}=useNewsFilters();
 const [items,setItems]=createSignal<Story[]>([]),[busy,setBusy]=createSignal(false),[error,setError]=createSignal(''),[revision,setRevision]=createSignal(0),[selected,setSelected]=createSignal(0);
 const choices=()=>profile()?games().filter(g=>g.playtimeHours>=3):[];
 const current=()=>choices().find(g=>g.appId===selected())??choices()[0];
 createEffect(()=>section()+'|'+revision(),()=>{
  setItems([]);setError('');setBusy(false);if(section()==='yours')return;
  const c=new AbortController();setBusy(true);
  void fetch('/api/news?section='+section(),{signal:c.signal}).then(async r=>{if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data)||data.some(n=>!n||typeof n.title!=='string'||!Number.isSafeInteger(n.appId)||n.appId<1||!Number.isFinite(Date.parse(n.date))||!new RegExp('^https://store\\.steampowered\\.com/news/app/'+n.appId+'/view/[0-9]+$').test(n.url)))throw Error();if(!c.signal.aborted)setItems(data);}).catch(()=>{if(!c.signal.aborted)setError('Steam news could not load. Please try again.');}).finally(()=>{if(!c.signal.aborted)setBusy(false);});return ()=>c.abort();
 });
 return <section class="discovery-page" aria-labelledby="news-title"><div class="discovery-heading"><div><p class="eyebrow">FROM AROUND STEAM</p><h1 id="news-title">News / Patches</h1><p>Featured stories, Steam announcements and updates for the games you play.</p></div></div>
 <Show when={!profile()}><p class="insight-caption">Load a Steam profile to unlock Your News for games with at least three hours played. <a href="/#main">Add a profile ↗</a></p></Show>
 <Show when={busy()}><p role="status">Loading Steam news…</p></Show><Show when={error()}><p role="status">{error()}</p><button onClick={()=>setRevision(n=>n+1)}>Retry</button></Show>
 <Show when={section()!=='yours'}><div class="news-grid news-list"><For each={items().filter(n=>(n.title+' '+(n.summary??'')).toLowerCase().includes(search().toLowerCase()))}>{n=>{const candidates=newsImageCandidates(n);return <article class="news-card"><img src={candidates[0]} alt="" loading="lazy" data-attempt="0" onError={e=>{const img=e.currentTarget,next=Number(img.dataset['attempt']??'0')+1;if(next<candidates.length){img.dataset['attempt']=String(next);img.src=candidates[next]!;}else img.hidden=true;}} /><div><time>{new Date(n.date).toLocaleDateString()}</time><h2><a href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a></h2><p>{n.summary}</p><a href={n.url} target="_blank" rel="noopener noreferrer">Read on Steam ↗</a></div></article>;}}</For></div><Show when={!busy()&&!error()&&!items().some(n=>(n.title+' '+(n.summary??'')).toLowerCase().includes(search().toLowerCase()))}><p>No stories are available right now.</p></Show></Show>
 <Show when={section()==='yours'&&profile()}><Show when={current()} fallback={<p>No games in this profile have reached three hours of playtime yet.</p>}>{game=><><div class="discovery-toolbar"><label>Choose a game<select value={game().appId} onChange={e=>setSelected(Number(e.currentTarget.value))}><For each={choices()}>{g=><option value={g.appId}>{g.title}</option>}</For></select></label><p>Games with at least three hours played</p></div><GameInsights appId={game().appId} view="updates" search={search()} /></>}</Show></Show></section>;
}
