import {createSignal,For,Show} from 'solid-js';
import {statuses} from './library';
import {useLibrary} from './library-state';
export function BulkActions(props:{selected:number[];visible:number[];onSelect:(ids:number[])=>void;onClose:()=>void}){
  const {updateGames,setPreference,preferences,library}=useLibrary();
  const [status,setStatus]=createSignal('Completed'),[message,setMessage]=createSignal('');
  const disabled=()=>!props.selected.length||Boolean(library.warning);
  function apply(patch:Parameters<typeof updateGames>[1]){if(updateGames(props.selected,patch)){setMessage(props.selected.length+' games updated. Undo is available.');props.onSelect([]);}else setMessage('Could not save. Your previous library is unchanged.');}
  function exclude(){try{const ids=[...new Set([...preferences().excludedIds,...props.selected])];if(ids.length>20000)throw Error('Too many exclusions.');setPreference({excludedIds:ids});setMessage(props.selected.length+' games excluded from roulette; ownership and statuses are unchanged.');props.onSelect([]);}catch{setMessage('Exclusions could not be applied. Existing exclusions are unchanged.');}}
  return <div class="bulk-actions" aria-label="Bulk library actions"><div class="bulk-selection"><strong>{props.selected.length} selected</strong><button onClick={()=>props.onSelect([...new Set([...props.selected,...props.visible])])}>Select page</button><button disabled={!props.selected.length} onClick={()=>props.onSelect([])}>Clear</button><button onClick={props.onClose}>Done</button></div><div class="bulk-controls"><label>Status<select aria-label="Bulk status" value={status()} onChange={e=>setStatus(e.currentTarget.value)}><For each={statuses}>{s=><option>{s}</option>}</For></select></label><button disabled={disabled()} onClick={()=>apply({status:status() as typeof statuses[number]})}>Apply status</button><button disabled={disabled()} onClick={exclude}>Exclude from roulette</button></div><Show when={props.selected.length}><p>Selection can include games on other pages. Each library update can be undone in one step.</p></Show><p role="status">{message()}</p></div>;
}
