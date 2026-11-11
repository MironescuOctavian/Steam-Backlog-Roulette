export const statuses = ["Unplayed", "Backlog", "Playing", "Completed", "Dropped"] as const;
export type Game = {
  appId: number; title: string; genres: string[]; playtimeHours: number;
  timeToBeatHours: number; metacritic: number | null; pricePaid: number;
  status: (typeof statuses)[number]; tags: string[]; playNext: boolean;
  metadataSource: "Demo estimates" | "Estimated" | "Custom";
};
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
  tags:[],playNext:false,metadataSource:"Demo estimates",
}));
export const coverUrl = (appId: number) => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
export const remainingHours = (g: Game) => g.status === "Completed" || g.status === "Dropped" ? 0 : Math.max(0,g.timeToBeatHours-g.playtimeHours);
export const costPerHour = (g: Game) => g.playtimeHours === 0 ? null : g.pricePaid/g.playtimeHours;

const KEY = "steam-backlog-roulette.library.v1";
type StorageAccess = Pick<Storage,"getItem"|"setItem">;
const nonnegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 50 && v.every(s => typeof s === "string" && s.length <= 100);
export function validateLibrary(value: unknown): Game[] {
  if (!Array.isArray(value) || value.length > 20000) throw new Error("Invalid library size.");
  const ids = new Set<number>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid game.");
    const g = item as { [K in keyof Game]: unknown };
    if (!Number.isSafeInteger(g.appId) || !nonnegative(g.appId) || g.appId === 0 || ids.has(g.appId)
      || typeof g.title !== "string" || !g.title.trim() || g.title.length > 300
      || !strings(g.genres) || !strings(g.tags) || typeof g.playNext !== "boolean"
      || !nonnegative(g.playtimeHours) || !nonnegative(g.timeToBeatHours) || !nonnegative(g.pricePaid)
      || !(g.metacritic === null || (nonnegative(g.metacritic) && g.metacritic <= 100))
      || !statuses.includes(g.status as Game["status"])
      || !["Demo estimates","Estimated","Custom"].includes(g.metadataSource as string)) throw new Error("Invalid game data.");
    ids.add(g.appId);
    return {appId:g.appId,title:g.title.trim(),genres:[...g.genres],tags:[...g.tags],playNext:g.playNext,
      playtimeHours:g.playtimeHours,timeToBeatHours:g.timeToBeatHours,pricePaid:g.pricePaid,
      metacritic:g.metacritic,status:g.status as Game["status"],metadataSource:g.metadataSource as Game["metadataSource"]};
  });
}
export function saveLibrary(storage: StorageAccess,games: Game[]): void {
  storage.setItem(KEY,JSON.stringify({version:1,games:validateLibrary(games)}));
}
export function loadLibrary(storage: StorageAccess): {games:Game[];warning:string|null} {
  try {
    const raw = storage.getItem(KEY);
    if (raw === null) {
      const games = demoLibrary();
      saveLibrary(storage,games);
      return {games,warning:null};
    }
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) throw new Error("Unsupported library version.");
    return {games:validateLibrary(data.games),warning:null};
  } catch {
    return {games:demoLibrary(),warning:"Saved data could not be loaded or browser storage is unavailable. Showing a temporary demo library; existing saved data has not been overwritten."};
  }
}
