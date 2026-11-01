import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { expect, it } from 'vitest';
import { offlineSource } from './build-offline.mjs';

it('pre-caches application files under a GitHub subpath and returns cached navigation offline',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'fieldtrace-offline-'));
  try{
    await writeFile(path.join(dir,'index.html'),'<h1>Synthetic offline application</h1>');
    await writeFile(path.join(dir,'pilot.html'),'<h1>Synthetic pilot worksheet</h1>');
    const source=await offlineSource(dir.replaceAll('\\','/'));
    const listeners:Record<string,(event:any)=>void>={};
    const stored=new Map<string,Response>();
    let ignoredVary=false;
    const cache={addAll:async(urls:string[])=>{urls.forEach(u=>stored.set(u,new Response(u.endsWith('pilot.html')?'cached pilot worksheet':'cached shell')));},match:async(req:string|Request,options?:{ignoreVary?:boolean})=>{if(options?.ignoreVary)ignoredVary=true;return stored.get(typeof req==='string'?req:req.url);}};
    const scope='https://example.github.io/fieldtrace/';
    const context={URL,self:{registration:{scope},location:{origin:'https://example.github.io'},clients:{claim:async()=>{}},addEventListener:(name:string,fn:any)=>listeners[name]=fn},caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},fetch:()=>{throw Error('Network must not be needed');}};
    vm.runInNewContext(source,context);
    let install:Promise<unknown>|undefined;listeners.install({waitUntil:(p:Promise<unknown>)=>install=p});await install;
    expect([...stored.keys()]).toEqual([`${scope}index.html`,`${scope}pilot.html`]);
    let response:Promise<Response>|undefined;
    listeners.fetch({request:{method:'GET',url:scope,mode:'navigate'},respondWith:(p:Promise<Response>)=>response=p});
    expect(await (await response)!.text()).toBe('cached shell');
    listeners.fetch({request:{method:'GET',url:`${scope}index.html`,mode:'cors'},respondWith:(p:Promise<Response>)=>response=p});
    await response;expect(ignoredVary).toBe(true);
    listeners.fetch({request:{method:'GET',url:scope+'pilot.html?from=project-data',mode:'navigate'},respondWith:(p:Promise<Response>)=>response=p});
    expect(await (await response)!.text()).toBe('cached pilot worksheet');
    let intercepted=false;listeners.fetch({request:{method:'GET',url:'https://other.example/private.jpg',mode:'no-cors'},respondWith:()=>intercepted=true});
    expect(intercepted).toBe(false);
  }finally{await rm(dir,{recursive:true,force:true});}
});
