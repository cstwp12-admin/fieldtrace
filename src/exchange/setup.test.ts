import { describe, expect, it } from 'vitest';
import { backupSchema, canMap, locationContext, projectRange, type Observation } from '../domain/model';
import { assetKey } from '../domain/shared-setup';
import { demoObservations } from '../domain/demo';
import { previewSetup, revisions, setupChanges, withProjectKey } from './setup';
import { syntheticSetup } from './synthetic-setup';
import { positionAt } from '../geo/alignment';

const fixture=()=>structuredClone(syntheticSetup);
describe('shared setup adapter',()=>{
  it('preserves source IDs, declared range and coordinate order',async()=>{
    const {project:p}=await previewSetup(fixture());
    expect(p.alignment[0]).toEqual({lat:4,lon:112,chainage:10000});
    expect(projectRange(p)).toEqual({from:10000,to:13000});
    expect(p.shared?.structures.map(a=>a.id)).toEqual(['B-EXAMPLE','C-EXAMPLE']);
    expect(p.shared?.activities[0].id).toBe('ACT-EXAMPLE-1');
    expect(p.shared?.sections[0].id).toBe('QA:QA-1');
    expect(locationContext(p,11500).zone?.name).toBe('North');
    expect(locationContext(p,11500).sections[0].name).toBe('QA-2');
    expect(locationContext(p,13000).sections[0].name).toBe('QA-2');
    expect(assetKey(p.shared!,'B-EXAMPLE')).toContain('/asset/B-EXAMPLE');
  });
  it('keeps project and revision IDs stable across repeat imports and source ordering',async()=>{
    const first=(await previewSetup(fixture())).project;
    const raw=fixture();raw.activities.reverse();raw.structures.reverse();raw.centreline.reverse();
    const second=(await previewSetup(raw)).project;
    expect(first.id).not.toBe(second.id);
    expect(first.shared?.projectKey).toBe(second.shared?.projectKey);
    expect(first.shared?.setupRevision).toBe(second.shared?.setupRevision);
    expect(first.shared?.alignmentRevision).toBe(second.shared?.alignmentRevision);
  });
  it('distinguishes local display names, source metadata and geometry revisions',async()=>{
    const p=(await previewSetup(fixture())).project;
    expect(await revisions({...p,name:'Restored local label'})).toEqual(await revisions(p));
    const changed=fixture();changed.projectTitle='Revised source title';
    const next=(await previewSetup(changed)).project;
    expect(next.shared?.projectKey).toBe(p.shared?.projectKey);
    expect(next.shared?.setupRevision).not.toBe(p.shared?.setupRevision);
    expect(next.shared?.alignmentRevision).toBe(p.shared?.alignmentRevision);
    const geometry=fixture();geometry.centreline[1][0]+=0.0001;
    expect((await previewSetup(geometry)).project.shared?.alignmentRevision).not.toBe(p.shared?.alignmentRevision);
  });
  it('allows coordinate-free setup without inventing a geographic line',async()=>{
    const p=await previewSetup({...fixture(),centreline:[]});
    expect(canMap(p.project)).toBe(false);expect(p.project.alignment).toEqual([]);
    expect(p.warnings.join(' ')).toContain('No centreline');
    expect(()=>positionAt(p.project,11000)).toThrow('No centreline');
    const observation:Observation={...demoObservations()[0],chainage:11000,projectId:p.project.id};
    expect(backupSchema.safeParse({schemaVersion:'fieldtrace-backup/2',exportedAt:new Date().toISOString(),project:p.project,observations:[observation]}).success).toBe(true);
  });
  it('retains endpoint differences and refuses to map uncovered chainage',async()=>{
    const raw=fixture();raw.centreline.at(-1)![2]=12998;
    const p=(await previewSetup(raw)).project;
    expect(projectRange(p).to).toBe(13000);expect(canMap(p,13000)).toBe(false);
    expect(()=>positionAt(p,13000)).toThrow('No centreline');
  });
  it('rejects ambiguous duplicates, invalid coordinates, blank numbers and zone gaps',async()=>{
    const bad=fixture();bad.centreline.push([112.001,4.001,10000]);
    await expect(previewSetup(bad)).rejects.toThrow('same centreline chainage');
    const duplicates=fixture();duplicates.structures.push(duplicates.structures[0]);
    await expect(previewSetup(duplicates)).rejects.toThrow('Duplicate structure');
    await expect(previewSetup({...fixture(),chFrom:''})).rejects.toThrow();
    const gaps=fixture();gaps.zones[1].from=11600;
    await expect(previewSetup(gaps)).rejects.toThrow('gap');
    const lat=fixture();lat.centreline[0]=[4,112,10000];
    await expect(previewSetup(lat)).rejects.toThrow();
  });
  it('deduplicates identical points with a visible warning',async()=>{
    const raw=fixture();raw.centreline.push([...raw.centreline[0]]);
    const result=await previewSetup(raw);expect(result.project.alignment).toHaveLength(4);expect(result.warnings.join(' ')).toContain('duplicate');
  });
  it('honours a reviewed identity and validates reimported FieldTrace configurations',async()=>{
    const p=(await previewSetup(fixture())).project;
    const reviewed=await withProjectKey(p,'urn:example:approved-contract');
    expect(reviewed.shared?.projectKey).toBe('urn:example:approved-contract');
    expect((await previewSetup(JSON.parse(JSON.stringify(reviewed)))).project.shared).toEqual(reviewed.shared);
    const tampered=structuredClone(reviewed);tampered.alignment[0].lat+=0.001;
    await expect(previewSetup(tampered)).rejects.toThrow('revision');
    expect(setupChanges(p,reviewed).length).toBeGreaterThan(0);
    expect((await previewSetup({...fixture(),sharedProjectId:'urn:example:source-identity'})).project.shared?.projectKey).toBe('urn:example:source-identity');
  });
});
