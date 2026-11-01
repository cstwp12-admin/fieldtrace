export const PLATFORMS=['Android','iPhone'];
export const TASKS=['Capture','Follow-up','Report','Retrieve','Restore'];
export const CHECKS=[
  ['install','Open/install','Open the HTTPS release, confirm the version, and try the browser’s installation or home-screen option.',false],
  ['layout','Touch and keyboard','Enter a complete case at phone width; reach every button with the keyboard open, scroll the history and read the source references.',true],
  ['draft','Draft recovery','Attach an original photo, save/close, restart the browser and recover the same fields and photo.',true],
  ['offline','Offline restart','After the release says it is available offline, turn off networking, close/reopen the app and submit a new case and follow-up.',true],
  ['gps','GPS and manual fallback','Try allowed and denied location access. Review reported accuracy/chainage and side; verify manual entry and chainage-only operation. Record poor-signal findings.',true],
  ['media','Camera and large images','Try the camera and file picker, portrait/landscape images and a 4–8 MB supported photo. Reject an unsupported or oversized file without losing existing evidence.',true],
  ['history','Action and verification','IOW and engineer complete one case with separate original, action and verification photos. Confirm all stages remain after reopening.',true],
  ['report','Evidence output','Save/print the case report on the device. Check every photo, long note, chainage, review event and source reference for clipping or omissions.',true],
  ['exchange','SiteBoard round trip','Transfer a private case package to SiteBoard; repeat import without duplication. Check an SDR reference, revised/missing source indication and independent legacy state.',true],
  ['restore','Downloaded recovery','Download a backup, restore as a separate copy, compare cases/photos/drafts/SDR links, and re-export without creating duplicate SiteBoard cases.',true],
  ['interrupt','Suspension and interruption','Lock/unlock the phone and background/reopen the browser during draft entry. Confirm saved evidence remains and unsaved work is clearly identified.',true]
].map(([id,title,expected,critical])=>({id,title,expected,critical}));
export function blankPilot(){return {schema:'fieldtrace-pilot/1',appVersion:'0.6.0',siteboardVersion:'0.12.0',runId:'',trialDate:'',ownerCode:'',devices:Object.fromEntries(PLATFORMS.map(p=>[p,{model:'',os:'',browser:'',checks:Object.fromEntries(CHECKS.map(c=>[c.id,{status:'pending',notes:''}]))}])),timings:[],decisionNotes:''};}
const statuses=['pending','pass','fail','blocked','not-tested'];
function text(v,max=4000){if(typeof v!=='string'||v.length>max)throw Error('Invalid pilot text.');}
export function validatePilot(value){
  const base=blankPilot();if(value?.schema!==base.schema)throw Error('Choose a FieldTrace pilot results file, not a project backup.');
  for(const k of ['runId','trialDate','ownerCode','appVersion','siteboardVersion','decisionNotes']){text(value[k],k==='decisionNotes'?4000:200);base[k]=value[k];}
  if(value.trialDate&&(!/^\d{4}-\d\d-\d\d$/.test(value.trialDate)||!Number.isFinite(Date.parse(value.trialDate+'T00:00:00Z'))||new Date(value.trialDate+'T00:00:00Z').toISOString().slice(0,10)!==value.trialDate))throw Error('Invalid trial date.');
  for(const p of PLATFORMS){const d=value.devices?.[p];if(!d)throw Error('Both device records are required.');for(const k of ['model','os','browser']){text(d[k],200);base.devices[p][k]=d[k];}for(const c of CHECKS){const row=d.checks?.[c.id];if(!row||!statuses.includes(row.status))throw Error('Invalid device check result.');text(row.notes);base.devices[p].checks[c.id]={status:row.status,notes:row.notes};}}
  if(!Array.isArray(value.timings)||value.timings.length>200)throw Error('Limit pilot timing samples to 200.');
  base.timings=value.timings.map(r=>{if(!PLATFORMS.includes(r.platform)||!TASKS.includes(r.task))throw Error('Invalid timing task or platform.');text(r.sample,100);for(const k of ['baselineSec','trialSec'])if(r[k]!==null&&(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<=0||r[k]>86400))throw Error('Durations must be positive seconds or blank.');return {platform:r.platform,task:r.task,sample:r.sample,baselineSec:r.baselineSec,trialSec:r.trialSec};});
  return base;
}
export function median(values){if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
export function pilotSummary(raw){
  const s=validatePilot(raw),rows=PLATFORMS.flatMap(p=>CHECKS.map(c=>({...c,platform:p,...s.devices[p].checks[c.id]}))),criticalFailures=rows.filter(r=>r.critical&&r.status==='fail'),remaining=rows.filter(r=>r.critical&&r.status!=='pass'),failures=rows.filter(r=>r.status==='fail');
  const metrics=PLATFORMS.flatMap(platform=>TASKS.map(task=>{const samples=s.timings.filter(r=>r.platform===platform&&r.task===task),trials=samples.filter(r=>r.trialSec!==null),pairs=trials.filter(r=>r.baselineSec!==null),baseline=median(pairs.map(r=>r.baselineSec)),pairedTrial=median(pairs.map(r=>r.trialSec));return {platform,task,n:trials.length,pairedN:pairs.length,trialMedian:median(trials.map(r=>r.trialSec)),baselineMedian:baseline,pairedTrialMedian:pairedTrial,changePct:baseline===null?null:100*(baseline-pairedTrial)/baseline};}));
  const metadata=!!s.runId.trim()&&!!s.ownerCode.trim()&&!!s.trialDate&&PLATFORMS.every(p=>['model','os','browser'].every(k=>s.devices[p][k].trim()));
  const missingTimings=metrics.filter(r=>['Capture','Report','Retrieve'].includes(r.task)&&r.n<3);
  let gate='Field trials pending';if(criticalFailures.length)gate='Stop: critical failure recorded';else if(remaining.length)gate='Field trials incomplete';else if(failures.length)gate='Review failed checks';else if(!metadata||missingTimings.length)gate='Complete device details and timing samples';else gate='Ready for human acceptance review';
  return {gate,passed:rows.filter(r=>r.status==='pass').length,total:rows.length,criticalFailures:criticalFailures.length,remainingCritical:remaining.length,missingTimings:missingTimings.length,metadataComplete:metadata,metrics};
}
