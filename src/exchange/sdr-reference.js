// Portable SDR reference contract. Mirror in SiteBoard; no source files or images.
import { canonical, checkTree, sha } from './case-contract.js';
export const REFERENCE_SCHEMA='siteboard-sdr-references/1';
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const text=(v,max=4000)=>typeof v==='string'&&v.length<=max;
export const referenceKey=r=>r.projectKey+'|'+r.reportRef+'#'+r.itemNo+'@'+r.pdfDigest;
export const referenceBody=r=>{const b={...r};delete b.snapshotDigest;return b;};
export function validateReference(r,key){
  if(!r||Object.keys(r).some(k=>!['projectKey','reportRef','reportDate','reporter','team','itemNo','pdfDigest','photoPage','activity','location','remarks','snapshotDigest'].includes(k)))throw Error('Unsupported SDR reference field.');
  if(r.projectKey!==key||!text(r.projectKey,300)||!r.projectKey||!text(r.reportRef,200)||!r.reportRef.trim()||!hash(r.pdfDigest)||!hash(r.snapshotDigest))throw Error('Invalid SDR source identity or digest.');
  if(!Number.isSafeInteger(r.itemNo)||r.itemNo<1||r.itemNo>10000||!(r.photoPage===null||(Number.isSafeInteger(r.photoPage)&&r.photoPage>0&&r.photoPage<=10000)))throw Error('Invalid SDR item/page locator.');
  if(!/^\d{4}-\d\d-\d\d$/.test(r.reportDate)||new Date(r.reportDate+'T00:00:00Z').toISOString().slice(0,10)!==r.reportDate)throw Error('Invalid SDR report date.');
  for(const k of ['reporter','team','activity','location','remarks'])if(!text(r[k],k==='reporter'||k==='team'?200:4000))throw Error('Invalid SDR reference text.');
  return r;
}
export async function verifyReference(r,key){checkTree(r);validateReference(r,key);if(await sha(referenceBody(r))!==r.snapshotDigest)throw Error('SDR reference snapshot digest mismatch.');return r;}
export async function sharedKey(active,binding){
  if(active?.source!=='sdr-setup')throw Error('Import the authoritative SDR setup first.');
  const code=String(active.projectCode||''),contract=String(active.contractNo||'').trim();
  return active.sharedProjectId||binding?.key||('urn:siteboard:project:'+encodeURIComponent(code)+(contract?':'+(await sha(JSON.stringify(contract))).slice(0,16):''));
}
export async function makeReference(report,item,projectKey){
  if(!hash(report.pdfDigest))throw Error('Reconnect/reimport source PDFs to fingerprint older cached reports before exporting references.');
  const r={projectKey,reportRef:report.ref,reportDate:report.date,reporter:report.reporter||'',team:report.team||'',itemNo:item.no,pdfDigest:report.pdfDigest,photoPage:item.photo?.page??null,activity:item.activity||'',location:item.location||'',remarks:item.remarks||''};
  const result={...r,snapshotDigest:await sha(r)};return verifyReference(result,projectKey);
}
export async function makeReferencePackage(references,projectKey){
  if(!references.length)throw Error('No SDR items in the selected scope.');
  const p={schemaVersion:REFERENCE_SCHEMA,packageId:crypto.randomUUID(),exportedAt:new Date().toISOString(),projectKey,references};
  return {...p,contentDigest:await sha(p)};
}
export async function validateReferencePackage(p,key){
  checkTree(p);if(p?.schemaVersion!==REFERENCE_SCHEMA||p.projectKey!==key)throw Error('Choose an SDR reference package for this shared project.');
  if(!text(p.packageId,100)||!p.packageId||!Number.isFinite(Date.parse(p.exportedAt))||!Array.isArray(p.references)||!p.references.length||p.references.length>10000)throw Error('Invalid SDR reference package.');
  const ids=new Set();for(const r of p.references){await verifyReference(r,key);const id=referenceKey(r);if(ids.has(id))throw Error('Duplicate SDR reference.');ids.add(id);}
  const b={...p};delete b.contentDigest;if(!hash(p.contentDigest)||await sha(b)!==p.contentDigest)throw Error('SDR reference package digest mismatch.');
  return p;
}
export async function resolveReference(r,reports){
  const matches=reports.filter(report=>report.ref===r.reportRef);
  if(!matches.length)return {state:'missing',label:'Source report not loaded'};
  if(matches.length!==1)return {state:'ambiguous',label:'Multiple reports share this reference'};
  const report=matches[0],item=report.items.find(i=>i.no===r.itemNo);
  if(!report.pdfDigest)return {state:'unverified',label:'Reconnect source PDF to verify fingerprint'};
  if(report.pdfDigest!==r.pdfDigest)return {state:'changed',label:'Source PDF revision differs'};
  if(!item)return {state:'missing',label:'Source item not found'};
  const current=await makeReference(report,item,r.projectKey);
  if(current.snapshotDigest!==r.snapshotDigest)return {state:'changed',label:'Source metadata differs'};
  return {state:'matched',label:'Loaded source PDF fingerprint and item match; reconnect folder if needed',report,item};
}
export const referenceText=r=>r.reportRef+' · item '+r.itemNo+(r.photoPage?' · photo page '+r.photoPage:' · no source photo locator')+' · '+r.reportDate+' · '+r.reporter+'\n'+r.activity+' · '+r.location+'\nPDF SHA-256: '+r.pdfDigest;
