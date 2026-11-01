import { useState } from 'react';
import { Check, FileText, MapPin, X } from 'lucide-react';
import { ch, statuses, transition, type Observation } from '../domain/model';
import { commitObservation } from '../storage/database';
import { Dialog } from './Dialog';
import { PhotoPicker, Photos } from './PhotoPicker';
import { SdrLinks, SdrReferenceList } from './SdrLinks';
import { useDraft } from './useDraft';

const date=(s:string)=>new Date(s.length===10?`${s}T12:00:00`:s).toLocaleString('en-GB');
export function CaseDrawer({record,onClose,onSaved,onPrint}:{record:Observation;onClose:()=>void;onSaved:(o:Observation)=>Promise<void>;onPrint:()=>void}) {
  const id=`followup:${record.id}`;
  const {draft,ready,saved,failure,update,flush,discard}=useDraft(id,record.projectId,{status:record.status==='Reported'?'Action taken':record.status==='Closed'?'Reported':'Closed',by:'',note:'',baseUpdatedAt:record.updatedAt});
  const [busy,setBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[error,setError]=useState('');
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  const set=(key:string,value:string)=>update({...draft.fields,[key]:value});
  async function close(){try{await flush();onClose();}catch(e){setError(String(e));}}
  return <Dialog className="record-drawer" labelledBy="case-heading" onClose={()=>{if(!busy&&!photoBusy)void close();}}>
    <div className="drawer-top"><span className="eyebrow">{record.ref}</span><button className="icon-button" aria-label="Close record and keep draft" disabled={busy||photoBusy} onClick={()=>void close()}><X/></button></div>
    <span className={`badge ${record.status.toLowerCase().replaceAll(' ','-')}`}><span/>{record.status}</span>
    <h2 id="case-heading">{record.title}</h2><p className="drawer-location"><MapPin size={17}/>CH {ch(record.chainage)} · {record.side}</p><p>{record.description}</p>
    <dl><dt>Priority</dt><dd>{record.priority}</dd><dt>Responsible party</dt><dd>{record.assignee||'Unassigned'}</dd><dt>Target date</dt><dd>{record.due||'Not set'}</dd><dt>Recorded by</dt><dd>{record.reporter}</dd><dt>Location source</dt><dd>{record.locationSource}{record.accuracyM!=null?` · ±${Math.round(record.accuracyM)} m`:''}</dd></dl>
    <h3>Original observation evidence</h3><Photos photos={record.photos} caption="Original condition"/>{!record.photos.length&&<p className="muted">No original photographs attached.</p>}
    {record.projectContext&&<div className="setup-reference"><strong>Shared project reference</strong><p>{record.projectContext.projectKey}</p><p>Asset: {record.projectContext.assetId||'Not selected'} · Activity: {record.projectContext.activityId||'Not selected'}</p><p>Recorded setup revision: {record.projectContext.setupRevision.slice(0,16)}</p></div>}
    <button className="button" onClick={onPrint}><FileText size={17}/>Preview evidence & closure report</button>
    <h3 className="history-heading">Action & verification history</h3><ol className="timeline">{record.history.map((h,i)=><li key={i}><span className="timeline-dot"/><strong>{h.kind==='sdr-link'?'SDR evidence linked · status unchanged':h.status}</strong><small>{h.by} · {date(h.at)}</small><p>{h.note}</p><SdrReferenceList refs={h.evidenceRefs??[]}/><Photos photos={h.photos??[]} caption={h.status==='Closed'?'Verification evidence':h.status==='Action taken'?'Corrective action':'Review evidence'}/></li>)}</ol>
    <SdrLinks record={record} onSaved={onSaved} beforeSave={flush} onBusyChange={setPhotoBusy} disabled={busy||photoBusy||!ready||!!draft.fields.note?.trim()||!!draft.fields.by?.trim()||!!draft.photos.length}/><p className="muted">Finish or discard any unfinished action update before adding SDR links.</p>
    {ready&&<form className="follow-up" onSubmit={async e=>{e.preventDefault();setError('');setBusy(true);try{
      await flush();if(draft.fields.baseUpdatedAt!==record.updatedAt)throw Error('This draft belongs to an earlier revision. Copy your notes, reopen the record and review the latest history before submitting.');
      const updated=transition(record,draft.fields.status as Observation['status'],draft.fields.note,draft.fields.by,draft.photos);
      await commitObservation(updated,id,record.updatedAt);await onSaved(updated);
    }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}}>
      <h3>{record.status==='Closed'?'Add a review or reopen':'Record an action or verification'}</h3><p className="muted">A closure needs a verification note. Names are recorded statements; roles are not authenticated in this local release.</p>
      <p role="status" className="draft-status">{saved}</p>{failure&&<p role="alert" className="overdue-text">{failure}</p>}
      <fieldset disabled={busy||photoBusy} className="capture-fields"><label>Status<select value={draft.fields.status} onChange={e=>set('status',e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><label>Your name<input required maxLength={120} value={draft.fields.by} onChange={e=>set('by',e.target.value)}/></label><label>{draft.fields.status==='Closed'?'Verification / closure note':'Action or review note'}<textarea required rows={3} maxLength={4000} value={draft.fields.note} onChange={e=>set('note',e.target.value)}/></label></fieldset>
      <PhotoPicker photos={draft.photos} disabled={busy||photoBusy} onBusyChange={setPhotoBusy} onChange={photos=>update(draft.fields,photos)}/>
      {error&&<p role="alert" className="overdue-text">{error}</p>}<button className="button primary" disabled={busy||photoBusy}><Check size={17}/>{busy?'Saving…':'Save update & evidence'}</button>
      <div className="draft-discard">{confirmDiscard?<><span>Discard this unfinished update and its attachments? Existing case history is kept.</span><button className="text-button" type="button" disabled={busy||photoBusy} onClick={async()=>{try{await discard();onClose();}catch(e){setError(String(e));}}}>Discard update draft</button><button className="text-button" type="button" onClick={()=>setConfirmDiscard(false)}>Keep draft</button></>:<button className="text-button" type="button" disabled={busy||photoBusy} onClick={()=>setConfirmDiscard(true)}>Discard unfinished update…</button>}</div>
    </form>}
  </Dialog>;
}
