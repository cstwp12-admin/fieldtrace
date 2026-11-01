// Authoritative portable contract. A byte-identical copy ships in SiteBoard.
// No application defaults, network requests or project data belong here.
import { verifyReference, referenceKey } from './sdr-reference.js';
export const CASE_SCHEMA='fieldtrace-cases/2';
export const MAX_BYTES=100*1024*1024;
const STATUSES=['Reported','Action taken','Monitoring','Closed'];
const HASH=/^[a-f0-9]{64}$/, UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=message=>{throw Error(message);};
function string(v,label,max=4000,empty=false){if(typeof v!=='string'||v.length>max||(!empty&&!v.trim()))fail('Invalid '+label+'.');}
function number(v,label,min=-Infinity,max=Infinity){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail('Invalid '+label+'.');}
function list(v,label,max=10000){if(!Array.isArray(v)||v.length>max)fail('Invalid '+label+'.');}
function iso(v){string(v,'timestamp',40);if(!/^\d{4}-\d\d-\d\dT/.test(v)||!Number.isFinite(Date.parse(v)))fail('Invalid timestamp.');}
function hash(v){if(typeof v!=='string'||!HASH.test(v))fail('Invalid content digest.');}
function uuid(v){if(typeof v!=='string'||!UUID.test(v))fail('Invalid permanent case/package ID.');}
export function checkTree(v,depth=0){if(depth>30)fail('Data is nested too deeply.');if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))fail('Unsupported property in exchange data.');checkTree(x,depth+1);}}
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(obj(value))return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export async function sha(value){const bytes=new TextEncoder().encode(typeof value==='string'?value:canonical(value));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');}
export async function alignmentDigest(p){return sha(JSON.stringify({crs:'EPSG:4326',chainageUnit:'m',sideConvention:'increasing-chainage',chFrom:p.chFrom,chTo:p.chTo,alignment:p.alignment}));}
function project(p){
  if(!obj(p))fail('Project identity is missing.');string(p.key,'shared project ID',300);string(p.code,'project code',200);string(p.title,'project title',200);string(p.contractNo,'contract number',200,true);
  number(p.chFrom,'start chainage',0);number(p.chTo,'end chainage',p.chFrom+0.001);hash(p.setupRevision);hash(p.alignmentRevision);
  list(p.alignment,'alignment',10000);let last=-Infinity;
  for(const a of p.alignment){number(a.lat,'latitude',-90,90);number(a.lon,'longitude',-180,180);number(a.chainage,'chainage',0);if(a.chainage<=last)fail('Alignment chainage must increase.');last=a.chainage;}
  if(p.alignment.length===1)fail('Alignment requires zero or at least two points.');
}
function photo(p){if(!obj(p))fail('Invalid photograph.');string(p.id,'photo ID',200);string(p.name,'photo name',200);string(p.data,'image data',12000000);if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.data))fail('Unsupported photo data.');}
export function allPhotos(envelope){const o=envelope.record;return [...o.photos.map(p=>({photo:p,eventIndex:null})),...o.history.flatMap((h,i)=>(h.photos||[]).map(p=>({photo:p,eventIndex:i})))];}
export function envelopeBody(e){return {caseId:e.caseId,record:e.record,geometry:e.geometry,asset:e.asset,activity:e.activity};}
export async function validateEnvelope(e,key){
  if(!obj(e))fail('Invalid case.');uuid(e.caseId);hash(e.revision);
  const o=e.record;if(!obj(o)||o.id!==e.caseId||o.projectId!==key)fail('Case identity does not match the package project.');
  for(const k of ['ref','title','description','reporter'])string(o[k],k,k==='description'?4000:200);
  for(const k of ['assignee','due'])string(o[k],k,200,true);
  if(!['Quality','Safety','Environment','Drainage','General'].includes(o.category)||!['High','Medium','Low'].includes(o.priority)||!['LHS','RHS','Centre'].includes(o.side)||!STATUSES.includes(o.status))fail('Unsupported case category, side, priority or status.');
  number(o.chainage,'case chainage',0);iso(o.createdAt);iso(o.updatedAt);
  if(o.due&&!/^\d{4}-\d\d-\d\d$/.test(o.due))fail('Invalid target date.');
  if((o.lat===null)!==(o.lon===null))fail('Coordinates must be supplied together.');
  if(o.lat!==null){number(o.lat,'GPS latitude',-90,90);number(o.lon,'GPS longitude',-180,180);}
  if(o.accuracyM!==null)number(o.accuracyM,'GPS accuracy',0);
  if(!['GPS','Chainage'].includes(o.locationSource)||(o.locationSource==='GPS'&&o.lat===null))fail('Invalid location source.');
  const c=o.projectContext;if(!obj(c)||c.projectKey!==key)fail('Case lacks a matching shared project reference.');hash(c.setupRevision);hash(c.alignmentRevision);
  if(c.assetId!==undefined)string(c.assetId,'asset ID',200);if(c.activityId!==undefined)string(c.activityId,'activity ID',200);
  list(o.photos,'original photographs',8);o.photos.forEach(photo);list(o.history,'case history',1000);if(!o.history.length)fail('Case history is missing.');
  let at=-Infinity;const refs=new Set();
  for(const h of o.history){if(!obj(h))fail('Invalid history event.');if(h.kind!==undefined&&h.kind!=='sdr-link')fail('Unsupported history event kind.');if(h.kind==='sdr-link'&&(!h.evidenceRefs?.length||h.status!==(o.history[o.history.indexOf(h)-1]?.status)))fail('Evidence links must preserve the prior case status.');if(h.evidenceRefs!==undefined){list(h.evidenceRefs,'SDR references',20);for(const r of h.evidenceRefs){await verifyReference(r,key);const id=referenceKey(r);if(refs.has(id))fail('Duplicate linked SDR evidence within this case.');refs.add(id);}}if(!obj(h))fail('Invalid history event.');iso(h.at);string(h.by,'event author',120);string(h.note,'event note',4000);if(!STATUSES.includes(h.status)||Date.parse(h.at)<at)fail('Invalid history chronology.');at=Date.parse(h.at);list(h.photos||[],'event photographs',8);(h.photos||[]).forEach(photo);}
  if(o.history[0].at!==o.createdAt||o.history.at(-1).at!==o.updatedAt||o.history.at(-1).status!==o.status)fail('History does not match case dates/status.');
  for(const group of [o.photos,...o.history.map(h=>h.photos||[])]){const ids=new Set();for(const p of group){if(ids.has(p.id))fail('Duplicate photo ID within an event.');ids.add(p.id);}}
  if(e.geometry!==null){const g=e.geometry;if(!obj(g)||g.type!=='Point'||!['GPS','Chainage'].includes(g.locatedBy))fail('Invalid case geometry.');list(g.coordinates,'point coordinates',2);if(g.coordinates.length!==2)fail('Invalid point.');number(g.coordinates[0],'point longitude',-180,180);number(g.coordinates[1],'point latitude',-90,90);if(g.locatedBy==='GPS'&&(g.coordinates[0]!==o.lon||g.coordinates[1]!==o.lat))fail('GPS geometry does not match original evidence.');hash(g.alignmentRevision);if(g.alignmentRevision!==c.alignmentRevision)fail('Geometry revision differs from capture context.');}
  for(const [value,id,label]of [[e.asset,c.assetId,'asset'],[e.activity,c.activityId,'activity']]){if(value!==null){if(!obj(value)||value.id!==id)fail('Invalid '+label+' reference.');string(value.id,label+' ID',200);string(value.name,label+' name',300);}}
  if(await sha(envelopeBody(e))!==e.revision)fail('Case content digest mismatch: '+o.ref);
  return e;
}
export async function attachmentManifest(cases){const out=[];for(const e of cases)for(const {photo:p,eventIndex}of allPhotos(e)){const data=p.data.split(',')[1],padding=data.endsWith('==')?2:data.endsWith('=')?1:0;out.push({id:`${e.caseId}:${eventIndex===null?'original':eventIndex}:${p.id}`,caseId:e.caseId,eventIndex,photoId:p.id,name:p.name,mime:p.data.slice(5,p.data.indexOf(';')),bytes:data.length*3/4-padding,sha256:await sha(p.data)});}return out;}
export async function sealPackage(value){const p={...value};p.attachments=await attachmentManifest(p.cases);delete p.contentDigest;p.contentDigest=await sha(p);return p;}
export async function validatePackage(value){
  checkTree(value);const p=value;if(!obj(p)||![CASE_SCHEMA,'fieldtrace-cases/1'].includes(p.schemaVersion))fail('Choose a FieldTrace case exchange package, not a recovery backup.');
  uuid(p.packageId);iso(p.exportedAt);if(!obj(p.source)||p.source.app!=='FieldTrace')fail('Unsupported source application.');string(p.source.version,'source version',50);string(p.source.workspaceId,'source workspace',100);
  if(p.schemaVersion==='fieldtrace-cases/1'&&p.cases?.some(e=>e.record?.history?.some(h=>h.evidenceRefs!==undefined)))fail('SDR reference links require case schema version 2.');
  project(p.project);if(await alignmentDigest(p.project)!==p.project.alignmentRevision)fail('Package alignment digest mismatch.');
  list(p.cases,'cases');if(!p.cases.length)fail('Package has no submitted cases.');const ids=new Set();
  for(const e of p.cases){if(ids.has(e.caseId))fail('Duplicate case ID in package.');ids.add(e.caseId);await validateEnvelope(e,p.project.key);if(e.record.chainage<p.project.chFrom||e.record.chainage>p.project.chTo)fail('Case is outside the package range.');}
  list(p.attachments,'attachment manifest',100000);if(canonical(await attachmentManifest(p.cases))!==canonical(p.attachments))fail('Attachment manifest is incomplete or damaged.');
  hash(p.contentDigest);const body={...p};delete body.contentDigest;if(await sha(body)!==p.contentDigest)fail('Package content digest mismatch.');
  return p;
}
export function classifyCase(incoming,stored){
  if(!stored)return 'new';if(incoming.revision===stored.revision)return 'duplicate';
  const immutable=e=>{const r={...e.record};delete r.history;delete r.updatedAt;delete r.status;return canonical({...envelopeBody(e),record:r});};
  if(immutable(incoming)!==immutable(stored))return 'conflict';
  const a=incoming.record.history,b=stored.record.history;
  const prefix=(small,big)=>small.every((h,i)=>canonical(h)===canonical(big[i]));
  if(a.length>b.length&&prefix(b,a))return 'update';
  if(a.length<b.length&&prefix(a,b))return 'stale';
  return 'conflict';
}
export async function matchProject(p,active,binding){
  if(!active||active.source!=='sdr-setup')fail('Import the authoritative SDR setup into this SiteBoard workspace first. Packaged defaults are not a project binding.');
  if(p.code!==active.projectCode||p.contractNo!==String(active.contractNo||'').trim()||p.chFrom!==active.chFrom||p.chTo!==active.chTo)fail('Package project code, contract or chainage range does not match the active workspace setup.');
  if((binding&&binding.key!==p.key)||(active.sharedProjectId&&active.sharedProjectId!==p.key))fail('Shared project ID differs from this workspace binding. Use the correct workspace.');
  const alignment=(active.centreline||[]).map(([lon,lat,chainage])=>({lat,lon,chainage}));
  if(await alignmentDigest({...p,alignment})!==p.alignmentRevision)fail('Alignment differs from the active SDR setup. Review/import the matching setup before importing cases.');
  return true;
}
export function localDay(value){const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function periodCases(entries,from,to){
  const out=[];
  for(const entry of entries){const e=entry.envelope||entry,o=e.record;const history=o.history.filter(h=>localDay(h.at)<=to);if(!history.length)continue;
    const last=history.at(-1);if(last.status==='Closed'&&!history.some(h=>localDay(h.at)>=from))continue;
    out.push({...entry,envelope:{...e,record:{...o,history,status:last.status,updatedAt:last.at}}});
  }
  return out;
}
