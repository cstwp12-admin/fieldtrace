import { useState } from 'react';
import { Check, LocateFixed, X } from 'lucide-react';
import { canMap, categories, ch, localDate, locationContext, parseCh, projectRange, type Photo, type Project } from '../domain/model';
import { projectPosition } from '../geo/alignment';
import { Dialog } from './Dialog';
import { PhotoPicker } from './PhotoPicker';
import { useDraft } from './useDraft';

export type Capture = { fields:Record<string,string>; photos:Photo[]; draftId:string };
export function CaptureForm({project,busy,error,onClose,onSubmit}:{project:Project;busy:boolean;error:string;onClose:()=>void;onSubmit:(capture:Capture)=>Promise<void>}) {
  const id=`observation:${project.id}`;
  const {draft,ready,saved,failure,update,flush,discard}=useDraft(id,project.id,{
    title:'',category:'Quality',priority:'Medium',chainage:ch(projectRange(project).from),side:'LHS',
    description:'',assignee:'',due:localDate(),reporter:'',lat:'',lon:'',accuracy:'',assetId:'',activityId:''
  });
  const [gps,setGps]=useState(''),[gpsBusy,setGpsBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[localError,setLocalError]=useState(''),[discarding,setDiscarding]=useState(false);
  const field=(key:string,value:string)=>update({...draft.fields,[key]:value});
  const input=(key:string)=>({value:draft.fields[key]??'',onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>field(key,e.target.value)});
  async function close(){try{await flush();onClose();}catch(e){setLocalError(String(e));}}
  let context:ReturnType<typeof locationContext>|undefined;
  try{context=locationContext(project,parseCh(draft.fields.chainage));}catch{ /* Incomplete draft chainage is allowed. */ }
  function locate(){
    if(!canMap(project)){setGps('This setup has no centreline. Enter chainage manually.');return;}
    if(!navigator.geolocation){setGps('Location is unavailable. Enter chainage manually.');return;}
    setGpsBusy(true);setGps('Requesting location…');
    navigator.geolocation.getCurrentPosition(p=>{setGpsBusy(false);try{
      const r=projectPosition(project,p.coords.latitude,p.coords.longitude);
      if(r.distanceM>500){setGps(`Position is ${Math.round(r.distanceM)} m from this alignment. Enter chainage manually.`);return;}
      update({...draft.fields,chainage:ch(r.chainage),lat:String(p.coords.latitude),lon:String(p.coords.longitude),accuracy:String(p.coords.accuracy)});
      setGps(`GPS captured · ±${Math.round(p.coords.accuracy)} m · Confirm chainage before saving.`);
    }catch(e){setGps(String(e));}},()=>{setGpsBusy(false);setGps('Could not obtain location. Enter chainage manually.');},{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  }
  return <Dialog labelledBy="capture-heading" onClose={()=>{if(!busy&&!photoBusy&&!gpsBusy)void close();}}><div className="modal-heading"><div><span className="eyebrow">FIELD CAPTURE · RECOVERABLE DRAFT</span><h2 id="capture-heading">New observation</h2></div><button className="icon-button" aria-label="Save draft and close" disabled={busy||photoBusy||gpsBusy} onClick={()=>void close()}><X/></button></div>
    <p role="status" className="draft-status">{saved}</p>
    {failure&&<p role="alert" className="overdue-text">{failure}</p>}
    {ready&&<form onSubmit={async e=>{e.preventDefault();setLocalError('');try{await flush();await onSubmit({fields:draft.fields,photos:draft.photos,draftId:id});}catch(e){setLocalError(String(e));}}}>
      <fieldset disabled={busy||photoBusy||gpsBusy} className="capture-fields">
        <label>Observation title<input required maxLength={160} placeholder="What needs attention?" {...input('title')}/></label>
        <div className="form-grid"><label>Category<select {...input('category')}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Priority<select {...input('priority')}><option>High</option><option>Medium</option><option>Low</option></select></label></div>
        <div className="location-box"><div><span className="eyebrow">LOCATION</span><button type="button" className="text-button" disabled={!canMap(project)} onClick={locate}><LocateFixed size={16}/>Use my location</button></div><div className="form-grid"><label>Chainage<input required placeholder="e.g. 1+250" {...input('chainage')}/></label><label>Side<select {...input('side')}><option>LHS</option><option>RHS</option><option>Centre</option></select></label></div>{gps&&<p role="status">{gps}</p>}{draft.fields.lat&&<p>GPS evidence retained separately from stated chainage. <button className="text-button" type="button" onClick={()=>update({...draft.fields,lat:'',lon:'',accuracy:''})}>Use chainage only</button></p>}</div>
        {project.shared&&<div className="shared-capture"><p className="muted">Shared project: {project.shared.projectCode} · {context?.zone?.name??'No zone at this chainage'}{context?.sections.length?` · ${context.sections.map(x=>x.name).join(', ')}`:''}</p><div className="form-grid"><label>Structure / asset<select {...input('assetId')}><option value="">No structure selected</option>{project.shared.structures.map(a=><option key={a.id} value={a.id}>{a.id} · {a.name} · CH {ch(a.ch)}</option>)}</select></label><label>Source activity<select {...input('activityId')}><option value="">No activity selected</option>{project.shared.activities.map(a=><option key={a.id} value={a.id}>{a.id} · {a.en||a.bm}</option>)}</select></label></div><p className="muted">Selecting a structure keeps its source ID; it does not replace the observed chainage or imply inspection acceptance.</p></div>}
        <label>Description<textarea required maxLength={4000} rows={3} {...input('description')}/></label>
        <div className="form-grid"><label>Responsible party<input maxLength={120} {...input('assignee')}/></label><label>Target date<input type="date" {...input('due')}/></label></div>
        <label>Recorded by<input required maxLength={120} {...input('reporter')}/></label>
      </fieldset>
      <PhotoPicker photos={draft.photos} disabled={busy||gpsBusy} onBusyChange={setPhotoBusy} onChange={photos=>update(draft.fields,photos)}/>
      {(error||localError)&&<p role="alert" className="overdue-text">{error||localError}</p>}
      <div className="modal-actions"><button className="button" type="button" disabled={busy||photoBusy||gpsBusy} onClick={()=>void close()}>Save draft & close</button><button className="button primary" disabled={busy||photoBusy||gpsBusy}><Check size={17}/>{busy?'Saving…':'Submit observation'}</button></div>
      <div className="draft-discard">{discarding?<><span>Discard this unfinished draft and its attachments?</span><button type="button" className="text-button" onClick={async()=>{try{await discard();onClose();}catch(e){setLocalError(String(e));}}}>Discard draft</button><button type="button" className="text-button" onClick={()=>setDiscarding(false)}>Keep draft</button></>:<button type="button" className="text-button" disabled={busy||photoBusy||gpsBusy} onClick={()=>setDiscarding(true)}>Discard unfinished draft…</button>}</div>
    </form>}
  </Dialog>;
}
