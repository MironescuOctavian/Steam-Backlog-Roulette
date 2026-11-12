export function steamNewsImage(value:unknown):string|undefined{
  if(typeof value!=='string'||value.length>2000)return;
  try{const url=new URL(value.replace('{STEAM_CLAN_IMAGE}','https://clan.akamai.steamstatic.com/images').replaceAll('&amp;','&'));
    if(url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&['clan.akamai.steamstatic.com','clan.cloudflare.steamstatic.com','clan.fastly.steamstatic.com','shared.akamai.steamstatic.com','shared.cloudflare.steamstatic.com','shared.fastly.steamstatic.com','cdn.akamai.steamstatic.com','cdn.cloudflare.steamstatic.com','steamuserimages-a.akamaihd.net','steamcdn-a.akamaihd.net'].includes(url.hostname))return url.href;
  }catch{}
  return undefined;
}
export function extractNewsImages(contents:unknown):string[]{
  if(typeof contents!=='string')return [];
  const images=new Set<string>();
  for(const match of contents.matchAll(/\[img(?:=[^\]]*)?\]\s*([^\[]+?)\s*\[\/img\]|<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)){
    const image=steamNewsImage(match[1]??match[2]);if(image)images.add(image);
  }
  return [...images];
}
export function extractNewsImage(contents:unknown){return extractNewsImages(contents)[0];}
