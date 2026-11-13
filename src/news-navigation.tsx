import {useSearchParams} from '@solidjs/router';
import {For} from 'solid-js';
import {useLibrary} from './library-state';
export function useNewsFilters(){
 const [params,setParams]=useSearchParams();
 const {profile}=useLibrary();
 return {section:()=>params['section']==='official'?'official':params['section']==='yours'&&profile()?'yours':'featured',search:()=>String(params['q']??'').slice(0,300),setParams,profile};
}
export function NewsSidebar(){
 const {section,search,setParams,profile}=useNewsFilters();
 return <div class="news-sidebar"><p class="eyebrow">NEWS / PATCHES</p><nav aria-label="News sections"><For each={[['featured','Featured','i-lucide-star'],['official','Steam Official','i-lucide-megaphone'],['yours','Your News','i-lucide-library']]}>{entry=><button disabled={entry[0]==='yours'&&!profile()} class={section()===entry[0]?'sidebar-active':''} aria-current={section()===entry[0]?'page':undefined} onClick={()=>setParams({section:entry[0]!,q:undefined})}><span class={entry[2]} aria-hidden="true" />{entry[1]}{entry[0]==='yours'&&!profile()?' · Locked':''}</button>}</For></nav><label class="news-search">Search news<input type="search" maxlength="300" value={search()} onInput={e=>setParams({q:e.currentTarget.value||undefined},{replace:true,scroll:false})} placeholder="Search stories…" /></label></div>;
}
