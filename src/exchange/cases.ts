import { canMap, observationSchema, type Observation, type Project } from '../domain/model';
import { positionAt } from '../geo/alignment';
import { revisions } from './setup';
import { CASE_SCHEMA, MAX_BYTES, envelopeBody, sealPackage, sha, validatePackage, type CaseEnvelope } from './case-contract.js';
import { download } from './files';

export const exchangeEligible=(project:Project,o:Observation)=>!!project.shared&&o.projectContext?.projectKey===project.shared.projectKey;
export async function buildCasePackage(project:Project,observations:Observation[]){
  const s=project.shared;if(!s)throw Error('Import a shared project setup before exchanging cases.');
  const signature=await revisions(project);if(signature.setupRevision!==s.setupRevision||signature.alignmentRevision!==s.alignmentRevision)throw Error('Project configuration does not match its revision. Reimport the authoritative setup.');
  const cases:CaseEnvelope[]=[];
  for(const original of observations){
    if(!exchangeEligible(project,original))throw Error(`${original.ref} has no matching shared project context. Keep it in the recovery backup.`);
    const caseId=original.sourceId??original.id;
    const record=observationSchema.parse({...original,id:caseId,projectId:s.projectKey});delete record.sourceId;
    const context=record.projectContext!;
    const capture=project.shared!.setupRevision===context.setupRevision?project:(project.setupHistory??[]).find(p=>p.shared.setupRevision===context.setupRevision);
    if(!capture||capture.shared!.alignmentRevision!==context.alignmentRevision)throw Error(`The capture setup for ${record.ref} is missing. Restore the complete project backup.`);
    const captureProject={...project,...capture};
    let geometry:CaseEnvelope['geometry']=null;
    if(record.lat!==null&&record.lon!==null)geometry={type:'Point',coordinates:[record.lon,record.lat],locatedBy:'GPS',alignmentRevision:context.alignmentRevision};
    else if(canMap(captureProject,record.chainage)){const [lat,lon]=positionAt(captureProject,record.chainage);geometry={type:'Point',coordinates:[lon,lat],locatedBy:'Chainage',alignmentRevision:context.alignmentRevision};}
    const asset=capture.shared!.structures.find(a=>a.id===context.assetId),activity=capture.shared!.activities.find(a=>a.id===context.activityId);
    const e:CaseEnvelope={caseId,revision:'',record,geometry,asset:asset?{id:asset.id,name:asset.name}:null,activity:activity?{id:activity.id,name:activity.en||activity.bm}:null};
    e.revision=await sha(envelopeBody(e));cases.push(e);
  }
  return validatePackage(await sealPackage({schemaVersion:CASE_SCHEMA,packageId:crypto.randomUUID(),exportedAt:new Date().toISOString(),source:{app:'FieldTrace',version:'0.6.0',workspaceId:project.id},project:{key:s.projectKey,code:s.projectCode,title:s.projectTitle,contractNo:s.contractNo,chFrom:s.chFrom,chTo:s.chTo,setupRevision:s.setupRevision,alignmentRevision:s.alignmentRevision,alignment:project.alignment},cases}));
}
export async function exportCasePackage(project:Project,observations:Observation[]){
  const p=await buildCasePackage(project,observations),text=JSON.stringify(p);
  if(new Blob([text]).size>MAX_BYTES)throw Error('Exchange package exceeds 100 MB. Select fewer cases and export separate packages.');
  download(`fieldtrace-cases-${new Date().toISOString().replace(/[:.]/g,'-')}.json`,text);
  return p;
}
