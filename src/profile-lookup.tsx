import {createSignal,onCleanup,Show} from 'solid-js';
import {validateProfile,type SteamProfile,type Game} from './library';
import {parseSteam} from './imports';

export function ProfileLookup(props:{profile:SteamProfile|null;games:Game[];onLoad:(games:Game[],profile:SteamProfile)=>boolean;disabled:boolean}) {
  const [query,setQuery]=createSignal(props.profile?.url??'');
  const [busy,setBusy]=createSignal(false);
  const [error,setError]=createSignal('');
  let controller:AbortController|undefined;
  onCleanup(()=>controller?.abort());
  async function lookup(event:SubmitEvent) {
    event.preventDefault();if(busy())return;
    const input=String(new FormData(event.currentTarget as HTMLFormElement).get('profile')??'').trim();
    setError('');
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
    } catch(e){setError(request.signal.aborted?'Lookup timed out. Please try again.':e instanceof Error?e.message:'Steam is unavailable. Please try again.');}
    finally{clearTimeout(timeout);setBusy(false);}
  }
  return <section class="profile-lookup" aria-labelledby="lookup-title"><h2 id="lookup-title">{props.profile?'Look up another profile':'Find your Steam library'}</h2>
    <p>View your own public library or look up someone else. No login required.</p>
    <form onSubmit={lookup}><label for="steam-profile">Steam profile URL, custom handle, or Steam64 ID</label><div class="lookup-input"><input id="steam-profile" name="profile" type="text" required maxlength="300" placeholder="steamcommunity.com/id/your-handle" value={query()} onInput={e=>setQuery(e.currentTarget.value)} disabled={busy()||props.disabled} /><button type="submit" disabled={busy()||props.disabled}>{busy()?'Loading library…':'Load library →'}</button></div></form>
    <p class="lookup-hint">Profile and Game details must be public. Display names are not unique—use a profile link or custom handle.</p>
    <Show when={props.profile}><div class="profile-summary"><Show when={props.profile?.avatar}><img src={props.profile?.avatar} alt="" width="40" height="40" /></Show><div><a href={props.profile?.url} target="_blank" rel="noopener noreferrer">Viewing {props.profile?.name} ↗</a><small>{props.games.length} owned games · Last loaded {new Date(props.profile?.updatedAt??'').toLocaleString()}</small></div><button disabled={busy()||props.disabled} onClick={()=>{setQuery(props.profile?.url??'');requestAnimationFrame(()=>document.querySelector<HTMLFormElement>('.profile-lookup form')?.requestSubmit());}}>Refresh</button></div></Show>
    <p class="lookup-error" role="alert" hidden={!error()}>{error()}</p>
  </section>;
}
