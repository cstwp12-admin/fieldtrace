import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { canMap, ch, projectRange, type Project } from '../domain/model';
import { setupChanges, withProjectKey, type SetupPreview } from '../exchange/setup';
import { Dialog } from './Dialog';

export function SetupImportDialog({preview,projects,onClose,onApply}:{preview:SetupPreview;projects:Project[];onClose:()=>void;onApply:(p:Project,targetId?:string,revision?:string)=>Promise<void>}){
  const p=preview.project,s=p.shared,range=projectRange(p);
  const [key,setKey]=useState(s?.projectKey??''),[target,setTarget]=useState(''),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const matches=useMemo(()=>projects.filter(x=>x.shared?.projectKey===key.trim()),[projects,key]);
  const previous=matches.find(x=>x.id===target);
  return <Dialog labelledBy="setup-import-heading" onClose={()=>{if(!busy)onClose();}}><div className="modal-heading"><div><span className="eyebrow">PHASE 3A · LOCAL FILE REVIEW</span><h2 id="setup-import-heading">Review project setup</h2></div><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Cancel setup import"><X/></button></div>
    <p className="muted">Nothing is saved until you confirm. Only project configuration is read; logos, credentials and personnel fields are not imported.</p>
    <dl><dt>Format</dt><dd>{preview.format}</dd><dt>Project</dt><dd>{p.name}</dd><dt>Project code</dt><dd>{s?.projectCode??'Local project'}</dd><dt>Contract</dt><dd>{s?.contractNo||'Not provided'}</dd><dt>Range</dt><dd>CH {ch(range.from)} – {ch(range.to)}</dd><dt>Map geometry</dt><dd>{canMap(p)?`${p.alignment.length} centreline points`:'Chainage-only · no coordinates'}</dd><dt>Source version</dt><dd>{s?.setupVersion||'Not provided'}</dd></dl>
    {s&&<div className="setup-counts"><span>{s.zones.length} zones</span><span>{s.sections.length} sections</span><span>{s.structures.length} structures</span><span>{s.activities.length} activities</span></div>}
    {preview.warnings.length>0&&<div className="setup-warnings" role="note"><strong>Review before importing</strong><ul>{preview.warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}
    <form onSubmit={async e=>{e.preventDefault();setError('');setBusy(true);try{await onApply(s?await withProjectKey(p,key):p,previous?.id,previous?.shared?.setupRevision);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}}>
      {s&&<><label>Shared project ID<input required maxLength={300} value={key} onChange={e=>{setKey(e.target.value);setTarget('');setConfirm(false);}}/></label><p className="muted">Use this same ID on all devices for this contract/package. The local workspace ID remains separate. Agree the ID before exchanging cases.</p>
      <label>Import destination<select value={target} onChange={e=>{setTarget(e.target.value);setConfirm(false);}}><option value="">Create a separate local project</option>{matches.map(x=><option key={x.id} value={x.id}>Update {x.name} ({x.id.slice(0,8)})</option>)}</select></label>
      {matches.length>0&&!previous&&<p className="muted">{matches.length} existing project(s) use this shared ID. Choose one above to update it; otherwise a separate copy will be created.</p>}
      <div className="setup-revisions"><span>Setup revision</span><code>{s.setupRevision.slice(0,16)}</code><span>Alignment revision</span><code>{s.alignmentRevision.slice(0,16)}</code></div>
      {previous&&<div className="setup-warnings"><strong>Changes to the selected project</strong><ul>{setupChanges(previous,p).map(x=><li key={x}>{x}</li>)}</ul><p>Observations, history and drafts stay intact. Changes that remove a referenced structure/activity or exclude recorded chainage will be blocked.</p></div>}</>}
      <label className="setup-confirm"><input type="checkbox" required checked={confirm} onChange={e=>setConfirm(e.target.checked)}/><span>I have checked the project identity, range and import destination.</span></label>
      {error&&<p className="overdue-text" role="alert">{error}</p>}<div className="modal-actions"><button className="button" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy||!confirm}><Check size={16}/>{busy?'Importing…':previous?'Apply reviewed setup':'Import as separate project'}</button></div>
    </form>
  </Dialog>;
}
