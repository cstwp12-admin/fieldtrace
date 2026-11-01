import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { demoObservations } from '../domain/demo';
import { projectRange, type Observation } from '../domain/model';
import { previewSetup, revisions } from '../exchange/setup';
import { syntheticSetup } from '../exchange/synthetic-setup';
import { applySetupImport, commitObservation, loadDraft, loadObservations, loadProjects, restoreCopy, saveDraft } from './database';
import { backupData } from '../exchange/files';

const candidate=async()=> (await previewSetup(structuredClone(syntheticSetup))).project;
describe('reviewed shared setup imports',()=>{
  it('creates distinct local workspaces and applies a repeated setup without duplicating records',async()=>{
    const p=await applySetupImport(await candidate());
    const o:Observation={...demoObservations()[0],projectId:p.id,chainage:11200,projectContext:{projectKey:p.shared!.projectKey,setupRevision:p.shared!.setupRevision,alignmentRevision:p.shared!.alignmentRevision,assetId:'B-EXAMPLE',activityId:'ACT-EXAMPLE-1'}};
    await commitObservation(o,`observation:${p.id}`);
    const count=(await loadProjects()).length;
    const same=await applySetupImport(await candidate(),p.id,p.shared!.setupRevision);
    expect(same).toEqual(p);expect(await loadProjects()).toHaveLength(count);expect(await loadObservations(p.id)).toHaveLength(1);
    const separate=await applySetupImport(await candidate());expect(separate.id).not.toBe(p.id);
    expect(separate.shared!.projectKey).toBe(p.shared!.projectKey);
  });
  it('keeps observation revision references when a reviewed alignment update is applied',async()=>{
    const p=await applySetupImport(await candidate());
    const o:Observation={...demoObservations()[0],projectId:p.id,chainage:11200,projectContext:{projectKey:p.shared!.projectKey,setupRevision:p.shared!.setupRevision,alignmentRevision:p.shared!.alignmentRevision,assetId:'B-EXAMPLE'}};
    await commitObservation(o,`observation:${p.id}`);
    const raw=structuredClone(syntheticSetup);raw.version=2;raw.centreline[1][0]+=0.0001;
    const next=(await previewSetup(raw)).project;
    const updated=await applySetupImport(next,p.id,p.shared!.setupRevision);
    expect(updated.id).toBe(p.id);expect(updated.shared!.alignmentRevision).not.toBe(p.shared!.alignmentRevision);
    expect(updated.setupHistory?.[0].shared.setupRevision).toBe(p.shared!.setupRevision);
    expect(updated.setupHistory?.[0].alignment).toEqual(p.alignment);
    expect((await loadObservations(p.id))[0].projectContext).toEqual(o.projectContext);
    const restored=await restoreCopy(backupData(updated,await loadObservations(p.id)));
    expect(restored.setupHistory).toEqual(updated.setupHistory);
    expect((await loadObservations(restored.id))[0].projectContext).toEqual(o.projectContext);
    expect((await previewSetup(JSON.parse(JSON.stringify(restored)))).project.setupHistory).toEqual(updated.setupHistory);
    await expect(applySetupImport(next,p.id,p.shared!.setupRevision)).rejects.toThrow('another window');
  });
  it('blocks range shrink and referenced asset/activity removal without changing existing data',async()=>{
    const p=await applySetupImport(await candidate());
    const o:Observation={...demoObservations()[0],projectId:p.id,chainage:11200,projectContext:{projectKey:p.shared!.projectKey,setupRevision:p.shared!.setupRevision,alignmentRevision:p.shared!.alignmentRevision,assetId:'B-EXAMPLE',activityId:'ACT-EXAMPLE-1'}};
    await commitObservation(o,`observation:${p.id}`);
    const removed=structuredClone(syntheticSetup);removed.structures=removed.structures.filter(a=>a.id!=='B-EXAMPLE');
    await expect(applySetupImport((await previewSetup(removed)).project,p.id,p.shared!.setupRevision)).rejects.toThrow('structure used');
    const activity=structuredClone(syntheticSetup);activity.activities=activity.activities.filter(a=>a.id!=='ACT-EXAMPLE-1');
    await expect(applySetupImport((await previewSetup(activity)).project,p.id,p.shared!.setupRevision)).rejects.toThrow('activity used');
    const lower=(await candidate());lower.shared!.chFrom=11500;lower.shared!.zones=lower.shared!.zones.slice(1);lower.shared!.sections=lower.shared!.sections.slice(1);lower.shared!.structures=lower.shared!.structures.slice(1);lower.alignment=lower.alignment.filter(a=>a.chainage>=12000);Object.assign(lower.shared!,await revisions(lower));
    await expect(applySetupImport(lower,p.id,p.shared!.setupRevision)).rejects.toThrow('exclude an existing observation');
    expect((await loadObservations(p.id))[0]).toEqual(o);expect(projectRange(p).from).toBe(10000);
  });
  it('protects draft asset references even when draft chainage is incomplete',async()=>{
    const p=await applySetupImport(await candidate());
    const d={id:`observation:${p.id}`,projectId:p.id,updatedAt:new Date().toISOString(),fields:{chainage:'12+',assetId:'B-EXAMPLE'},photos:[]};await saveDraft(d);
    const raw=structuredClone(syntheticSetup);raw.structures=raw.structures.filter(a=>a.id!=='B-EXAMPLE');
    await expect(applySetupImport((await previewSetup(raw)).project,p.id,p.shared!.setupRevision)).rejects.toThrow('selected in a draft');
    expect(await loadDraft(d.id)).toEqual(d);
  });
  it('restores shared identity and reimports exported configurations despite a local restored label',async()=>{
    const p=await applySetupImport(await candidate());const restored=await restoreCopy(backupData(p,[]));
    expect(restored.shared).toEqual(p.shared);expect(restored.id).not.toBe(p.id);
    expect((await previewSetup(JSON.parse(JSON.stringify(restored)))).project.shared).toEqual(p.shared);
  });
  it('refuses newly submitted observations based on a stale setup revision',async()=>{
    const p=await applySetupImport(await candidate());
    const o:Observation={...demoObservations()[0],projectId:p.id,chainage:11200,projectContext:{projectKey:p.shared!.projectKey,setupRevision:'0'.repeat(64),alignmentRevision:p.shared!.alignmentRevision}};
    await expect(commitObservation(o,`observation:${p.id}`)).rejects.toThrow('setup changed');expect(await loadObservations(p.id)).toEqual([]);
  });
});
