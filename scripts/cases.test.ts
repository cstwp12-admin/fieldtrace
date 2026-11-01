import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { previewSetup } from '../src/exchange/setup';
import { syntheticSetup } from '../src/exchange/synthetic-setup';
import { demoObservations } from '../src/domain/demo';
import { buildCasePackage } from '../src/exchange/cases';
import { backupData } from '../src/exchange/files';
import { restoreCopy, loadObservations } from '../src/storage/database';
import { classifyCase, envelopeBody, periodCases, sealPackage, sha, validatePackage, type CaseEnvelope } from '../src/exchange/case-contract.js';

const pixel={id:'original',name:'synthetic-pixel.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6i4sAAAAASUVORK5CYII='};
async function fixture(){
  const project=(await previewSetup(structuredClone(syntheticSetup))).project,s=project.shared!;
  const at='2026-10-01T04:00:00.000Z';
  const observation={...demoObservations()[0],projectId:project.id,chainage:11000,createdAt:at,updatedAt:at,photos:[pixel],history:[{at,by:'Training inspector',status:'Reported' as const,note:'Synthetic observation'}],projectContext:{projectKey:s.projectKey,setupRevision:s.setupRevision,alignmentRevision:s.alignmentRevision,assetId:s.structures[0].id,activityId:s.activities[0].id}};
  return {project,observation,pkg:await buildCasePackage(project,[observation])};
}
async function advance(e:CaseEnvelope,status:'Action taken'|'Closed',at:string){const next=structuredClone(e);next.record.status=status;next.record.updatedAt=at;next.record.history.push({at,by:'Training engineer',status,note:'Synthetic follow-up',photos:[{...pixel,id:status}]});next.revision=await sha(envelopeBody(next));return next;}

describe('private case exchange',()=>{
  it('exports shared IDs, capture geometry and original/event attachments',async()=>{
    const {pkg}=await fixture(),e=await advance(pkg.cases[0],'Action taken','2026-10-02T04:00:00.000Z');
    const data=await validatePackage(await sealPackage({...pkg,cases:[e]}));
    expect(e.record.projectId).toBe(pkg.project.key);expect(e.geometry?.coordinates).toEqual([112.008,4.008]);
    expect(data.attachments).toHaveLength(2);expect(e.asset?.id).toBe('B-EXAMPLE');
    expect(data.attachments[1]).toMatchObject({eventIndex:1,mime:'image/png'});
  });
  it('retains the same permanent ID and content after repeated backup restores',async()=>{
    const {project,observation,pkg}=await fixture();
    const copy=await restoreCopy(backupData(project,[observation]));const rows=await loadObservations(copy.id);
    expect(rows[0].id).not.toBe(observation.id);expect(rows[0].sourceId).toBe(observation.id);
    const second=await restoreCopy(backupData(copy,rows));
    expect((await buildCasePackage(second,await loadObservations(second.id))).cases[0]).toEqual(pkg.cases[0]);
    expect(backupData(copy,rows).schemaVersion).toBe('fieldtrace-backup/5');
  });
  it('classifies duplicates, append-only updates, older versions and divergent histories',async()=>{
    const {pkg}=await fixture(),a=pkg.cases[0],b=await advance(a,'Action taken','2026-10-02T04:00:00.000Z');
    expect(classifyCase(a)).toBe('new');expect(classifyCase(a,a)).toBe('duplicate');expect(classifyCase(b,a)).toBe('update');expect(classifyCase(a,b)).toBe('stale');
    const fork=structuredClone(b);fork.record.history[0].note='Divergent evidence';fork.revision=await sha(envelopeBody(fork));expect(classifyCase(fork,b)).toBe('conflict');
  });
  it('rejects changed evidence, missing manifests and mismatched context',async()=>{
    const {pkg}=await fixture(),changed=structuredClone(pkg);changed.cases[0].record.photos[0].name='Changed';await expect(validatePackage(changed)).rejects.toThrow('digest');
    await expect(validatePackage({...pkg,attachments:[]})).rejects.toThrow('manifest');
    const bad=structuredClone(pkg);bad.cases[0].record.projectContext!.projectKey='another';await expect(validatePackage(bad)).rejects.toThrow('reference');
  });
  it('refuses legacy records without shared context and preserves chainage-only cases',async()=>{
    const {project,observation}=await fixture();await expect(buildCasePackage(project,[{...observation,projectContext:undefined}])).rejects.toThrow('shared project');
    const p=(await previewSetup({...structuredClone(syntheticSetup),centreline:[]})).project,s=p.shared!;
    const o={...observation,projectId:p.id,projectContext:{projectKey:s.projectKey,setupRevision:s.setupRevision,alignmentRevision:s.alignmentRevision}};
    expect((await buildCasePackage(p,[o])).cases[0].geometry).toBeNull();
  });
  it('uses the capture snapshot when a newer alignment is installed',async()=>{
    const {project,observation,pkg}=await fixture();const raw=structuredClone(syntheticSetup);raw.centreline[1][0]+=0.001;
    const next=(await previewSetup(raw)).project;
    next.setupHistory=[{name:project.name,route:project.route,alignment:project.alignment,shared:project.shared!}];
    const e=(await buildCasePackage(next,[{...observation,projectId:next.id}])).cases[0];expect(e).toEqual(pkg.cases[0]);
  });
  it('reports status through cutoff, open backlog, and excludes future/old closure evidence',async()=>{
    const {pkg}=await fixture(),a=await advance(pkg.cases[0],'Action taken','2026-10-02T04:00:00.000Z'),b=await advance(a,'Closed','2026-10-05T04:00:00.000Z');
    const rows=periodCases([{envelope:b}],'2026-10-03','2026-10-04') as {envelope:CaseEnvelope}[];
    expect(rows[0].envelope.record.status).toBe('Action taken');expect(rows[0].envelope.record.history).toHaveLength(2);
    expect(periodCases([{envelope:b}],'2026-10-06','2026-10-08')).toEqual([]);expect(periodCases([{envelope:b}],'2026-09-01','2026-09-30')).toEqual([]);
    expect(b.record.status).toBe('Closed');
  });
});

const site=new URL('../../07_SiteBoard/app/js/',import.meta.url);
describe.skipIf(!existsSync(new URL('fieldtrace-store.js',site)))('SiteBoard compatibility and atomic inbox',()=>{
  async function modules(){
    const data=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)}});
    // SiteBoard remains an independent plain-JavaScript app.
    const path=fileURLToPath(new URL('fieldtrace-store.js',site)).replaceAll('\\','/');
    return await import(/* @vite-ignore */ path);
  }
  const active=(pkg:Awaited<ReturnType<typeof buildCasePackage>>)=>({source:'sdr-setup',projectCode:pkg.project.code,projectTitle:pkg.project.title,contractNo:pkg.project.contractNo,sharedProjectId:pkg.project.key,chFrom:pkg.project.chFrom,chTo:pkg.project.chTo,centreline:pkg.project.alignment.map(a=>[a.lon,a.lat,a.chainage])});
  it('ships the same contract in both apps',()=>expect(readFileSync(new URL('fieldtrace-contract.js',site),'utf8').replace(/\r\n/g,'\n')).toBe(readFileSync(new URL('../src/exchange/case-contract.js',import.meta.url),'utf8').replace(/\r\n/g,'\n')));
  it('previews without writes, commits atomically and rejects stale concurrent plans',async()=>{
    const m=await modules(),{pkg}=await fixture(),cfg=active(pkg),empty=m.emptyInbox(),plan=await m.planImport(pkg,empty,cfg);
    expect(empty.cases).toHaveLength(0);const saved=await m.commitImport(plan,{});expect(saved.cases).toHaveLength(1);
    await expect(m.commitImport(plan,{})).rejects.toThrow('another window');expect((await m.readInbox()).generation).toBe(saved.generation);
    const again=m.applyPlan(saved,await m.planImport(pkg,saved,cfg));expect(again.cases).toHaveLength(1);expect(again.imports).toHaveLength(2);
    const advanced=await advance(pkg.cases[0],'Action taken','2026-10-02T04:00:00.000Z'),updated=await sealPackage({...pkg,packageId:crypto.randomUUID(),cases:[advanced]});
    const next=m.applyPlan(again,await m.planImport(updated,again,cfg));expect(next.cases[0].envelope.record.history).toHaveLength(2);expect(next.imports.at(-1).counts.updated).toBe(1);
  });
  it('does not delete omitted cases and archives explicit conflict replacements',async()=>{
    const m=await modules(),{pkg}=await fixture(),cfg=active(pkg);let inbox=m.applyPlan(m.emptyInbox(),await m.planImport(pkg,m.emptyInbox(),cfg));
    const incoming=structuredClone(pkg.cases[0]);incoming.record.title='Reviewed fork';incoming.revision=await sha(envelopeBody(incoming));
    const p=await sealPackage({...pkg,packageId:crypto.randomUUID(),cases:[incoming]});const plan=await m.planImport(p,inbox,cfg);
    expect(m.applyPlan(inbox,plan).cases[0].envelope.record.title).not.toBe('Reviewed fork');
    inbox=m.applyPlan(inbox,plan,{[incoming.caseId]:'incoming'});expect(inbox.cases[0].previous[0].envelope).toEqual(pkg.cases[0]);
    const other=structuredClone(pkg.cases[0]);other.caseId=crypto.randomUUID();other.record.id=other.caseId;other.revision=await sha(envelopeBody(other));
    const partial=await sealPackage({...pkg,packageId:crypto.randomUUID(),cases:[other]});expect(m.applyPlan(inbox,await m.planImport(partial,inbox,cfg)).cases).toHaveLength(2);
  });
  it('rejects an over-capacity inbox before changing stored records',async()=>{
    const m=await modules(),{pkg}=await fixture(),cfg=active(pkg),empty=m.emptyInbox();
    const plan=await m.planImport(pkg,empty,cfg),crowded={...empty,cases:Array.from({length:10001},(_,i)=>({envelope:{...pkg.cases[0],caseId:'synthetic-'+i}}))};
    expect(()=>m.applyPlan(crowded,plan)).toThrow('recovery capacity');expect((await m.readInbox()).cases).toHaveLength(1);
  });
  it('blocks wrong/default project, alignment mismatch and package ID reuse',async()=>{
    const m=await modules(),{pkg}=await fixture(),cfg=active(pkg),empty=m.emptyInbox();
    await expect(m.planImport(pkg,empty,{...cfg,source:'defaults'})).rejects.toThrow('authoritative');
    await expect(m.planImport(pkg,empty,{...cfg,contractNo:'different'})).rejects.toThrow('does not match');
    await expect(m.planImport(pkg,empty,{...cfg,centreline:[]})).rejects.toThrow('Alignment');
    const saved=m.applyPlan(empty,await m.planImport(pkg,empty,cfg));await expect(m.planImport({...pkg,contentDigest:'0'.repeat(64)},saved,cfg)).rejects.toThrow('previously used');
  });
  it('backs up accepted evidence/provenance and rejects damaged or wrong-workspace recovery',async()=>{
    const m=await modules(),{pkg}=await fixture(),cfg=active(pkg),empty=m.emptyInbox(),saved=m.applyPlan(empty,await m.planImport(pkg,empty,cfg));
    const backup=JSON.parse(JSON.stringify(m.inboxBackup(saved,cfg)));expect((await m.validateInboxBackup(backup,cfg)).inbox.cases[0].envelope).toEqual(pkg.cases[0]);
    const bad=structuredClone(backup);bad.inbox.cases[0].envelope.record.history[0].note='Damaged';await expect(m.validateInboxBackup(bad,cfg)).rejects.toThrow('digest');
    await expect(m.validateInboxBackup(backup,{...cfg,projectCode:'Wrong'})).rejects.toThrow('same SDR setup');
    await expect(m.restoreInbox(backup,0)).rejects.toThrow('empty');
    const path=fileURLToPath(new URL('db.js',site)).replaceAll('\\','/'),{dbDel}=await import(/* @vite-ignore */ path);await dbDel('meta',m.INBOX_KEY);
    const recovered=await m.restoreInbox(backup,0);expect(recovered.cases).toEqual(saved.cases);expect((await m.readInbox()).cases).toEqual(saved.cases);
  });
  it('adds an explicitly separated report section with event evidence',async()=>{
    const {pkg}=await fixture(),e=await advance(pkg.cases[0],'Action taken','2026-10-02T04:00:00.000Z');
    const path=fileURLToPath(new URL('fieldtrace-report.js',site)).replaceAll('\\','/');const {fieldtraceModel}=await import(/* @vite-ignore */ path);
    const rows=periodCases([{envelope:e,provenance:{packageId:pkg.packageId,importedAt:pkg.exportedAt}}],'2026-10-01','2026-10-03');
    const model=fieldtraceModel(rows,active(pkg),{},'2026-10-01','2026-10-03',{photos:true});
    expect(model.blocks.filter((b:{t:string})=>b.t==='fieldtraceImage')).toHaveLength(2);expect(model.sourceNote).toContain('no SDR submission');
    // Synthetic browser fixture stays ignored and never enters either build.
    writeFileSync(new URL('../.qa/phase3b-package.json',import.meta.url),JSON.stringify(await sealPackage({...pkg,cases:[e]})));
    writeFileSync(new URL('../.qa/phase3b-setup.json',import.meta.url),JSON.stringify(syntheticSetup));
  });
});
