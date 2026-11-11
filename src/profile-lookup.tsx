import {createSignal,onCleanup,Show} from 'solid-js';
import {validateProfile,type SteamProfile,type Game} from './library';
import {parseSteam} from './imports';

export function ProfileLookup(props:{profile:SteamProfile|null;games:Game[];onLoad:(games:Game[],profile:SteamProfile)=>boolean;disabled:boolean}) {
  const [query,setQuery]=createSignal(props.profile?.url??'');
  const [busy,setBusy]=createSignal(false);
  const [error,setError]=createSignal('');
  const [stage,setStage]=createSignal<'finding'|'loading'>('finding');
  const [success,setSuccess]=createSignal('');
  const privateProfile=()=>/private|Game details/i.test(error());
  const canRetry=()=>!privateProfile()&&!/not configured|profile URL|custom handle|not found|Display names/i.test(error());
  function editProfile(){const input=document.getElementById('steam-profile') as HTMLInputElement|null;input?.focus();input?.select();}
  let controller:AbortController|undefined;
  onCleanup(()=>controller?.abort());
  async function lookup(event:SubmitEvent) {
    event.preventDefault();if(busy())return;
    const input=String(new FormData(event.currentTarget as HTMLFormElement).get('profile')??'').trim();
    setError('');setSuccess('');setStage('finding');
    if(location.protocol==='file:'){setError('Steam profile lookup is available in the hosted app. You can still explore the Top 250 or import a JSON library here.');return;}
    controller=new AbortController();const request=controller;setBusy(true);
    const timeout=setTimeout(()=>request.abort(),35000);
    try {
      const response=await fetch('/api/steam/profile?'+new URLSearchParams({profile:input}),{signal:request.signal,credentials:'same-origin'});
      setStage('loading');
      const payload=await response.json();
      if(!response.ok)throw new Error(typeof payload.error==='string'?payload.error:'Could not load this profile.');
      const profile=validateProfile(payload.profile);
      if(!profile)throw new Error('Steam returned an invalid profile.');
      const games=parseSteam(payload.steam,props.profile?.steamId===profile.steamId?props.games:[]);
      if(!props.onLoad(games,profile))throw new Error('The library could not be saved. Your previous library is unchanged.');
      setSuccess(`${profile.name}’s library is ready. ${games.length} games loaded.`);
    } catch(e){setError(request.signal.aborted?'Lookup timed out. Please try again.':e instanceof Error?e.message:'Steam is unavailable. Please try again.');}
    finally{clearTimeout(timeout);setBusy(false);}
  }
  return <section class="profile-lookup" aria-labelledby="lookup-title"><h2 id="lookup-title">{props.profile?'Look up another profile':'Find your Steam library'}</h2>
    <p>Paste your public profile. No login needed.</p>
    <form onSubmit={lookup} aria-busy={busy()?'true':'false'}><label for="steam-profile">Steam profile link, custom handle, or Steam64 ID</label><div class="lookup-input"><input id="steam-profile" name="profile" type="text" required maxlength="300" placeholder="steamcommunity.com/id/your-handle" aria-describedby="profile-example profile-privacy" value={query()} onInput={e=>setQuery(e.currentTarget.value)} disabled={busy()||props.disabled} /><button type="submit" disabled={busy()||props.disabled}>{busy()?(stage()==='finding'?'Finding profile…':'Loading library…'):'Load my library →'}</button></div></form>
    <p id="profile-example" class="lookup-example">Example: <code>steamcommunity.com/id/your-handle</code></p>
    <p id="profile-privacy" class="lookup-hint">Looking up someone else works too. Profile and Game details must be public.</p>
    <Show when={busy()}><p class="lookup-progress" role="status"><span class="lookup-spinner" aria-hidden="true" />{stage()==='finding'?'Finding profile and requesting public game details…':'Loading library and saving your games…'}</p></Show>
    <Show when={!busy()&&success()}><p class="lookup-success" role="status">{success()}</p></Show>
    <Show when={props.profile}><div class="profile-summary"><Show when={props.profile?.avatar}><img src={props.profile?.avatar} alt="" width="40" height="40" /></Show><div><a href={props.profile?.url} target="_blank" rel="noopener noreferrer">Viewing {props.profile?.name} ↗</a><small>{props.games.length} owned games · Last synced {new Date(props.profile?.updatedAt??'').toLocaleString()}</small><small>Playtime syncs on refresh; results can be up to five minutes old.</small></div><button disabled={busy()||props.disabled} onClick={()=>{setQuery(props.profile?.url??'');requestAnimationFrame(()=>document.querySelector<HTMLFormElement>('.profile-lookup form')?.requestSubmit());}}>{busy()?'Refreshing…':'Refresh library'}</button></div></Show>
    <div class="lookup-error" role="alert" hidden={!error()}><strong>{privateProfile()?'This library is private':'The library could not be loaded'}</strong><p>{error()}</p><Show when={privateProfile()}><p>The profile owner needs to set both Profile and Game details to Public in Steam’s privacy settings.</p></Show><p>{props.profile||props.games.length?'Your saved library is unchanged.':'You can still explore the Top 250 below.'}</p><div class="lookup-recovery"><Show when={canRetry()}><button type="button" disabled={busy()||props.disabled} onClick={()=>document.querySelector<HTMLFormElement>('.profile-lookup form')?.requestSubmit()}>Try again</button></Show><button type="button" onClick={editProfile}>Edit profile link</button></div></div>
  </section>;
}
