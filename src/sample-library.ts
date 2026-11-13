import {top250} from './catalog.ts';
import {validateLibrary,type Game} from './library.ts';

export type CuratorSampleInfo={slot:number;id:number;name:string;theme:string;url:string;live:boolean};

type RawSampleRow=[number,string,string[],number,number|null,number|null,number,Game['status'],number?];
type CuratorMeta={slot:number;id:number;name:string;theme:string;url:string;rows:RawSampleRow[]};

const curatorDecks:CuratorMeta[]=[
  {
    slot:0,id:1850,name:'PC Gamer',theme:'PC hits & editor picks',
    url:'https://store.steampowered.com/curator/1850-PC-Gamer/',
    rows:[
      [1245620,'Elden Ring',['RPG','Open World','Soulslike'],12.5,60,94,59.99,'Backlog'],
      [1086940,"Baldur's Gate 3",['RPG','Turn-Based'],18,105,96,59.99,'Playing'],
      [1091500,'Cyberpunk 2077',['RPG','Open World'],4.5,26,86,29.99,'Backlog'],
      [632470,'Disco Elysium',['RPG','Adventure'],2,23,91,9.99,'Backlog'],
      [292030,'The Witcher 3: Wild Hunt',['RPG','Open World'],21,51,93,9.99,'Playing'],
      [620,'Portal 2',['Puzzle','Adventure'],10,9,95,1.99,'Completed'],
      [548430,'Deep Rock Galactic',['Action','Co-op'],3.5,30,85,9.89,'Backlog'],
      [427520,'Factorio',['Strategy','Automation'],0,54,90,35,'Unplayed'],
      [1151640,'Horizon Zero Dawn Complete Edition',['Action','Open World'],0,30,84,12.49,'Unplayed'],
      [782330,'DOOM Eternal',['FPS','Action'],6,14,88,9.99,'Backlog'],
      [1145360,'Hades',['Action','Roguelike'],24,23,93,12.49,'Completed'],
      [1281930,'tModLoader',['Sandbox','Mod'],0,null,null,0,'Unplayed'],
      [753640,'Outer Wilds',['Adventure','Puzzle'],0,16,85,14.99,'Unplayed'],
      [1426210,'It Takes Two',['Co-op','Adventure'],0,14,88,15.99,'Unplayed'],
      [1174180,'Red Dead Redemption 2',['Action','Open World'],1.5,50,93,19.79,'Backlog'],
    ],
  },
  {
    slot:1,id:35411526,name:'Wholesome Games ♥',theme:'Cozy & heartfelt indies',
    url:'https://store.steampowered.com/curator/35411526-Wholesome-Games-%E2%99%A5/',
    rows:[
      [413150,'Stardew Valley',['Simulation','RPG'],34,53,89,14.99,'Playing'],
      [1055540,'A Short Hike',['Adventure','Exploration'],2.5,2,82,4.79,'Completed'],
      [972660,'Spiritfarer: Farewell Edition',['Management','Indie'],6,26,84,7.49,'Backlog'],
      [1466060,'Unpacking',['Puzzle','Cozy'],4,4,84,9.99,'Completed'],
      [1127500,'Mini Motorways',['Strategy','Puzzle'],0,12,86,6.99,'Unplayed'],
      [1262350,'SIGNALIS',['Horror','Adventure'],0,10,81,13.99,'Unplayed'],
      [1369630,'ENDER LILIES: Quietus of the Knights',['Metroidvania','Action'],0,13,86,9.99,'Unplayed'],
      [1621690,'Core Keeper',['Survival','Sandbox'],3,32,80,11.99,'Backlog'],
      [1147560,'Skul: The Hero Slayer',['Roguelike','Action'],1.5,18,80,9.99,'Backlog'],
      [1868140,'DAVE THE DIVER',['Adventure','Management'],8.5,24,90,13.99,'Playing'],
      [1562430,'DREDGE',['Adventure','Fishing'],0,10,80,14.99,'Unplayed'],
      [1672970,'Minecraft Dungeons',['Action','RPG'],0,7,78,19.99,'Unplayed'],
      [1293820,'AAero',['Rhythm','Action'],0,5,77,4.49,'Unplayed'],
      [504230,'Celeste',['Platformer','Adventure'],0,8,92,4.99,'Unplayed'],
      [367520,'Hollow Knight',['Metroidvania','Platformer'],2,27,87,7.49,'Backlog'],
    ],
  },
  {
    slot:2,id:4771848,name:'/r/pcmasterrace Group',theme:'Community PC favorites',
    url:'https://store.steampowered.com/curator/4771848-r-pcmasterrace-Group/',
    rows:[
      [367520,'Hollow Knight',['Metroidvania','Platformer'],0,27,87,7.49,'Unplayed'],
      [2379780,'Balatro',['Strategy','Roguelike','Card Game'],18,10,90,14.99,'Playing'],
      [646570,'Slay the Spire',['Roguelike','Card Game','Strategy'],42,12,89,8.49,'Completed'],
      [588650,'Dead Cells',['Roguelike','Metroidvania'],1.5,14,89,12.49,'Backlog'],
      [264710,'Subnautica',['Survival','Adventure'],0,30,87,14.99,'Unplayed'],
      [294100,'RimWorld',['Strategy','Simulation'],0,65,87,27.99,'Unplayed'],
      [220,'Half-Life 2',['FPS','Action'],13,13,96,1.99,'Completed'],
      [391540,'Undertale',['RPG','Indie'],0,7,92,2.99,'Unplayed'],
      [814380,'Sekiro: Shadows Die Twice',['Action','Soulslike'],7.5,30,90,29.99,'Backlog'],
      [374320,'DARK SOULS III',['Action','RPG'],3,32,89,29.99,'Backlog'],
      [105600,'Terraria',['Sandbox','Survival'],14,90,83,4.99,'Playing'],
      [400,'Portal',['Puzzle','FPS'],0,3,90,1.99,'Unplayed'],
      [553850,'HELLDIVERS 2',['Co-op','Action'],5,null,82,39.99,'Backlog'],
      [892970,'Valheim',['Survival','Co-op'],0,75,85,11.99,'Unplayed'],
      [1794680,'Vampire Survivors',['Action','Roguelike'],2.5,15,86,3.74,'Backlog'],
    ],
  },
  {
    slot:3,id:1370293,name:'Cynical Brit Gaming',theme:'Classic PC curation',
    url:'https://store.steampowered.com/curator/1370293-Cynical-Brit-Gaming/',
    rows:[
      [212680,'FTL: Faster Than Light',['Strategy','Roguelike'],14,12,84,2.49,'Completed'],
      [268500,'XCOM 2',['Strategy','Tactical'],9,34,88,5.99,'Backlog'],
      [204360,'Castle Crashers',['Action','Co-op'],4.5,7,85,2.99,'Completed'],
      [239030,'Papers, Please',['Puzzle','Simulation'],0,5,85,4.99,'Unplayed'],
      [219740,"Don't Starve",['Survival','Indie'],0,30,79,3.74,'Unplayed'],
      [250900,'The Binding of Isaac: Rebirth',['Roguelike','Action'],16,45,86,7.49,'Playing'],
      [200510,'XCOM: Enemy Unknown',['Strategy','Tactical'],2,27,89,5.99,'Backlog'],
      [230290,'Universe Sandbox',['Simulation','Space'],0,null,null,19.99,'Unplayed'],
      [219150,'Hotline Miami',['Action','Indie'],1.5,5,85,1.99,'Backlog'],
      [242760,'The Forest',['Survival','Horror'],0,17,83,4.99,'Unplayed'],
      [257850,'Hyper Light Drifter',['Action','Adventure'],0,7,84,9.99,'Unplayed'],
      [287700,'METAL GEAR SOLID V: THE PHANTOM PAIN',['Stealth','Action'],6,46,91,11.99,'Backlog'],
      [304390,'FOR HONOR',['Action','Multiplayer'],0,null,78,4.49,'Unplayed'],
      [262060,'Darkest Dungeon',['RPG','Roguelike'],3.5,56,84,3.74,'Backlog'],
      [292030,'The Witcher 3: Wild Hunt',['RPG','Open World'],11,51,93,9.99,'Playing'],
    ],
  },
  {
    slot:4,id:31507748,name:'Achievement Scouts',theme:'Completionist & backlog picks',
    url:'https://store.steampowered.com/curator/31507748-Achievement-Scouts/',
    rows:[
      [504230,'Celeste',['Platformer','Adventure'],4,8,92,4.99,'Backlog'],
      [753640,'Outer Wilds',['Adventure','Puzzle'],0,16,85,14.99,'Unplayed'],
      [646570,'Slay the Spire',['Roguelike','Card Game'],29,12,89,8.49,'Completed'],
      [1145360,'Hades',['Action','Roguelike'],11,23,93,12.49,'Playing'],
      [620,'Portal 2',['Puzzle','Adventure'],9.5,9,95,1.99,'Completed'],
      [588650,'Dead Cells',['Roguelike','Metroidvania'],0,14,89,12.49,'Unplayed'],
      [1332010,'Stray',['Adventure','Puzzle'],0,5,83,17.99,'Unplayed'],
      [1449850,'Yu-Gi-Oh! Master Duel',['Card Game','Strategy'],0,null,null,0,'Unplayed'],
      [1238840,'Battlefield 1',['FPS','Action'],1.5,7,88,3.99,'Backlog'],
      [1599340,'Lost Ark',['RPG','Action'],0,null,81,0,'Unplayed'],
      [1245620,'Elden Ring',['RPG','Open World'],15,60,94,59.99,'Playing'],
      [1326470,'Sons Of The Forest',['Survival','Horror'],0,16,86,20.99,'Unplayed'],
      [1623730,'Palworld',['Survival','Open World'],3,40,80,22.49,'Backlog'],
      [1172470,'Apex Legends',['FPS','Action'],0,null,88,0,'Unplayed'],
      [105600,'Terraria',['Sandbox','Survival'],0,90,83,4.99,'Unplayed'],
    ],
  },
];

const top250ById=new Map<number,Game>(top250.map(game=>[game.appId,game]));

function toGameList(rows:RawSampleRow[]):Game[]{
  return validateLibrary(rows.map(([appId,title,genres,playtimeHours,timeToBeatHours,metacritic,pricePaid,status])=>{
    const catalog=top250ById.get(appId);
    return {
      appId,
      title,
      genres:catalog?.genres?.length?[...catalog.genres]:[...genres],
      playtimeHours,
      timeToBeatHours:timeToBeatHours??catalog?.timeToBeatHours??null,
      metacritic,
      ...(catalog?.steamPositivePercent!==undefined?{steamPositivePercent:catalog.steamPositivePercent}:{}),
      ...(catalog?.rank!==undefined?{rank:catalog.rank}:{}),
      ...(catalog?.image?{image:catalog.image}:{}),
      pricePaid,
      priceKnown:true,
      status,
      tags:[],
      metadataSource:'Demo estimates',
    };
  }));
}

export const sampleLibrary=():Game[]=>toGameList(curatorDecks[0]!.rows);

export function pickCuratorSlot(excludeSlot?:number|null):number{
  const slots=curatorDecks.map(d=>d.slot).filter(slot=>slot!==excludeSlot);
  const pool=slots.length?slots:curatorDecks.map(d=>d.slot);
  return pool[Math.floor(Math.random()*pool.length)]??0;
}

const samplePresets:Array<{playtime:number;status:Game['status']}>=[
  {playtime:0,status:'Unplayed'},
  {playtime:3.5,status:'Backlog'},
  {playtime:0,status:'Unplayed'},
  {playtime:14,status:'Playing'},
  {playtime:2,status:'Backlog'},
  {playtime:11.5,status:'Completed'},
  {playtime:0,status:'Unplayed'},
  {playtime:6.5,status:'Playing'},
  {playtime:1.5,status:'Backlog'},
  {playtime:0,status:'Unplayed'},
  {playtime:9,status:'Completed'},
  {playtime:0,status:'Unplayed'},
  {playtime:4,status:'Backlog'},
  {playtime:0,status:'Unplayed'},
  {playtime:7,status:'Backlog'},
];

export function buildCuratorLibrary(
  rawGames:Array<{appId:number;title:string;pricePaid?:number;priceKnown?:boolean;image?:string}>,
):Game[]{
  const seen=new Set<number>();
  const rows:Game[]=[];
  for(const item of rawGames){
    if(seen.has(item.appId))continue;
    seen.add(item.appId);
    const index=rows.length;
    const preset=samplePresets[index%samplePresets.length]!;
    const catalog=top250ById.get(item.appId);
    rows.push({
      appId:item.appId,
      title:item.title,
      genres:catalog?.genres?.length?[...catalog.genres]:['Curator Pick'],
      playtimeHours:preset.playtime,
      timeToBeatHours:catalog?.timeToBeatHours??null,
      metacritic:catalog?.metacritic??null,
      ...(catalog?.steamPositivePercent!==undefined?{steamPositivePercent:catalog.steamPositivePercent}:{}),
      ...(catalog?.rank!==undefined?{rank:catalog.rank}:{}),
      ...(item.image?{image:item.image}:catalog?.image?{image:catalog.image}:{}),
      pricePaid:typeof item.pricePaid==='number'&&Number.isFinite(item.pricePaid)&&item.pricePaid>=0?item.pricePaid:0,
      priceKnown:Boolean(item.priceKnown),
      status:preset.status,
      tags:[],
      metadataSource:'Demo estimates',
    });
    if(rows.length>=18)break;
  }
  return validateLibrary(rows);
}

export async function loadRandomCuratorSample(lastSlot?:number|null):Promise<{games:Game[];curator:CuratorSampleInfo}>{
  const slot=pickCuratorSlot(lastSlot);
  const deck=curatorDecks[slot]??curatorDecks[0]!;
  if(typeof location!=='undefined'&&location.protocol!=='file:'&&typeof fetch==='function'){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6000);
    try{
      const response=await fetch(`/api/sample-curator?slot=${slot}`,{signal:controller.signal,credentials:'same-origin'});
      if(response.ok){
        const payload=await response.json();
        if(payload?.curator&&Array.isArray(payload?.games)&&payload.games.length>0){
          const games=buildCuratorLibrary(payload.games);
          if(games.length>0){
            return {
              games,
              curator:{
                slot:Number(payload.curator.slot??deck.slot),
                id:Number(payload.curator.id??deck.id),
                name:String(payload.curator.name??deck.name),
                theme:String(payload.curator.theme??deck.theme),
                url:String(payload.curator.url??deck.url),
                live:true,
              },
            };
          }
        }
      }
    }catch{
      // Fall back to curated local snapshot for the chosen curator slot.
    }finally{
      clearTimeout(timeout);
    }
  }
  return {
    games:toGameList(deck.rows),
    curator:{slot:deck.slot,id:deck.id,name:deck.name,theme:deck.theme,url:deck.url,live:false},
  };
}
