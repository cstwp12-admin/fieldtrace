import { useEffect, useRef, useState } from 'react';
import type { Observation } from '../domain/model';
import { referenceKey, referenceText, validateReferencePackage, type SdrReference } from '../exchange/sdr-reference.js';
import { linkEvidence } from '../exchange/sdr-links';
import { commitObservation } from '../storage/database';
export function SdrLinks({record,onSaved,disabled,beforeSave,onBusyChange}:{record:Observation;onSaved:(o:Observation)=>Promise<void>;disabled:boolean;beforeSave:()=>Promise<void>;onBusyChange:(v:boolean)=>void}){
  const input=useRef<HTMLInputElement>(null),[refs,setRefs]=useState<SdrReference[]>([]),[picked,setPicked]=useState(new Set<string>()),[by,setBy]=useState(''),[note,setNote]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{onBusyChange(busy);return()=>onBusyChange(false);},[busy,onBusyChange]);
  const existing=new Set(record.history.flatMap(h=>(h.evidenceRefs??[]).map(referenceKey)));
  return <section className="setup-reference sdr-links"><h3>Linked SDR evidence</h3><p>References retain the source report/item and PDF fingerprint. Original SDR photographs remain with the source PDF. Adding a link keeps this case’s status unchanged.</p>
    <input ref={input} hidden type="file" accept=".json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setMessage('');setBusy(true);setRefs([]);setPicked(new Set());try{if(file.size>5*1024*1024)throw Error('Choose a reference package smaller than 5 MB.');const p=await validateReferencePackage(JSON.parse(await file.text()),record.projectContext?.projectKey??'');setRefs(p.references);setMessage('Preview only. Select source items and confirm below.');}catch(err){setMessage(err instanceof Error?err.message:String(err));}finally{setBusy(false);}}}/>
    <button type="button" className="button" disabled={disabled||busy||!record.projectContext} onClick={()=>input.current?.click()}>Import SDR references</button>
    {!record.projectContext&&<p>This case needs shared capture context to link project evidence.</p>}
    {!!refs.length&&<div><p>{refs.length} source items · {picked.size} selected. Already-linked items are disabled.</p><div className="exchange-selection">{refs.map(r=>{const k=referenceKey(r);return <label key={k}><input type="checkbox" disabled={busy||disabled||existing.has(k)} checked={picked.has(k)} onChange={e=>setPicked(s=>{const next=new Set(s);e.target.checked?next.add(k):next.delete(k);return next;})}/><span style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{referenceText(r)}{existing.has(k)?' · Already linked':''}<small>{r.remarks}</small></span></label>;})}</div>
      <label>Your name for evidence link<input maxLength={120} value={by} disabled={busy||disabled} onChange={e=>setBy(e.target.value)}/></label><label>Evidence link review note<textarea maxLength={4000} value={note} disabled={busy||disabled} onChange={e=>setNote(e.target.value)}/></label>
      <button type="button" className="button primary" disabled={busy||disabled||!picked.size||picked.size>20||!by.trim()||!note.trim()} onClick={async()=>{setBusy(true);setMessage('');try{await beforeSave();const next=await linkEvidence(record,refs.filter(r=>picked.has(referenceKey(r))),by,note);await commitObservation(next,'followup:'+record.id,record.updatedAt);setRefs([]);setPicked(new Set());await onSaved(next);}catch(err){setMessage(err instanceof Error?err.message:String(err));}finally{setBusy(false);}}}>Confirm evidence links · keep status</button></div>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
export function SdrReferenceList({refs}:{refs:SdrReference[]}){return <div>{refs.map(r=><div className="setup-reference" key={referenceKey(r)} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}><strong>SDR source reference</strong><p>{referenceText(r)}</p><p>{r.remarks}</p><small>Reference only; source photographs are not copied.</small></div>)}</div>;}
