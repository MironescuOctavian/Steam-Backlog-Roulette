import {createSignal,For,onCleanup,Show} from 'solid-js';
import {statuses,validateLibrary,type Game} from './library';
import {fetchSteam,mergeLibrary,parseImport} from './imports';

export function DataTools(props:{games:Game[];onApply:(games:Game[])=>boolean;readOnly:boolean}) {
  const [tab,setTab]=createSignal('custom');
  const [preview,setPreview]=createSignal<Game[]|null>(null);
  const [replace,setReplace]=createSignal(false);
  const [error,setError]=createSignal('');
  const [busy,setBusy]=createSignal(false);
  let dialog!:HTMLDialogElement;
  let controller:AbortController|undefined;
  let revision=0;
  const cancel=()=>{revision++;controller?.abort();controller=undefined;setBusy(false);setPreview(null);setError('');const key=dialog?.querySelector<HTMLInputElement>('input[name=apiKey]');if(key)key.value='';};
  onCleanup(()=>controller?.abort());
  const open=(name:string)=>{cancel();setTab(name);setReplace(false);dialog.showModal();};
  function download() {
    const blob=new Blob([JSON.stringify({version:1,games:props.games},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='steam-backlog-library.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importFile(file:File|undefined) {
    if(!file)return;
    const current=++revision;
    setError('');setPreview(null);
    try{if(file.size>5_000_000)throw new Error('File must be smaller than 5 MB.');const games=parseImport(await file.text());if(current===revision && dialog.open)setPreview(games);}
    catch(e){if(current===revision && dialog.open)setError(e instanceof Error?e.message:'Could not read the file.');}
  }
  async function steam(event:SubmitEvent) {
    event.preventDefault();if(busy())return;
    const form=event.currentTarget as HTMLFormElement;const data=new FormData(form);
    setBusy(true);setError('');setPreview(null);const request=new AbortController();controller=request;
    const timeout=setTimeout(()=>request.abort(),25000);
    try{const games=await fetchSteam(String(data.get('steamId')).trim(),String(data.get('apiKey')).trim(),data.get('proxy')==='on',props.games,request.signal);if(controller===request && dialog.open)setPreview(games);}
    catch(e){if(controller===request && dialog.open)setError(e instanceof Error?e.message:'Steam request failed.');}
    finally{clearTimeout(timeout);if(controller===request){setBusy(false);const key=form.elements.namedItem('apiKey') as HTMLInputElement|null;if(key)key.value='';}}
  }
  function custom(event:SubmitEvent) {
    event.preventDefault();setError('');const data=new FormData(event.currentTarget as HTMLFormElement);
    try {
      const game:Game={appId:Number(data.get('appId')),title:String(data.get('title')).trim(),genres:String(data.get('genres')).split(',').map(s=>s.trim()).filter(Boolean),
        playtimeHours:Number(data.get('playtime')),timeToBeatHours:Number(data.get('ttb')),metacritic:data.get('score')===''?null:Number(data.get('score')),pricePaid:Number(data.get('price')),
        status:String(data.get('status')) as Game['status'],tags:String(data.get('tags')).split(',').map(s=>s.trim()).filter(Boolean),playNext:false,metadataSource:'Custom',priceKnown:true};
      if(props.games.some(g=>g.appId===game.appId))throw new Error('This Steam App ID already exists in your library.');
      validateLibrary([game]);
      if(props.onApply([...props.games,game]))dialog.close();else setError('Could not save. The library was not changed.');
    }catch(e){setError(e instanceof Error?e.message:'Invalid game.');}
  }
  function apply() {
    const incoming=preview();if(!incoming)return;
    try{if(props.onApply(replace()?incoming:mergeLibrary(props.games,incoming)))dialog.close();else setError('Could not save. The library was not changed.');}
    catch(e){setError(e instanceof Error?e.message:'Could not apply library.');}
  }
  return <section class="data-tools" aria-label="Library data tools"><div class="tool-actions"><button disabled={props.readOnly} onClick={()=>open('custom')}>＋ Add game</button><button disabled={props.readOnly} onClick={()=>open('steam')}>Connect Steam</button><button disabled={props.readOnly} onClick={()=>open('json')}>Import JSON</button><button onClick={download}>Export JSON</button></div>
    <dialog ref={dialog} class="modal" onClose={cancel} aria-labelledby="data-title"><button class="modal-close" onClick={()=>dialog.close()} aria-label="Close library tools">✕</button><h2 id="data-title">{tab()==='custom'?'Add a game':tab()==='steam'?'Load your Steam library':'Import a library'}</h2>
      <Show when={tab()==='custom'}><form class="data-form" onSubmit={custom}>
        <label>Title<input name="title" required maxlength="300" /></label><label>Steam App ID<input name="appId" type="number" min="1" step="1" required /></label>
        <label>Genres (comma separated)<input name="genres" maxlength="500" /></label><div class="form-pair"><label>Hours played<input name="playtime" type="number" min="0" step="0.1" value="0" required /></label><label>Estimated hours to beat<input name="ttb" type="number" min="0" step="0.1" required /></label></div>
        <div class="form-pair"><label>Price paid (USD)<input name="price" type="number" min="0" step="0.01" value="0" required /></label><label>Metacritic (optional)<input name="score" type="number" min="0" max="100" step="1" /></label></div>
        <label>Status<select name="status"><For each={statuses}>{status=><option>{status}</option>}</For></select></label><label>Tags (comma separated)<input name="tags" maxlength="500" /></label><button type="submit">Add to library</button>
      </form></Show>
      <Show when={tab()==='steam'}><form class="data-form" onSubmit={steam}><p class="demo-note">Your profile and Game details must be public. Credentials are used only for this request and never saved or exported.</p><label>Steam64 ID<input name="steamId" inputmode="numeric" pattern="[0-9]{17}" required placeholder="7656119…" /></label><label>Steam Web API key<input name="apiKey" type="password" autocomplete="off" pattern="[a-fA-F0-9]{32}" required /></label><label class="checkbox-label"><input type="checkbox" name="proxy" /> Use AllOrigins public CORS proxy</label><p class="demo-note">Direct browser requests usually fail due to Steam CORS. Enabling the proxy sends your Steam ID and API key through AllOrigins. Only enable it if you trust that service. Steam does not supply prices paid, completion times, or review scores; imported estimates and unknown costs are labeled.</p><button disabled={busy()} type="submit">{busy()?'Loading…':'Fetch library preview'}</button></form></Show>
      <Show when={tab()==='json'}><div class="data-form"><p class="demo-note">Choose a JSON export or an array with the required game properties. Maximum 5 MB. Nothing changes until you apply the preview.</p><label>Library JSON file<input type="file" accept=".json,application/json" onChange={e=>void importFile(e.currentTarget.files?.[0])} /></label></div></Show>
      <Show when={preview()!==null}><div class="import-preview"><h3>{preview()?.length} validated games ready</h3><p>{preview()?.slice(0,5).map(g=>g.title).join(' · ')}{(preview()?.length??0)>5?'…':''}</p><label class="checkbox-label"><input type="checkbox" checked={replace()} onChange={e=>setReplace(e.currentTarget.checked)} /> Replace entire library instead of merging by App ID</label><p class="demo-note">{replace()?'Replacement removes games not in this preview. Export your current library first if you need a backup.':'Merge keeps other games. Matching App IDs are updated with the imported data.'}</p><button onClick={apply}>Apply {preview()?.length} games · {replace()?'Replace':'Merge'}</button></div></Show>
      <p class="storage-warning" role="alert" hidden={!error()}>{error()}</p>
    </dialog>
  </section>;
}
