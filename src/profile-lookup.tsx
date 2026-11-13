import {createEffect,createSignal,onCleanup,Show} from 'solid-js';
import {validateProfile,type SteamProfile,type Game} from './library';
import {parseSteam} from './imports';
import type {CuratorSampleInfo} from './sample-library';

export function ProfileLookup(props:{profile:SteamProfile|null;games:Game[];hasGames?:boolean;sampleInfo?:CuratorSampleInfo|null;onLoad:(games:Game[],profile:SteamProfile)=>boolean;onSample?:()=>Promise<void>|void;onClearSample?:()=>void;onImport?:()=>void;onDisconnect?:()=>void;disabled:boolean}) {
  const [query,setQuery]=createSignal(props.profile?.url??'');
  const [busy,setBusy]=createSignal(false);
  const [sampleBusy,setSampleBusy]=createSignal(false);
  const [error,setError]=createSignal('');
  const [editing,setEditing]=createSignal(!props.profile);
  const [success,setSuccess]=createSignal('');
  const [helpOpen,setHelpOpen]=createSignal(false);
  let helpRef:HTMLDivElement|undefined;
  const privateProfile=()=>/private|Game details/i.test(error());
  const canRetry=()=>!privateProfile()&&!/not configured|authenticated request|profile URL|custom handle|not found|Display names/i.test(error());
  function editProfile(){setEditing(true);requestAnimationFrame(()=>{const input=document.getElementById('steam-profile') as HTMLInputElement|null;input?.focus();input?.select();});}
  createEffect(()=>[props.profile?.steamId??'',props.hasGames?1:0].join('|'),()=>{
    if(props.profile?.steamId){
      setQuery(props.profile.url);
      setEditing(false);
    }else{
      setEditing(true);
      setQuery('');
      if(!props.hasGames)setSuccess('');
    }
  });
  let controller:AbortController|undefined;
  onCleanup(()=>{controller?.abort();});
  createEffect(()=>helpOpen(),open=>{
    if(!open)return;
    const onPointer=(e:PointerEvent)=>{if(helpRef&&!helpRef.contains(e.target as Node))setHelpOpen(false);};
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setHelpOpen(false);};
    window.addEventListener('pointerdown',onPointer);
    window.addEventListener('keydown',onKey);
    onCleanup(()=>{window.removeEventListener('pointerdown',onPointer);window.removeEventListener('keydown',onKey);});
  });
  async function triggerSample(){
    if(sampleBusy()||busy()||props.disabled||!props.onSample)return;
    setError('');setSuccess('');setSampleBusy(true);
    try{await props.onSample();}finally{setSampleBusy(false);}
  }
  async function lookup(event:SubmitEvent) {
    event.preventDefault();if(busy())return;
    const input=String(new FormData(event.currentTarget as HTMLFormElement).get('profile')??'').trim();
    setError('');setSuccess('');
    if(location.protocol==='file:'){setError('Steam profile lookup is available in the hosted app. You can still explore the Top 250 or import a JSON library here.');return;}
    controller=new AbortController();const request=controller;setBusy(true);
    const timeout=setTimeout(()=>request.abort(),35000);
    try {
      const response=await fetch('/api/steam/profile?'+new URLSearchParams({profile:input}),{signal:request.signal,credentials:'same-origin'});
      const payload=await response.json();
      if(!response.ok)throw new Error(typeof payload.error==='string'?payload.error:'Could not load this profile.');
      const profile=validateProfile(payload.profile);
      if(!profile)throw new Error('Steam returned an invalid profile.');
      const games=parseSteam(payload.steam,props.profile?.steamId===profile.steamId?props.games:[]);
      if(!props.onLoad(games,profile))throw new Error('The library could not be saved. Your previous library is unchanged.');
      setEditing(false);
      setSuccess(`${profile.name}’s library is ready. ${games.length} games loaded.`);
    } catch(e){setError(request.signal.aborted?'Lookup timed out. Please try again.':e instanceof Error?e.message:'Steam is unavailable. Please try again.');}
    finally{clearTimeout(timeout);setBusy(false);}
  }
  return <section id="profile-panel" class={["profile-lookup",{"profile-loaded":Boolean(props.profile)}]} aria-label="Steam profile">
    <Show when={props.profile}><div class="profile-summary"><Show when={props.profile?.avatar}><span class="profile-avatar" aria-hidden="true"><span class="i-lucide-user-round" /><img src={props.profile?.avatar} alt="" width="48" height="48" onError={e=>{e.currentTarget.style.visibility='hidden';}} onLoad={e=>{e.currentTarget.style.visibility='visible';}} /></span></Show><div><a href={props.profile?.url} target="_blank" rel="noopener noreferrer">Viewing {props.profile?.name}’s library <span class="i-lucide-arrow-up-right" aria-hidden="true" /></a><small>{props.games.length.toLocaleString()} owned games · Last synced {new Date(props.profile?.updatedAt??'').toLocaleString()}</small><small>Edits stay on this device · Refreshes may be cached for five minutes.</small></div><button disabled={busy()||props.disabled} onClick={()=>{setQuery(props.profile?.url??'');requestAnimationFrame(()=>document.querySelector<HTMLFormElement>('.profile-lookup form')?.requestSubmit());}}><span class="i-lucide-refresh-cw" aria-hidden="true" />{busy()?'Refreshing…':'Refresh library'}</button><button class="switch-profile" disabled={busy()} aria-expanded={editing()?'true':'false'} aria-controls="profile-editor" onClick={()=>{setQuery('');setError('');editProfile();}}>Switch profile</button><Show when={props.onDisconnect}><button type="button" class="disconnect-profile" disabled={busy()||props.disabled} onClick={()=>{setSuccess('');setError('');props.onDisconnect?.();}}>Disconnect</button></Show></div></Show>
    <div id="profile-editor" class="profile-editor" hidden={Boolean(props.profile)&&!editing()}>
    <div class="profile-editor-heading"><h2 id="lookup-title">{props.profile?'Look up another profile':'Find your Steam library'}</h2><Show when={props.profile}><button type="button" disabled={busy()} onClick={()=>{setEditing(false);setError('');setQuery(props.profile?.url??'');requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.switch-profile')?.focus());}}>Cancel</button></Show></div>
    <p>Paste your public profile. No login needed.</p>
    <form onSubmit={lookup} aria-busy={busy()?'true':'false'}><label for="steam-profile">Steam profile link, custom handle, or Steam64 ID</label><div class="lookup-input"><input id="steam-profile" name="profile" type="text" required maxlength="300" placeholder="steamcommunity.com/id/your-handle" aria-describedby="profile-example profile-privacy" value={query()} onInput={e=>setQuery(e.currentTarget.value)} disabled={busy()||props.disabled} /><button type="submit" disabled={busy()||props.disabled}>{busy()?'Loading library…':'Load my library →'}</button></div></form>
    <div class={["profile-help",{"help-open":helpOpen()}]} ref={helpRef}>
      <button type="button" class="profile-help-trigger" aria-expanded={helpOpen()?'true':'false'} aria-controls="profile-help-popover" onClick={()=>setHelpOpen(v=>!v)}>Where do I find this?</button>
      <div id="profile-help-popover" class="profile-help-popover" role="region" aria-label="How to find your Steam profile">
        <ol><li>In Steam, open your profile from your account name, then copy the page URL (right-click the page and choose Copy Page URL in the desktop app).</li><li>Open Edit Profile → Privacy Settings. Set My profile and Game details to Public, then load your library here.</li></ol>
        <p>You can change these settings again whenever you want.</p>
      </div>
    </div>
    <p id="profile-example" class="lookup-example">Example: <code>steamcommunity.com/id/your-handle</code></p>
    <p id="profile-privacy" class="lookup-hint">Looking up someone else works too. Profile and Game details must be public.</p>
    <Show when={!props.hasGames&&(props.onSample||props.onImport)}><div class="lookup-quickstart"><span>No link handy?</span><Show when={props.onSample}><button type="button" class="quickstart-pill" disabled={busy()||sampleBusy()||props.disabled} onClick={()=>void triggerSample()}>{sampleBusy()?'Loading sample…':'Try sample library'}</button></Show><Show when={props.onImport}><button type="button" class="quickstart-pill" disabled={busy()||props.disabled} onClick={()=>props.onImport?.()}>Import JSON</button></Show></div></Show>
    <Show when={!props.profile&&props.hasGames&&props.sampleInfo}><div class="lookup-quickstart"><span>Sample: <a href={props.sampleInfo!.url} target="_blank" rel="noopener noreferrer">{props.sampleInfo!.name}</a> · {props.sampleInfo!.theme}</span><Show when={props.onSample}><button type="button" class="quickstart-pill" disabled={busy()||sampleBusy()||props.disabled} onClick={()=>void triggerSample()}>{sampleBusy()?'Loading…':'Shuffle curator'}</button></Show><Show when={props.onClearSample}><button type="button" class="quickstart-pill quickstart-clear" disabled={busy()||props.disabled} onClick={()=>props.onClearSample?.()}>Clear sample</button></Show></div></Show>
    </div>
    <Show when={busy()}><p class="lookup-progress" role="status"><span class="lookup-spinner" aria-hidden="true" />Loading public profile and library from Steam…</p></Show>
    <Show when={!busy()&&success()}><p class={["lookup-success",{"sr-only":Boolean(props.profile)}]} role="status">{success()}</p></Show>
    <div class="lookup-error" role="alert" hidden={!error()}><strong>{privateProfile()?'This library is private':'The library could not be loaded'}</strong><p>{error()}</p><Show when={privateProfile()}><p>The profile owner needs to set both Profile and Game details to Public in Steam’s privacy settings.</p></Show><p>{props.profile||props.games.length?'Your saved library is unchanged.':'You can still explore the Top 250 below.'}</p><div class="lookup-recovery"><Show when={canRetry()}><button type="button" disabled={busy()||props.disabled} onClick={()=>document.querySelector<HTMLFormElement>('.profile-lookup form')?.requestSubmit()}>Try again</button></Show><button type="button" onClick={editProfile}>Edit profile link</button></div></div>
  </section>;
}
