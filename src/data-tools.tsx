import {createSignal,For,onCleanup,Show} from 'solid-js';
import {statuses,validateLibrary,type Game} from './library';
import {mergeLibrary,parseImport} from './imports';

export function DataTools(props:{games:Game[];onApply:(games:Game[])=>boolean;readOnly:boolean;canUndo:boolean;onUndo:()=>void;onReady?:(openTab:(tab:'custom'|'json')=>void)=>void}) {
  const [tab,setTab]=createSignal('custom');
  const [preview,setPreview]=createSignal<Game[]|null>(null);
  const [replace,setReplace]=createSignal(false);
  const [error,setError]=createSignal('');
  let dialog!:HTMLDialogElement;
  let tools!:HTMLDetailsElement;
  const closeMenu=()=>{tools.open=false;tools.querySelector<HTMLElement>('summary')?.focus({preventScroll:true});};
  let revision=0;
  const cancel=()=>{revision++;setPreview(null);setError('');};
  onCleanup(()=>{revision++;});
  const open=(name:string)=>{cancel();closeMenu();setTab(name);setReplace(false);const input=dialog.querySelector<HTMLInputElement>('input[type=file]');if(input)input.value='';dialog.showModal();};
  props.onReady?.(open);
  function download() {
    closeMenu();
    const blob=new Blob([JSON.stringify({version:1,games:props.games},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='steamnext-library.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importFile(file:File|undefined) {
    if(!file)return;
    const current=++revision;
    setError('');setPreview(null);
    try{if(file.size>5_000_000)throw new Error('File must be smaller than 5 MB.');const games=parseImport(await file.text());if(current===revision && dialog.open)setPreview(games);}
    catch(e){if(current===revision && dialog.open)setError(e instanceof Error?e.message:'Could not read the file.');}
  }
  function custom(event:SubmitEvent) {
    event.preventDefault();setError('');const data=new FormData(event.currentTarget as HTMLFormElement);
    try {
      const game:Game={appId:Number(data.get('appId')),title:String(data.get('title')).trim(),genres:String(data.get('genres')).split(',').map(s=>s.trim()).filter(Boolean),
        playtimeHours:Number(data.get('playtime')),timeToBeatHours:data.get('ttb')===''?null:Number(data.get('ttb')),metacritic:data.get('score')===''?null:Number(data.get('score')),pricePaid:Number(data.get('price')),
        status:String(data.get('status')) as Game['status'],tags:String(data.get('tags')).split(',').map(s=>s.trim()).filter(Boolean),playNext:false,metadataSource:'Custom',priceKnown:data.get('price')!==''};
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
  return <section class="data-tools" aria-label="Library data tools"><details ref={tools} class="library-tools-menu"><summary><span class="i-lucide-settings-2" aria-hidden="true" />Library tools</summary><div class="tool-actions"><button disabled={props.readOnly} onClick={()=>open('custom')}>＋ Add game</button><button disabled={props.readOnly} onClick={()=>open('json')}>Import JSON library</button><button disabled={props.games.length===0} onClick={download}>Export library JSON</button><Show when={props.canUndo}><button disabled={props.readOnly} onClick={()=>{closeMenu();props.onUndo();}}>Undo last change</button></Show></div></details>
    <dialog ref={dialog} class="modal" onClose={cancel} aria-labelledby="data-title"><button class="modal-close" onClick={()=>dialog.close()} aria-label="Close library tools">✕</button><h2 id="data-title">{tab()==='custom'?'Add a game':'Import a library'}</h2>
      <Show when={tab()==='custom'}><form class="data-form" onSubmit={custom}>
        <label>Title<input name="title" required maxlength="300" /></label><label>Steam App ID<input name="appId" type="number" min="1" step="1" required /></label>
        <label>Genres (comma separated)<input name="genres" maxlength="500" /></label><div class="form-pair"><label>Hours played<input name="playtime" type="number" min="0" step="0.1" value="0" required /></label><label>Estimated hours to beat (optional)<input name="ttb" type="number" min="0" step="0.1" placeholder="Unknown" /></label></div>
        <div class="form-pair"><label>Price paid (USD, optional)<input name="price" type="number" min="0" step="0.01" placeholder="Unknown" /></label><label>Metacritic (optional)<input name="score" type="number" min="0" max="100" step="1" /></label></div>
        <label>Status<select name="status"><For each={statuses}>{status=><option>{status}</option>}</For></select></label><label>Tags (comma separated)<input name="tags" maxlength="500" /></label><button type="submit">Add to library</button>
      </form></Show>
      <Show when={tab()==='json'}><div class="data-form"><p class="demo-note">Choose a JSON export or an array with the required game properties. Maximum 5 MB. Nothing changes until you apply the preview.</p><label>Library JSON file<input type="file" accept=".json,application/json" onChange={e=>void importFile(e.currentTarget.files?.[0])} /></label></div></Show>
      <Show when={preview()!==null}><div class="import-preview"><h3>{preview()?.length} validated games ready</h3><p>{preview()?.slice(0,5).map(g=>g.title).join(' · ')}{(preview()?.length??0)>5?'…':''}</p><label class="checkbox-label"><input type="checkbox" checked={replace()} onChange={e=>setReplace(e.currentTarget.checked)} /> Replace entire library instead of merging by App ID</label><p class="demo-note">{replace()?'Replacement removes games not in this preview. Export your current library first if you need a backup.':'Merge keeps other games. Matching App IDs are updated with the imported data.'}</p><button onClick={apply}>Apply {preview()?.length} games · {replace()?'Replace':'Merge'}</button></div></Show>
      <p class="storage-warning" role="alert" hidden={!error()}>{error()}</p>
    </dialog>
  </section>;
}
