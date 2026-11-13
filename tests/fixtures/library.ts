// Explicit test data only; never used as the application's initial library.
import type {Game} from '../../src/library.ts';
type Row = [number, string, string[], number, number, number, number, Game["status"]];
const rows: Row[] = [
  [1245620,"Elden Ring",["RPG","Open World","Soulslike"],12.5,60,94,59.99,"Backlog"],
  [1145360,"Hades",["Action","Roguelike"],8,23,93,12.49,"Playing"],
  [367520,"Hollow Knight",["Metroidvania","Platformer"],0,27,87,7.49,"Unplayed"],
  [413150,"Stardew Valley",["Simulation","RPG"],46,53,89,14.99,"Playing"],
  [1091500,"Cyberpunk 2077",["RPG","Open World"],1.5,26,86,29.99,"Backlog"],
  [2379780,"Balatro",["Strategy","Roguelike","Card Game"],23,10,90,14.99,"Playing"],
  [620,"Portal 2",["Puzzle","Adventure"],10,9,95,1.99,"Completed"],
  [292030,"The Witcher 3: Wild Hunt",["RPG","Open World"],0,52,93,9.99,"Unplayed"],
  [632470,"Disco Elysium",["RPG","Adventure"],2,23,91,9.99,"Backlog"],
  [105600,"Terraria",["Sandbox","Survival"],80,55,83,4.99,"Playing"],
  [264710,"Subnautica",["Survival","Adventure"],0,30,87,14.99,"Unplayed"],
  [1086940,"Baldur's Gate 3",["RPG","Strategy"],0,68,96,59.99,"Unplayed"],
  [646570,"Slay the Spire",["Roguelike","Card Game","Strategy"],42,12,89,8.49,"Completed"],
  [588650,"Dead Cells",["Roguelike","Metroidvania"],0.8,14,89,12.49,"Backlog"],
  [504230,"Celeste",["Platformer","Adventure"],0,8,92,4.99,"Unplayed"],
  [1057090,"Ori and the Will of the Wisps",["Metroidvania","Platformer"],0,12,88,9.89,"Unplayed"],
  [1151640,"Horizon Zero Dawn Complete Edition",["Action","Open World"],5,30,84,16.49,"Dropped"],
  [1174180,"Red Dead Redemption 2",["Adventure","Open World"],0,50,93,19.79,"Unplayed"],
  [814380,"Sekiro: Shadows Die Twice",["Action","Soulslike"],3,30,88,29.99,"Backlog"],
  [374320,"Dark Souls III",["RPG","Soulslike"],45,32,89,14.99,"Completed"],
  [250900,"The Binding of Isaac: Rebirth",["Roguelike","Action"],0,5,86,7.49,"Unplayed"],
  [268910,"Cuphead",["Action","Platformer"],1.2,11,88,13.99,"Backlog"],
  [753640,"Outer Wilds",["Adventure","Puzzle"],0,16,85,14.99,"Unplayed"],
  [400,"Portal",["Puzzle","Adventure"],4,3,90,0.99,"Completed"],
  [990080,"Hogwarts Legacy",["RPG","Open World"],0,27,83,29.99,"Unplayed"],
  [8870,"BioShock Infinite",["Action","Adventure"],0,11,94,7.49,"Unplayed"],
  [391540,"Undertale",["RPG","Adventure"],0,7,92,2.99,"Unplayed"],
  [1222670,"The Sims 4",["Simulation","Sandbox"],18,40,70,0,"Dropped"],
  [548430,"Deep Rock Galactic",["Action","Co-op"],1,30,85,9.89,"Backlog"],
  [294100,"RimWorld",["Strategy","Simulation"],0,65,87,27.99,"Unplayed"],
];
export const demoLibrary = (): Game[] => rows.map(([appId,title,genres,playtimeHours,timeToBeatHours,metacritic,pricePaid,status]) => ({
  appId,title,genres:[...genres],playtimeHours,timeToBeatHours,metacritic,pricePaid,status,
  tags:[],metadataSource:"Demo estimates",
}));
