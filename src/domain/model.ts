import { z } from 'zod';
import { sharedSetupSchema } from './shared-setup';

export const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180),
  chainage: z.number().nonnegative()
});
const setupSnapshotSchema=z.object({name:z.string().min(1).max(160),route:z.string().max(100),alignment:z.array(coordinateSchema).max(10000),shared:sharedSetupSchema});
export const projectSchema = z.object({
  id: z.string().min(1).max(100), name: z.string().min(1).max(160),
  route: z.string().max(100), demonstration: z.boolean(),
  alignment: z.array(coordinateSchema).max(10000),
  shared: sharedSetupSchema.optional(),
  setupHistory:z.array(setupSnapshotSchema).max(100).optional()
}).superRefine((p, ctx) => {
  if(p.alignment.length===1 || (p.alignment.length===0&&!p.shared))ctx.addIssue({code:'custom',message:'A local project needs two alignment points; chainage-only projects need a shared setup range.'});
  if(p.setupHistory?.some(s=>s.shared.projectKey!==p.shared?.projectKey))ctx.addIssue({code:'custom',message:'Setup history contains another shared project identity.'});
  for (let i = 1; i < p.alignment.length; i++) {
    if (p.alignment[i].chainage <= p.alignment[i - 1].chainage)
      ctx.addIssue({ code: 'custom', message: 'Alignment chainages must increase.', path: ['alignment', i] });
    if (p.alignment[i].lat === p.alignment[i-1].lat && p.alignment[i].lon === p.alignment[i-1].lon)
      ctx.addIssue({ code: 'custom', message: 'Consecutive alignment points must differ.', path: ['alignment', i] });
  }
});
export type Project = z.infer<typeof projectSchema>;
export function projectRange(p:Project){return {from:p.shared?.chFrom??p.alignment[0]?.chainage??NaN,to:p.shared?.chTo??p.alignment.at(-1)?.chainage??NaN};}
export function canMap(p:Project,chainage?:number){return p.alignment.length>=2&&(chainage===undefined||(chainage>=p.alignment[0].chainage&&chainage<=p.alignment.at(-1)!.chainage));}
export function locationContext(p:Project,chainage:number){
  const sections=[] as NonNullable<Project['shared']>['sections'];
  for(const team of new Set(p.shared?.sections.map(s=>s.team)??[])){
    const rows=p.shared!.sections.filter(s=>s.team===team);
    const row=rows.find(s=>chainage>=s.from&&chainage<s.to)??(chainage===rows.at(-1)?.to?rows.at(-1):undefined);
    if(row)sections.push(row);
  }
  return {zone:p.shared?.zones.find(z=>chainage>=z.from&&chainage<=z.to),sections};
}
export const statuses = ['Reported', 'Action taken', 'Monitoring', 'Closed'] as const;
export const categories = ['Quality', 'Safety', 'Environment', 'Drainage', 'General'] as const;
export const photoSchema = z.object({ id: z.string(), name: z.string().max(200), data: z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).max(12000000) });
export type Photo = z.infer<typeof photoSchema>;
export const draftSchema = z.object({
  id: z.string(), projectId: z.string(), updatedAt: z.string().datetime(),
  fields: z.record(z.string().max(4000)), photos: z.array(photoSchema).max(8)
});
export type Draft = z.infer<typeof draftSchema>;
export const sdrReferenceSchema=z.object({projectKey:z.string().min(1).max(300),reportRef:z.string().min(1).max(200),reportDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),reporter:z.string().max(200),team:z.string().max(200),itemNo:z.number().int().min(1).max(10000),pdfDigest:z.string().regex(/^[a-f0-9]{64}$/),photoPage:z.number().int().min(1).max(10000).nullable(),activity:z.string().max(4000),location:z.string().max(4000),remarks:z.string().max(4000),snapshotDigest:z.string().regex(/^[a-f0-9]{64}$/)});
export const eventSchema = z.object({ at: z.string().datetime(), by: z.string().min(1).max(120), status: z.enum(statuses), note: z.string().min(1).max(4000), photos: z.array(photoSchema).max(8).optional(), kind:z.literal('sdr-link').optional(), evidenceRefs:z.array(sdrReferenceSchema).max(20).optional() });
export const observationSchema = z.object({
  id: z.string().uuid(), projectId: z.string(), ref: z.string().min(1).max(80),
  sourceId:z.string().uuid().optional(),
  title: z.string().min(1).max(160), description: z.string().min(1).max(4000),
  category: z.enum(categories), priority: z.enum(['High', 'Medium', 'Low']),
  chainage: z.number().nonnegative(), side: z.enum(['LHS', 'RHS', 'Centre']),
  lat: z.number().min(-90).max(90).nullable(), lon: z.number().min(-180).max(180).nullable(),
  accuracyM: z.number().nonnegative().nullable(), locationSource: z.enum(['GPS', 'Chainage']),
  assignee: z.string().max(120), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  reporter: z.string().min(1).max(120), status: z.enum(statuses),
  photos: z.array(photoSchema).max(8),
  history: z.array(eventSchema).min(1).max(1000),
  projectContext:z.object({projectKey:z.string().min(1).max(300),setupRevision:z.string().regex(/^[a-f0-9]{64}$/),alignmentRevision:z.string().regex(/^[a-f0-9]{64}$/),assetId:z.string().max(200).optional(),activityId:z.string().max(200).optional()}).optional()
}).superRefine((o, ctx) => {
  if ((o.lat === null) !== (o.lon === null)) ctx.addIssue({ code: 'custom', message: 'Coordinates must be supplied together.' });
  if (o.locationSource === 'GPS' && o.lat === null) ctx.addIssue({ code: 'custom', message: 'GPS records need coordinates.' });
  if (o.history.at(-1)?.status !== o.status) ctx.addIssue({ code: 'custom', message: 'History must match current status.' });
});
export type Observation = z.infer<typeof observationSchema>;
export const backupSchema = z.object({
  schemaVersion: z.enum(['fieldtrace-backup/1', 'fieldtrace-backup/2', 'fieldtrace-backup/3', 'fieldtrace-backup/4', 'fieldtrace-backup/5']), exportedAt: z.string().datetime(),
  project: projectSchema, observations: z.array(observationSchema).max(10000),
  drafts: z.array(draftSchema).max(10000).optional()
}).superRefine((b, ctx) => {
  const ids = new Set<string>();
  for (const o of b.observations) {
    if (o.projectId !== b.project.id) ctx.addIssue({ code: 'custom', message: 'Record belongs to a different project.' });
    if(o.projectContext&&o.projectContext.projectKey!==b.project.shared?.projectKey)ctx.addIssue({code:'custom',message:'Observation shared project ID does not match the backup project.'});
    if (o.chainage < projectRange(b.project).from || o.chainage > projectRange(b.project).to)
      ctx.addIssue({ code: 'custom', message: 'Observation chainage is outside the project alignment.' });
    if (ids.has(o.id)) ctx.addIssue({ code: 'custom', message: 'Duplicate observation ID.' });
    ids.add(o.id);
  }
  const draftIds = new Set<string>();
  for (const d of b.drafts ?? []) {
    if(d.projectId !== b.project.id || draftIds.has(d.id)) ctx.addIssue({code:'custom',message:'Invalid or duplicate draft project reference.'});
    if(d.id !== `observation:${b.project.id}` && !b.observations.some(o=>d.id===`followup:${o.id}`)) ctx.addIssue({code:'custom',message:'Draft has no matching observation.'});
    draftIds.add(d.id);
  }
});
export const ch = (metres: number) => { const n = Math.round(metres); return `${Math.floor(n / 1000)}+${String(n % 1000).padStart(3, '0')}`; };
export function parseCh(value: string): number {
  const m = /^(\d+)\+(\d{1,3})$/.exec(value.trim());
  const n = m ? +m[1] * 1000 + +m[2] : Number(value);
  if (!value.trim() || !Number.isFinite(n) || n < 0) throw Error('Enter chainage as 1+250 or metres.');
  return n;
}
export function isOverdue(o: Observation, today = localDate()) { return o.status !== 'Closed' && !!o.due && o.due < today; }
export function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function transition(o: Observation, status: Observation['status'], note: string, by: string, photos: Photo[] = []): Observation {
  if (!note.trim() || !by.trim()) throw Error('Add your name and a note for the history.');
  if (status === 'Closed' && !['Action taken', 'Monitoring'].includes(o.status)) throw Error('Record the action taken or monitoring review before closing.');
  const at = new Date().toISOString();
  return observationSchema.parse({ ...o, status, updatedAt: at, history: [...o.history, { at, by: by.trim(), status, note: note.trim(), photos }] });
}
export function photoCount(o: Observation) { return o.photos.length + o.history.reduce((n, h) => n + (h.photos?.length ?? 0), 0); }
