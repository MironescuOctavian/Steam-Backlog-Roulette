import {For} from 'solid-js';
import {sampleLibrary} from './sample-library';
import {coverUrl} from './library';
export function HeroDeck(){
  const examples=sampleLibrary().filter(game=>game.playtimeHours===0).slice(0,4);
  return <aside class="feature-art hero-deck fixed-deck" aria-label="Example picks from a sample backlog"><div class="orbit orbit-one" /><div class="orbit orbit-two" /><div class="deck-cards"><For each={examples}>{(game,index)=><a class="deck-card" target="_blank" rel="noopener noreferrer" href={'https://store.steampowered.com/app/'+game.appId+'/'} data-slot={index()} style={{'--slot':index()}} aria-label={game.title}><img class="deck-cover" src={coverUrl(game.appId)} alt={game.title} width="460" height="215" onError={e=>{e.currentTarget.style.visibility='hidden';}} /><div class="deck-caption"><div><strong>{game.title}</strong><span>UNPLAYED · {game.genres[0]}</span></div></div></a>}</For></div><div class="deck-bottom"><span>SAMPLE BACKLOG · YOUR NEXT ADVENTURE</span><span>Illustrative picks, not your library</span></div></aside>;
}
