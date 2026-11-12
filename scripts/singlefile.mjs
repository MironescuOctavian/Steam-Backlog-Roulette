import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('dist');
const readAsset=url=>{
  const file=path.resolve(root,'.'+url);
  assert.ok(file.startsWith(root+path.sep),'Asset must stay inside dist');
  return fs.readFileSync(file);
};
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,(_,url)=>{
  const css=readAsset(url).toString().replace(/url\((['"]?)(\/assets\/[^)'"\s]+)\1\)/g,(_match,_quote,asset)=>{
    const mime=asset.endsWith('.woff2')?'font/woff2':asset.endsWith('.webp')?'image/webp':asset.endsWith('.png')?'image/png':asset.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
    return `url(data:${mime};base64,${readAsset(asset).toString('base64')})`;
  });
  return `<style>${css.replaceAll('</style','<\\/style')}</style>`;
});
function inlineModule(url){
  return readAsset(url).toString().replace(/import\((['"`])(\.\/[^'"`]+\.js)\1\)/g,(_match,_quote,dependency)=>{
    const file=path.posix.join(path.posix.dirname(url),dependency);
    return `import("data:text/javascript;base64,${Buffer.from(inlineModule(file)).toString('base64')}")`;
  });
}
html=html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,(_,url)=>`<script type="module">${inlineModule(url).replaceAll('</script','<\\/script')}</script>`);
html=html.replaceAll('/brand-mark.svg',`data:image/svg+xml;base64,${readAsset('/brand-mark.svg').toString('base64')}`);
assert.ok(!/(?:src|href)="\/assets\//.test(html),'All local entry assets must be inlined');
assert.ok(!/url\(['"]?\/assets\//.test(html),'All fonts must be inlined');
assert.ok(html.includes('id="app"') && html.includes('<style>') && html.includes('<script type="module">'));
assert.ok(!/import\(['"`]\.\//.test(html),'Standalone dynamic imports must be embedded');
fs.mkdirSync('standalone',{recursive:true});
fs.writeFileSync('standalone/index.html',html);
console.log(`Single-file app: standalone/index.html (${Math.round(Buffer.byteLength(html)/1024)} KB). Steam covers and optional confetti use external CDNs.`);
