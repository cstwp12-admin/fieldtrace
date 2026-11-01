import { z } from 'zod';

const text = z.string().trim().min(1).max(200);
export const intervalSchema = z.object({id:text,name:text,from:z.number().nonnegative(),to:z.number().nonnegative()});
export const sharedSetupSchema = z.object({
  schemaVersion:z.literal('siteboard-project/1'),
  projectKey:z.string().trim().min(1).max(300), projectCode:text, projectTitle:text, contractNo:z.string().max(200),
  setupVersion:z.string().max(100), source:z.literal('sdr-setup'), importedAt:z.string().datetime(),
  setupRevision:z.string().regex(/^[a-f0-9]{64}$/), alignmentRevision:z.string().regex(/^[a-f0-9]{64}$/),
  crs:z.literal('EPSG:4326'), chainageUnit:z.literal('m'), sideConvention:z.literal('increasing-chainage'),
  chFrom:z.number().nonnegative(),chTo:z.number().nonnegative(),
  zones:z.array(intervalSchema).min(1).max(1000),
  sections:z.array(intervalSchema.extend({team:text,structureLabel:z.string().max(200)})).max(2000),
  structures:z.array(z.object({id:text,grp:text,name:text,ch:z.number().nonnegative(),side:z.enum(['LHS','RHS','CL','Both']).optional()})).max(10000),
  activities:z.array(z.object({id:text,cat:text,en:z.string().max(300),bm:z.string().max(300),bq:z.string().max(500)})).max(10000),
  teams:z.array(text).max(100)
}).superRefine((s,ctx)=>{
  const issue=(message:string)=>ctx.addIssue({code:'custom',message});
  if(s.chFrom>=s.chTo||s.chTo-s.chFrom>1000000)issue('Invalid project chainage range.');
  for(const [label,rows] of [['zone',s.zones],['section',s.sections],['structure',s.structures],['activity',s.activities]] as const){
    const ids=new Set<string>();for(const row of rows){if(ids.has(row.id))issue(`Duplicate ${label} ID: ${row.id}`);ids.add(row.id);}
  }
  for(const row of [...s.zones,...s.sections])if(row.from>=row.to||row.from<s.chFrom||row.to>s.chTo)issue(`Invalid chainage range for ${row.name}.`);
  if(s.zones.length&&(Math.abs(s.zones[0].from-s.chFrom)>.01||Math.abs(s.zones.at(-1)!.to-s.chTo)>.01))issue('Zones must cover the project chainage range.');
  for(let i=1;i<s.zones.length;i++){
    if(s.zones[i].from<s.zones[i-1].to)issue('Project zones overlap.');
    if(s.zones[i].from>s.zones[i-1].to)issue('There is a chainage gap between project zones.');
  }
  for(const a of s.structures)if(a.ch<s.chFrom||a.ch>s.chTo)issue(`Structure ${a.id} is outside the project range.`);
  for(const team of new Set(s.sections.map(row=>row.team))){const rows=s.sections.filter(row=>row.team===team);for(let i=1;i<rows.length;i++)if(rows[i].from<rows[i-1].to)issue(`Sections overlap or are not ordered for team ${team}.`);}
});
export type SharedSetup=z.infer<typeof sharedSetupSchema>;

// The public identity is independent of the local workspace UUID. Never infer a
// different project from a title change, or merge cases by a display name.
export const assetKey=(setup:SharedSetup,id:string)=>`${setup.projectKey}/asset/${encodeURIComponent(id)}`;
