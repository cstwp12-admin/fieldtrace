import { z } from 'zod';
import { projectSchema, type Project } from '../domain/model';
import { sharedSetupSchema, type SharedSetup } from '../domain/shared-setup';

export type SetupPreview={project:Project;format:'SDR setup'|'FieldTrace configuration';warnings:string[]};
const nonblank=z.string().trim().min(1).max(200);
// Do not coerce null/blank values to zero or silently discard damaged records.
const number=z.union([z.number(),z.string().trim().min(1)]).transform(Number).refine(Number.isFinite,'A finite number is required.');
const sdrSchema=z.object({
  projectCode:nonblank,projectTitle:nonblank,contractNo:z.string().max(200).optional(),version:z.union([z.number(),z.string().max(100)]).optional(),
  sharedProjectId:z.string().trim().min(1).max(300).optional(),
  chFrom:number,chTo:number,demonstration:z.boolean().optional(),
  zones:z.array(z.object({id:nonblank.optional(),name:nonblank.optional(),from:number,to:number})).min(1).max(1000),
  centreline:z.array(z.tuple([number,number,number])).max(10000).optional(),
  sections:z.record(z.union([z.array(z.object({id:nonblank.optional(),name:nonblank,from:number,to:number})),z.object({list:z.array(z.object({id:nonblank.optional(),name:nonblank,from:number,to:number})),struct:z.string().max(200).optional()})])).optional(),
  structures:z.array(z.object({id:nonblank,grp:nonblank.optional(),name:nonblank.optional(),ch:number,side:z.enum(['LHS','RHS','CL','Both']).optional()})).max(10000),
  activities:z.array(z.object({id:nonblank.optional(),cat:nonblank,en:z.string().max(300).optional(),bm:z.string().max(300).optional(),bq:z.string().max(500).optional()})).max(10000),
  teams:z.array(nonblank).max(100).optional()
});
export async function digest(value:unknown){
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
}
const sortId=<T extends {id:string}>(rows:T[])=>[...rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
export async function revisions(project:Project){
  const s=project.shared!;
  const alignmentRevision=await digest({crs:s.crs,chainageUnit:s.chainageUnit,sideConvention:s.sideConvention,chFrom:s.chFrom,chTo:s.chTo,alignment:project.alignment});
  const setupRevision=await digest({projectKey:s.projectKey,projectCode:s.projectCode,projectTitle:s.projectTitle,contractNo:s.contractNo,setupVersion:s.setupVersion,alignmentRevision,zones:s.zones,sections:sortId(s.sections),structures:sortId(s.structures),activities:sortId(s.activities),teams:[...s.teams].sort()});
  return {alignmentRevision,setupRevision};
}
export async function withProjectKey(project:Project,projectKey:string):Promise<Project>{
  if(!project.shared)return project;
  if(project.setupHistory?.length&&projectKey.trim()!==project.shared.projectKey)throw Error('A configuration with setup history must retain its shared project ID.');
  const next=projectSchema.parse({...project,shared:{...project.shared,projectKey:projectKey.trim()}});
  return projectSchema.parse({...next,shared:{...next.shared,...await revisions(next)}});
}
export async function previewSetup(raw:unknown):Promise<SetupPreview>{
  if(raw&&typeof raw==='object'&&'alignment' in raw){
    const p=projectSchema.parse(raw),warnings:string[]=[];
    if(p.shared){
      for(const entry of [p,...(p.setupHistory??[]).map(snapshot=>({...p,...snapshot}))]){
        const r=await revisions(entry);if(r.alignmentRevision!==entry.shared!.alignmentRevision||r.setupRevision!==entry.shared!.setupRevision)throw Error('Configuration revision does not match its contents. Re-export the configuration from its source.');
      }
    }
    return {project:p,format:'FieldTrace configuration',warnings};
  }
  const data=sdrSchema.parse(raw),warnings:string[]=[];
  const contractNo=(data.contractNo??'').trim();
  const projectKey=data.sharedProjectId??`urn:siteboard:project:${encodeURIComponent(data.projectCode)}${contractNo?':'+(await digest(contractNo)).slice(0,16):''}`;
  if(!contractNo)warnings.push('No contract number: the suggested shared project ID uses only the project code. Confirm it is unique across your projects.');
  const points=[...(data.centreline??[])].sort((a,b)=>a[2]-b[2]);
  const alignment:Project['alignment']=[];
  for(const [lon,lat,chainage] of points){
    if(chainage<data.chFrom-100||chainage>data.chTo+100)throw Error('A centreline point is more than 100 m outside the declared project range.');
    const previous=alignment.at(-1);
    if(previous?.chainage===chainage){
      if(previous.lat!==lat||previous.lon!==lon)throw Error('Two different coordinates have the same centreline chainage. Resolve this in the source setup.');
      warnings.push('An identical duplicate centreline point was removed.');continue;
    }
    alignment.push({lat,lon,chainage});
  }
  if(!alignment.length)warnings.push('No centreline coordinates. Chainage, zones, structures and observations are available; geographic placement and GPS-to-chainage are unavailable.');
  if(alignment.length>=2&&(alignment[0].chainage>data.chFrom||alignment.at(-1)!.chainage<data.chTo))warnings.push('The centreline does not cover the full declared range. Uncovered chainages remain recordable but are not placed on the map.');
  const zones=data.zones.map((z,i)=>{const name=z.name??z.id;if(!name)throw Error(`Zone ${i+1} needs a name or ID.`);return {id:z.id??name,name,from:z.from,to:z.to};}).sort((a,b)=>a.from-b.from);
  const sections:SharedSetup['sections']=[];
  for(const [team,value] of Object.entries(data.sections??{}))for(const row of [...(Array.isArray(value)?value:value.list)].sort((a,b)=>a.from-b.from))sections.push({id:row.id??`${team}:${row.name}`,team,name:row.name,from:row.from,to:row.to,structureLabel:Array.isArray(value)?'':value.struct??''});
  const activities:SharedSetup['activities']=[];
  for(const a of data.activities){
    if(!a.en?.trim()&&!a.bm?.trim())throw Error('Each activity needs an English or Malay name.');
    const id=a.id??`legacy-${(await digest([a.cat,a.en??'',a.bm??''])).slice(0,16)}`;
    if(!a.id)warnings.push('An activity has no source ID; a content-based legacy ID was generated. Rename it only through a reviewed source revision.');
    activities.push({id,cat:a.cat,en:a.en??'',bm:a.bm??'',bq:a.bq??''});
  }
  const shared=sharedSetupSchema.parse({schemaVersion:'siteboard-project/1',projectKey,projectCode:data.projectCode,projectTitle:data.projectTitle,contractNo,setupVersion:String(data.version??''),source:'sdr-setup',importedAt:new Date().toISOString(),setupRevision:'0'.repeat(64),alignmentRevision:'0'.repeat(64),crs:'EPSG:4326',chainageUnit:'m',sideConvention:'increasing-chainage',chFrom:data.chFrom,chTo:data.chTo,zones,sections,structures:data.structures.map(s=>({...s,grp:s.grp??'Culvert',name:s.name??s.id})),activities,teams:data.teams??[]});
  const p=projectSchema.parse({id:crypto.randomUUID(),name:data.projectTitle,route:data.projectCode,demonstration:data.demonstration??false,alignment,shared});
  return {project:await withProjectKey(p,projectKey),format:'SDR setup',warnings:[...new Set(warnings)]};
}

export function setupChanges(previous:Project,next:Project){
  const old=previous.shared,now=next.shared;
  if(!old||!now)return ['Configuration will be imported as a separate project.'];
  const changes:string[]=[];
  if(old.alignmentRevision!==now.alignmentRevision)changes.push('Alignment / chainage range changed.');
  for(const key of ['zones','sections','structures','activities'] as const){
    const before=new Map(old[key].map(x=>[x.id,JSON.stringify(x)])),after=new Map(now[key].map(x=>[x.id,JSON.stringify(x)]));
    const added=[...after.keys()].filter(id=>!before.has(id)).length,removed=[...before.keys()].filter(id=>!after.has(id)).length,updated=[...after.keys()].filter(id=>before.has(id)&&before.get(id)!==after.get(id)).length;
    if(added||removed||updated)changes.push(`${key}: ${added} added, ${updated} changed, ${removed} removed.`);
  }
  if(previous.name!==next.name)changes.push('Project title changed.');
  if(!changes.length&&old.setupRevision!==now.setupRevision)changes.push('Source version or other setup metadata changed.');
  return changes.length?changes:['Same configuration revision. Existing records and drafts will be retained.'];
}
