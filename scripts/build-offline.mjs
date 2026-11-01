import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export async function offlineSource(root='dist') {
  const files=[];
  async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,f.name);if(f.isDirectory())await walk(file);else if(f.name!=='sw.js')files.push(file.replaceAll('\\','/').slice(root.length+1));}}
  await walk(root);files.sort();
  const hash=createHash('sha256');for(const f of files)hash.update(await readFile(path.join(root,f)));
  return `// Generated application shell only. Project files never enter this cache.\nconst FILES=${JSON.stringify(files)};\nconst VERSION=${JSON.stringify(hash.digest('hex').slice(0,16))};
const PREFIX='fieldtrace-shell:'+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
const urls=FILES.map(file=>new URL(file,self.registration.scope).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls)));});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  if(event.request.mode==='navigate'){
    const clean=url.origin+url.pathname;
    const target=urls.includes(clean)?clean:new URL('index.html',self.registration.scope).href;
    event.respondWith(caches.open(CACHE).then(cache=>cache.match(target,{ignoreVary:true})).then(response=>response||fetch(event.request)));return;
  }
  // These are allowlisted public shell assets. Ignore Vary so module CORS headers
  // cannot make a precached response miss when the application is reopened offline.
  if(urls.includes(url.href))event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.href,{ignoreVary:true})).then(response=>response||fetch(event.request)));
});\n`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve('scripts/build-offline.mjs')){
  await writeFile('dist/sw.js',await offlineSource());console.log('Offline shell generated with versioned application assets.');
}
