import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeAll, describe, expect, it } from 'vitest';
import { demoObservations, demoProject } from '../domain/demo';
import { backupData } from '../exchange/files';
import { commitObservation, loadDraft, loadDrafts, loadObservations, loadProjects, restoreCopy, saveDraft } from './database';
import { transition } from '../domain/model';

const pixel={id:'photo-original',name:'synthetic-pixel.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6i4sAAAAASUVORK5CYII='};
const original={...demoObservations()[0],photos:[pixel]};
beforeAll(async()=>{
  const legacy=new Dexie('fieldtrace-v1');legacy.version(1).stores({projects:'id',observations:'id, projectId, status, updatedAt'});
  await legacy.table('projects').add(demoProject);await legacy.table('observations').add(original);legacy.close();
});
describe('IndexedDB recovery and case evidence',()=>{
  it('upgrades version 1 without losing original records',async()=>{
    expect(await loadProjects()).toContainEqual(demoProject);
    expect((await loadObservations(demoProject.id))[0].photos).toEqual([pixel]);
    expect(await loadDrafts(demoProject.id)).toEqual([]);
  });
  it('persists incomplete fields and photo attachments in drafts',async()=>{
    const d={id:`observation:${demoProject.id}`,projectId:demoProject.id,updatedAt:new Date().toISOString(),fields:{title:'Unfinished observation',description:''},photos:[pixel]};
    await saveDraft(d);expect(await loadDraft(d.id)).toEqual(d);
  });
  it('commits follow-up photos to their event and removes only the submitted draft',async()=>{
    const id=`followup:${original.id}`;
    await saveDraft({id,projectId:demoProject.id,updatedAt:new Date().toISOString(),fields:{note:'Action draft'},photos:[{...pixel,id:'action-photo'}]});
    const action=transition(original,'Action taken','Outlet cleared','Training contractor',[{...pixel,id:'action-photo'}]);
    await commitObservation(action,id,original.updatedAt);
    expect(await loadDraft(id)).toBeUndefined();
    const [saved]=await loadObservations(demoProject.id);
    expect(saved.photos).toEqual([pixel]);expect(saved.history.at(-1)?.photos?.[0].id).toBe('action-photo');
    expect(await loadDraft(`observation:${demoProject.id}`)).toBeDefined();
  });
  it('round-trips original, corrective and verification photos plus unfinished drafts',async()=>{
    const [o]=await loadObservations(demoProject.id);
    const closed=transition(o,'Closed','Verified in training','Training engineer',[{...pixel,id:'verification-photo'}]);
    await commitObservation(closed,`followup:${o.id}`,o.updatedAt);
    const data=JSON.parse(JSON.stringify(backupData(demoProject,[closed],await loadDrafts(demoProject.id))));
    const restored=await restoreCopy(data);
    expect(restored.id).not.toBe(demoProject.id);
    const [copy]=await loadObservations(restored.id);
    expect(copy.id).not.toBe(closed.id);expect(copy.photos).toEqual(closed.photos);expect(copy.history).toEqual(closed.history);
    expect((await loadDraft(`observation:${restored.id}`))?.photos).toEqual([pixel]);
    expect((await loadObservations(demoProject.id))[0].id).toBe(closed.id);
  });
  it('rejects invalid restore before adding a project',async()=>{
    const count=(await loadProjects()).length;
    const data=backupData(demoProject,await loadObservations(demoProject.id));
    data.observations[0].projectId='wrong-project';
    await expect(restoreCopy(data)).rejects.toThrow();expect(await loadProjects()).toHaveLength(count);
  });
  it('retains drafts and refuses to overwrite a newer case revision',async()=>{
    const [o]=await loadObservations(demoProject.id);
    const id=`followup:${o.id}`;
    await saveDraft({id,projectId:o.projectId,updatedAt:new Date().toISOString(),fields:{note:'Keep this draft'},photos:[pixel]});
    await expect(commitObservation(o,id,'2000-01-01T00:00:00.000Z')).rejects.toThrow('another window');
    expect(await loadDraft(id)).toBeDefined();expect((await loadObservations(o.projectId))[0].history).toEqual(o.history);
  });
});
