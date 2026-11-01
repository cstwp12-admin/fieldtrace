import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { previewSetup } from '../src/exchange/setup';
import { syntheticSetup } from '../src/exchange/synthetic-setup';
import { demoObservations } from '../src/domain/demo';
import { linkEvidence, validateLinks } from '../src/exchange/sdr-links';
import { makeReference, makeReferencePackage, validateReferencePackage, resolveReference, sharedKey } from '../src/exchange/sdr-reference.js';
import { buildCasePackage } from '../src/exchange/cases';
import { backupData } from '../src/exchange/files';
import { saveProject, commitObservation, loadObservations, restoreCopy } from '../src/storage/database';
import { classifyCase, sealPackage, sha, validatePackage, periodCases } from '../src/exchange/case-contract.js';
async function fixture(){
  const project=(await previewSetup(structuredClone(syntheticSetup))).project,s=project.shared!,at='2026-10-01T04:00:00.000Z';
  const item={no:1,activity:'Synthetic drain inspection',location:'CH 11+200 RHS',remarks:'Training evidence only',photo:{page:2}};
  const report={ref:'TRAINING-SDR-20261001-001',date:'2026-10-01',reporter:'Training inspector',team:'QA',pdfDigest:await sha('Synthetic PDF bytes for contract test'),items:[item]};
  const ref=await makeReference(report,item,s.projectKey);
  const observation={...demoObservations()[0],projectId:project.id,chainage:11200,createdAt:at,updatedAt:at,history:[{at,by:'Training inspector',status:'Reported' as const,note:'Training observation'}],projectContext:{projectKey:s.projectKey,setupRevision:s.setupRevision,alignmentRevision:s.alignmentRevision}};
  return {project,observation,report,item,ref,pkg:await makeReferencePackage([ref],s.projectKey)};
}
describe('SDR evidence references',()=>{
  it('agrees with Phase 3A project identity and retains PDF/item/photo-page locators',async()=>{
    const {project,pkg,ref}=await fixture(),s=project.shared!;
    expect(await sharedKey({source:'sdr-setup',projectCode:s.projectCode,contractNo:s.contractNo},null)).toBe(s.projectKey);
    expect((await validateReferencePackage(pkg,s.projectKey)).references[0]).toEqual(ref);
    expect(ref.photoPage).toBe(2);expect(Object.keys(ref)).not.toContain('photos');
  });
  it('rejects another project, metadata damage, invalid dates, repeated references and hidden fields',async()=>{
    const {pkg,ref,report,item}=await fixture();await expect(validateReferencePackage(pkg,'other')).rejects.toThrow('shared project');
    const bad=structuredClone(pkg);bad.references[0].remarks='Changed';await expect(validateReferencePackage(bad,ref.projectKey)).rejects.toThrow('snapshot digest');
    await expect(validateReferencePackage({...pkg,references:[ref,ref]},ref.projectKey)).rejects.toThrow('Duplicate');
    await expect(makeReference({...report,date:'2026-02-30'},item,ref.projectKey)).rejects.toThrow('date');
    await expect(validateReferencePackage({...pkg,references:[{...ref,url:'https://example.test'}]},ref.projectKey)).rejects.toThrow('Unsupported');
  });
  it('distinguishes matching, missing, ambiguous, revised and unverified source PDFs',async()=>{
    const {report,ref}=await fixture();expect((await resolveReference(ref,[report])).state).toBe('matched');
    expect((await resolveReference(ref,[])).state).toBe('missing');expect((await resolveReference(ref,[report,report])).state).toBe('ambiguous');
    expect((await resolveReference(ref,[{...report,pdfDigest:'0'.repeat(64)}])).state).toBe('changed');
    expect((await resolveReference(ref,[{...report,pdfDigest:undefined}])).state).toBe('unverified');
    expect((await resolveReference(ref,[{...report,items:[{...report.items[0],remarks:'Changed metadata'}]}])).state).toBe('changed');
  });
  it('adds an append-only evidence event without copying photos or changing case status',async()=>{
    const {project,observation,ref}=await fixture(),linked=await linkEvidence(observation,[ref],'Training engineer','Reviewed source report');
    expect(linked.status).toBe(observation.status);expect(linked.photos).toEqual(observation.photos);expect(linked.history.at(-1)).toMatchObject({kind:'sdr-link',evidenceRefs:[ref]});
    const before=await buildCasePackage(project,[observation]),after=await buildCasePackage(project,[linked]);expect(classifyCase(after.cases[0],before.cases[0])).toBe('update');
    expect(after.schemaVersion).toBe('fieldtrace-cases/2');
    expect((await validatePackage(await sealPackage({...before,schemaVersion:'fieldtrace-cases/1'}))).schemaVersion).toBe('fieldtrace-cases/1');
    const closed={...observation,status:'Closed' as const,updatedAt:'2026-10-03T04:00:00.000Z',history:[...observation.history,{at:'2026-10-02T04:00:00.000Z',by:'Training contractor',status:'Action taken' as const,note:'Action complete'},{at:'2026-10-03T04:00:00.000Z',by:'Training engineer',status:'Closed' as const,note:'Verified closure'}]};
    const reviewed=await linkEvidence(closed,[ref],'Training engineer','Source reference retained');expect(reviewed.status).toBe('Closed');expect((await buildCasePackage(project,[reviewed])).cases[0].record.status).toBe('Closed');expect(after.attachments).toEqual(before.attachments);
    await expect(validatePackage(await sealPackage({...after,schemaVersion:'fieldtrace-cases/1'}))).rejects.toThrow('version 2');
    await expect(linkEvidence(linked,[ref],'Training engineer','Repeated')).rejects.toThrow('already linked');
    await expect(linkEvidence(observation,[{...ref,projectKey:'other'}],'Training engineer','Wrong project')).rejects.toThrow('identity');
    await expect(linkEvidence(observation,[ref],'','No author')).rejects.toThrow('your name');
  });
  it('preserves links through local commit, recovery and case export',async()=>{
    const {project,observation,ref}=await fixture();await saveProject(project);await commitObservation(observation,'unused');
    const linked=await linkEvidence(observation,[ref],'Training engineer','Reviewed source report');await commitObservation(linked,'unused',observation.updatedAt);
    await expect(commitObservation(linked,'unused',observation.updatedAt)).rejects.toThrow('another window');
    const backup=backupData(project,await loadObservations(project.id));expect(backup.schemaVersion).toBe('fieldtrace-backup/5');
    const restored=await restoreCopy(backup),rows=await loadObservations(restored.id);await validateLinks(rows[0]);expect(rows[0].history.at(-1)?.evidenceRefs).toEqual([ref]);
    expect((await buildCasePackage(restored,rows)).cases[0].record.history.at(-1)?.evidenceRefs).toEqual([ref]);
    const bad=structuredClone(backup);bad.observations[0].history.at(-1)!.evidenceRefs![0].remarks='Damaged';await expect(restoreCopy(bad)).rejects.toThrow('digest');
  });
  it('keeps future source links out of historical report periods',async()=>{
    const {observation,ref}=await fixture(),linked=await linkEvidence(observation,[ref],'Training engineer','Review');
    const scoped=periodCases([{envelope:{record:linked}}],'2026-10-01','2026-10-02') as any[];expect(scoped[0].envelope.record.history).toHaveLength(1);
  });
  const site=new URL('../../07_SiteBoard/app/js/',import.meta.url);
  it.skipIf(!existsSync(site))('keeps both portable reference validators aligned and includes links in SiteBoard reports',async()=>{
    expect(readFileSync(new URL('sdr-reference.js',site),'utf8').replace(/\r\n/g,'\n').replace("'./fieldtrace-contract.js'","'./case-contract.js'")).toBe(readFileSync(new URL('../src/exchange/sdr-reference.js',import.meta.url),'utf8').replace(/\r\n/g,'\n'));
    const {project,observation,ref,pkg}=await fixture(),linked=await linkEvidence(observation,[ref],'Training engineer','Evidence review');
    const file=fileURLToPath(new URL('fieldtrace-report.js',site)).replaceAll('\\','/'),{fieldtraceModel}=await import(/* @vite-ignore */ file);
    const envelope=(await buildCasePackage(project,[linked])).cases[0],model=fieldtraceModel([{envelope}],{}, {},'2026-10-01','2026-12-31');
    expect(model.blocks.some((b:any)=>b.x?.includes(ref.pdfDigest))).toBe(true);
    writeFileSync(new URL('../.qa/phase3c-references.json',import.meta.url),JSON.stringify(pkg));
  });
});
