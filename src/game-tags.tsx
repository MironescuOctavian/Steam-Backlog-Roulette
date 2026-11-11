import {createEffect,createSignal} from 'solid-js';
import type {Game} from './library';
export function GameTags(props:{game:Game;disabled:boolean;onSave:(tags:string[])=>boolean}){
  const [draft,setDraft]=createSignal(props.game.tags.join(', '));let editing=false;
  createEffect(()=>props.game.tags.join(', '),value=>{if(!editing)setDraft(value);});
  return <label class="tag-label">Tags · comma separated<input value={draft()} maxlength="500" placeholder="weekend, cozy…" disabled={props.disabled} aria-label={`Tags for ${props.game.title}`} onFocusIn={()=>{editing=true;}} onInput={e=>setDraft(e.currentTarget.value)} onBlur={e=>{editing=false;const tags=e.currentTarget.value.split(',').map(s=>s.trim()).filter(Boolean);setDraft(props.onSave(tags)?tags.join(', '):props.game.tags.join(', '));}} /></label>;
}
