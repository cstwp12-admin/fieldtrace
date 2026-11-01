import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { previewSetup } from '../src/exchange/setup';
import { syntheticSetup } from '../src/exchange/synthetic-setup';
import { demoObservations } from '../src/domain/demo';
import { backupData } from '../src/exchange/files';
import { buildCasePackage } from '../src/exchange/cases';
import { saveProject,saveDraft,loadDraft,loadObservations,loadProjects,commitObservation,restoreCopy } from '../src/storage/database';

async function fixture(){const p=(await previewSetup(structuredClone(syntheticSetup))).project,s=p.shared!,at='2026-10-01T04:00:00.000Z';await saveProject(p);const o={...demoObservations()[0],projectId:p.id,chainage:11200,createdAt:at,updatedAt:at,history:[{at,status:'Reported' as const,by:'Training inspector',note:'Synthetic pilot record'}],projectContext:{projectKey:s.projectKey,setupRevision:s.setupRevision,alignmentRevision:s.alignmentRevision}};return {p,o};}
async function fault(method:'put'|'delete'|'add',store:string,work:()=>Promise<void>){
  const proto=IDBObjectStore.prototype,old=proto[method];
  Object.defineProperty(proto,method,{configurable:true,writable:true,value:function(this:IDBObjectStore,...args:unknown[]){if(this.name===store)throw new DOMException('Synthetic storage failure','QuotaExceededError');return Reflect.apply(old,this,args);}});
  try{await work();}finally{Object.defineProperty(proto,method,{configurable:true,writable:true,value:old});}
}
describe('field pilot failure retention',()=>{
  it('retains a saved draft when a subsequent draft write fails',async()=>{
    const {p}=await fixture(),draft={id:'observation:'+p.id,projectId:p.id,updatedAt:new Date().toISOString(),fields:{title:'Retain saved draft'},photos:[]};await saveDraft(draft);
    await fault('put','drafts',async()=>{await expect(saveDraft({...draft,fields:{title:'Unsaved edit'}})).rejects.toThrow();});expect(await loadDraft(draft.id)).toEqual(draft);
  });
  it('retains the draft and adds no observation when the observation write fails',async()=>{
    const {p,o}=await fixture(),draft={id:'observation:'+p.id,projectId:p.id,updatedAt:o.createdAt,fields:{title:o.title},photos:[]};await saveDraft(draft);
    await fault('put','observations',async()=>{await expect(commitObservation(o,draft.id)).rejects.toThrow();});expect(await loadDraft(draft.id)).toEqual(draft);expect(await loadObservations(p.id)).toEqual([]);
  });
  it('rolls back the observation if deleting its draft fails after the write',async()=>{
    const {p,o}=await fixture(),id='observation:'+p.id;await saveDraft({id,projectId:p.id,updatedAt:o.createdAt,fields:{title:o.title},photos:[]});
    await fault('delete','drafts',async()=>{await expect(commitObservation(o,id)).rejects.toThrow();});expect(await loadDraft(id)).toBeDefined();expect(await loadObservations(p.id)).toEqual([]);
    await commitObservation(o,id);expect(await loadDraft(id)).toBeUndefined();expect(await loadObservations(p.id)).toHaveLength(1);
  });
  it('rolls back the entire restore if a draft cannot be restored',async()=>{
    const {p,o}=await fixture();await commitObservation(o,'none');const draft={id:'observation:'+p.id,projectId:p.id,updatedAt:o.createdAt,fields:{title:'Retained unfinished record'},photos:[]},data=backupData(p,[o],[draft]),before=(await loadProjects()).length;
    await fault('add','drafts',async()=>{await expect(restoreCopy(data)).rejects.toThrow();});expect(await loadProjects()).toHaveLength(before);expect((await loadObservations(p.id))[0]).toEqual(o);
  });
});

function crc32(bytes:Buffer){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
function chunk(type:string,data:Buffer){const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
function syntheticLargePng(){const w=1024,h=384,header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=2;const raw=Buffer.alloc((w*3+1)*h);let seed=123456789;for(let y=0;y<h;y++)for(let x=1;x<=w*3;x++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;raw[y*(w*3+1)+x]=seed&255;}return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
it('recovers a substantial photographic pilot and preserves source identity on re-export',async()=>{
  const start=performance.now(),{p,o}=await fixture(),png=syntheticLargePng(),data='data:image/png;base64,'+png.toString('base64');expect(png.byteLength).toBeGreaterThan(1024*1024);
  const photo=(id:string)=>({id,name:'synthetic-noise.png',data}),records=Array.from({length:6},(_,i)=>{const at='2026-10-01T04:00:00.000Z',action='2026-10-02T04:00:00.000Z',closed='2026-10-03T04:00:00.000Z';return {...o,id:crypto.randomUUID(),ref:'PILOT-'+(i+1),chainage:11200+i*20,status:'Closed' as const,photos:[photo('original-'+i)],updatedAt:closed,history:[{at,by:'Training inspector',status:'Reported' as const,note:'Original training condition'},{at:action,by:'Training contractor',status:'Action taken' as const,note:'Training correction',photos:[photo('action-'+i)]},{at:closed,by:'Training engineer',status:'Closed' as const,note:'Training verification',photos:[photo('verified-'+i)]}]};});
  const draft={id:'observation:'+p.id,projectId:p.id,updatedAt:o.createdAt,fields:{title:'Unfinished training observation'},photos:[photo('draft')]};
  const serialized=JSON.stringify(backupData(p,records,[draft])),bytes=new Blob([serialized]).size;expect(bytes).toBeGreaterThan(25*1024*1024);expect(bytes).toBeLessThan(40*1024*1024);
  const restoreStart=performance.now(),copy=await restoreCopy(JSON.parse(serialized)),restored=await loadObservations(copy.id),restoreMs=performance.now()-restoreStart;
  expect(restored).toHaveLength(6);expect(restored.flatMap(r=>[...r.photos,...r.history.flatMap(h=>h.photos??[])])).toHaveLength(18);expect((await loadDraft('observation:'+copy.id))?.photos[0].data).toBe(data);
  for(const original of records){const row=restored.find(r=>r.ref===original.ref)!;expect(row.sourceId).toBe(original.id);expect(row.history).toEqual(original.history);expect(row.photos).toEqual(original.photos);}
  const exportStart=performance.now(),pkg=await buildCasePackage(copy,restored),exportMs=performance.now()-exportStart;expect(pkg.attachments).toHaveLength(18);expect(pkg.cases.map(c=>c.caseId).sort()).toEqual(records.map(r=>r.id).sort());
  mkdirSync(new URL('../.qa/',import.meta.url),{recursive:true});
  writeFileSync(new URL('../.qa/phase4-local-validation.json',import.meta.url),JSON.stringify({scope:'Synthetic desktop/in-memory IndexedDB trial; not a physical-phone or real-quota result',recordedAt:new Date().toISOString(),cases:6,submittedPhotos:18,draftPhotos:1,photoBytes:png.byteLength,backupBytes:bytes,restoreMs:Math.round(restoreMs),exchangeBuildMs:Math.round(exportMs),totalMs:Math.round(performance.now()-start)},null,2));
  writeFileSync(new URL('../.qa/synthetic-large.png',import.meta.url),png);
},30000);
