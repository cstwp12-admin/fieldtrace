import { validateLinks } from '../exchange/sdr-links';
import Dexie, { type EntityTable } from 'dexie';
import { backupSchema, observationSchema, projectRange, projectSchema, parseCh, type Observation, type Project } from '../domain/model';
import { draftSchema, type Draft } from '../domain/drafts';
import { revisions } from '../exchange/setup';

const db = new Dexie('fieldtrace-v1') as Dexie & {
  projects: EntityTable<Project, 'id'>;
  observations: EntityTable<Observation, 'id'>;
  drafts: EntityTable<Draft, 'id'>;
};
db.version(1).stores({ projects: 'id', observations: 'id, projectId, status, updatedAt' });
db.version(2).stores({ projects: 'id', observations: 'id, projectId, status, updatedAt', drafts: 'id, projectId, updatedAt' });
export const loadDraft = (id: string) => db.drafts.get(id);
export const saveDraft = (draft: Draft) => db.drafts.put(draftSchema.parse(draft));
export const deleteDraft = (id: string) => db.drafts.delete(id);
export const loadDrafts = (projectId: string) => db.drafts.where('projectId').equals(projectId).toArray();
export const loadProjects = () => db.projects.toArray();
export const loadObservations = (id: string) => db.observations.where('projectId').equals(id).toArray();
export const saveProject = (p: Project) => db.projects.put(projectSchema.parse(p));
export const saveObservation = (o: Observation) => db.observations.put(observationSchema.parse(o));
export async function commitObservation(o: Observation, draftId: string, expectedUpdatedAt?: string) {
  const record = observationSchema.parse(o);
  await validateLinks(record);
  await db.transaction('rw', db.projects, db.observations, db.drafts, async () => {
    const existing = await db.observations.get(record.id);
    if (expectedUpdatedAt && existing?.updatedAt !== expectedUpdatedAt) throw Error('This case changed in another window. Close and reopen it to review the latest record. Your draft is retained.');
    if (!expectedUpdatedAt && existing) throw Error('A record with this ID already exists. Your draft is retained.');
    if(!existing){
      const project=await db.projects.get(record.projectId);
      if(!project)throw Error('Project is unavailable. Reopen the project before submitting.');
      const range=projectRange(project);if(record.chainage<range.from||record.chainage>range.to)throw Error('Observation chainage is outside the current project range. Your draft is retained.');
      if(project.shared){
        const c=record.projectContext;
        if(!c||c.projectKey!==project.shared.projectKey||c.setupRevision!==project.shared.setupRevision||c.alignmentRevision!==project.shared.alignmentRevision)throw Error('Project setup changed while this form was open. Reopen the project and review your draft.');
        if(c.assetId&&!project.shared.structures.some(a=>a.id===c.assetId))throw Error('Unknown structure ID.');
        if(c.activityId&&!project.shared.activities.some(a=>a.id===c.activityId))throw Error('Unknown activity ID.');
      }
    }
    await db.observations.put(record);
    await db.drafts.delete(draftId);
  });
}
export async function applySetupImport(candidate:Project,targetId?:string,expectedRevision?:string){
  let project=projectSchema.parse(candidate);
  if(project.shared){const r=await revisions(project);if(r.setupRevision!==project.shared.setupRevision||r.alignmentRevision!==project.shared.alignmentRevision)throw Error('Setup contents changed after preview. Import the file again.');}
  return db.transaction('rw',db.projects,db.observations,db.drafts,async()=>{
    if(!targetId){project={...project,id:crypto.randomUUID()};await db.projects.add(project);return project;}
    const previous=await db.projects.get(targetId);
    if(!previous?.shared||!project.shared||previous.shared.projectKey!==project.shared.projectKey)throw Error('The shared project IDs do not match. Import as a separate project.');
    if(previous.shared.setupRevision!==expectedRevision)throw Error('Project setup changed in another window. Review a fresh import preview.');
    if(previous.shared.projectCode!==project.shared.projectCode||previous.shared.contractNo!==project.shared.contractNo)throw Error('Project code or contract identity changed. Import as a separate project.');
    const range=projectRange(project),records=await db.observations.where('projectId').equals(targetId).toArray(),drafts=await loadDrafts(targetId);
    for(const o of records){
      if(o.chainage<range.from||o.chainage>range.to)throw Error('The new range would exclude an existing observation. Import as a separate project.');
      if(o.projectContext?.assetId&&!project.shared.structures.some(a=>a.id===o.projectContext!.assetId))throw Error('A structure used by an observation was removed. Preserve its ID in the source or import separately.');
      if(o.projectContext?.activityId&&!project.shared.activities.some(a=>a.id===o.projectContext!.activityId))throw Error('An activity used by an observation was removed. Preserve its ID in the source or import separately.');
    }
    for(const d of drafts){
      if(d.fields.chainage?.trim()){let n:number|undefined;try{n=parseCh(d.fields.chainage);}catch{ /* An incomplete draft is retained. */ }if(n!==undefined&&(n<range.from||n>range.to))throw Error('The new range would exclude an unfinished draft. Finish it or import separately.');}
      if(d.fields.assetId&&!project.shared.structures.some(a=>a.id===d.fields.assetId))throw Error('A structure selected in a draft was removed. Review the draft before updating.');
      if(d.fields.activityId&&!project.shared.activities.some(a=>a.id===d.fields.activityId))throw Error('An activity selected in a draft was removed. Review the draft before updating.');
    }
    if(previous.shared.setupRevision===project.shared.setupRevision)return previous;
    project=projectSchema.parse({...project,id:targetId,setupHistory:[...(previous.setupHistory??[]),{name:previous.name,route:previous.route,alignment:previous.alignment,shared:previous.shared}]});await db.projects.put(project);return project;
  });
}
export async function restoreCopy(raw: unknown) {
  const b = backupSchema.parse(raw);
  for(const o of b.observations)await validateLinks(o);
  const id = crypto.randomUUID();
  const project = projectSchema.parse({ ...b.project, id, name: `${b.project.name.slice(0,140)} (restored copy)` });
  const recordIds = new Map(b.observations.map(o => [o.id, crypto.randomUUID()]));
  await db.transaction('rw', db.projects, db.observations, db.drafts, async () => {
    await db.projects.add(project);
    await db.observations.bulkAdd(b.observations.map(o => ({ ...o, sourceId:o.sourceId??o.id, id: recordIds.get(o.id)!, projectId: id })));
    await db.drafts.bulkAdd((b.drafts??[]).map(d => ({...d, projectId:id, id:d.id===`observation:${b.project.id}`?`observation:${id}`:`followup:${recordIds.get(d.id.slice('followup:'.length))!}`})));
  });
  return project;
}
export async function addDemo(p: Project, observations: Observation[]) {
  await db.transaction('rw', db.projects, db.observations, async () => {
    if (await db.projects.get(p.id)) return;
    await db.projects.add(projectSchema.parse(p));
    await db.observations.bulkAdd(observations.map(o => observationSchema.parse(o)));
  });
}
