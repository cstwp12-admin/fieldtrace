import { useState } from 'react';
import { ArrowDownToLine, X } from 'lucide-react';
import { ch, photoCount, type Observation, type Project } from '../domain/model';
import { exchangeEligible, exportCasePackage } from '../exchange/cases';
import { Dialog } from './Dialog';
export function CaseExportDialog({project,records,onClose}:{project:Project;records:Observation[];onClose:()=>void}){
  const eligible=records.filter(o=>exchangeEligible(project,o));
  const [selected,setSelected]=useState(new Set(eligible.map(o=>o.id))),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const picked=eligible.filter(o=>selected.has(o.id));
  return <Dialog labelledBy="exchange-heading" onClose={()=>{if(!busy)onClose();}}><div className="modal-heading"><div><span className="eyebrow">CASE EXCHANGE · PRIVATE FILE</span><h2 id="exchange-heading">Send cases to SiteBoard</h2></div><button className="icon-button" aria-label="Close case export" disabled={busy} onClick={onClose}><X/></button></div>
    <p className="muted">Exports submitted cases, complete event photographs, source geometry, linked SDR references, revision digests and an attachment manifest. Drafts and browser settings are excluded. The download contains private project information.</p>
    <p className="setup-reference">{project.shared?.projectKey??'Import a shared project setup first.'}</p>
    {records.length!==eligible.length&&<p className="setup-warnings">{records.length-eligible.length} legacy/local case(s) lack shared context and cannot be exchanged. They remain in your recovery backup.</p>}
    <div className="setup-counts"><span>{picked.length} selected cases</span><span>{picked.reduce((n,o)=>n+photoCount(o),0)} photographs</span></div>
    <div className="exchange-selection">{eligible.map(o=><label key={o.id}><input type="checkbox" checked={selected.has(o.id)} disabled={busy} onChange={e=>setSelected(s=>{const next=new Set(s);e.target.checked?next.add(o.id):next.delete(o.id);return next;})}/><span><strong>{o.ref} · {o.title}</strong><small>CH {ch(o.chainage)} · {o.status} · {photoCount(o)} photos · {o.history.reduce((n,h)=>n+(h.evidenceRefs?.length??0),0)} SDR references</small></span></label>)}</div>
    {!eligible.length&&<p className="muted">Create an observation in a project imported from the shared SDR setup to begin.</p>}
    {message&&<p role="status" className="muted">{message}</p>}<div className="modal-actions"><button className="button" disabled={busy} onClick={onClose}>Close</button><button className="button primary" disabled={busy||!picked.length} onClick={async()=>{setBusy(true);setMessage('Checking records and attachment digests…');try{const p=await exportCasePackage(project,picked);setMessage(`Package prepared: ${p.cases.length} cases, ${p.attachments.length} attachments. In SiteBoard, open FieldTrace cases and import this file.`);}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}}><ArrowDownToLine size={16}/>{busy?'Preparing…':'Download case package'}</button></div>
  </Dialog>;
}
