import { observationSchema, type Observation } from '../domain/model';
import { referenceKey, verifyReference, type SdrReference } from './sdr-reference.js';
export async function validateLinks(o:Observation){
  const seen=new Set<string>();
  for(const [i,h]of o.history.entries()){if(h.kind==='sdr-link'&&(!h.evidenceRefs?.length||!i||h.status!==o.history[i-1].status))throw Error('Evidence links must preserve the prior case status.');for(const r of h.evidenceRefs??[]){await verifyReference(r,o.projectContext?.projectKey??'');const k=referenceKey(r);if(seen.has(k))throw Error('This SDR evidence is already linked to this case.');seen.add(k);}}
}
export async function linkEvidence(o:Observation,refs:SdrReference[],by:string,note:string){
  if(!by.trim()||!note.trim()||!refs.length||refs.length>20)throw Error('Select 1–20 source items and add your name and review note.');
  const at=new Date().toISOString();
  const next=observationSchema.parse({...o,updatedAt:at,history:[...o.history,{at,by:by.trim(),status:o.status,kind:'sdr-link',note:note.trim(),evidenceRefs:refs}]});
  await validateLinks(next);return next;
}
