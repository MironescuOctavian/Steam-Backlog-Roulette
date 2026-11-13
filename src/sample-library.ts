import {validateLibrary,type Game} from './library';

type SampleRow=[number,string,string[],number,number,number,number,Game['status']];

const rows:SampleRow[]=[
  [1245620,'Elden Ring',['RPG','Open World','Soulslike'],12.5,60,94,59.99,'Backlog'],
  [1145360,'Hades',['Action','Roguelike'],8,23,93,12.49,'Playing'],
  [367520,'Hollow Knight',['Metroidvania','Platformer'],0,27,87,7.49,'Unplayed'],
  [413150,'Stardew Valley',['Simulation','RPG'],46,53,89,14.99,'Playing'],
  [2379780,'Balatro',['Strategy','Roguelike','Card Game'],18,10,90,14.99,'Playing'],
  [620,'Portal 2',['Puzzle','Adventure'],10,9,95,1.99,'Completed'],
  [632470,'Disco Elysium',['RPG','Adventure'],2,23,91,9.99,'Backlog'],
  [1091500,'Cyberpunk 2077',['RPG','Open World'],1.5,26,86,29.99,'Backlog'],
  [264710,'Subnautica',['Survival','Adventure'],0,30,87,14.99,'Unplayed'],
  [588650,'Dead Cells',['Roguelike','Metroidvania'],0.8,14,89,12.49,'Backlog'],
  [504230,'Celeste',['Platformer','Adventure'],0,8,92,4.99,'Unplayed'],
  [753640,'Outer Wilds',['Adventure','Puzzle'],0,16,85,14.99,'Unplayed'],
  [646570,'Slay the Spire',['Roguelike','Card Game','Strategy'],42,12,89,8.49,'Completed'],
  [548430,'Deep Rock Galactic',['Action','Co-op'],1,30,85,9.89,'Backlog'],
  [294100,'RimWorld',['Strategy','Simulation'],0,65,87,27.99,'Unplayed'],
];

export const sampleLibrary=():Game[]=>validateLibrary(rows.map(([appId,title,genres,playtimeHours,timeToBeatHours,metacritic,pricePaid,status])=>({
  appId,title,genres:[...genres],playtimeHours,timeToBeatHours,metacritic,pricePaid,priceKnown:true,status,tags:[],metadataSource:'Demo estimates',
})));
