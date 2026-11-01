import { useEffect, useRef, useState } from 'react';
import { deleteDraft, loadDraft, saveDraft } from '../storage/database';
import type { Draft } from '../domain/drafts';
import type { Photo } from '../domain/model';

export function useDraft(id:string,projectId:string,defaults:Record<string,string>) {
  const [draft,setDraft]=useState<Draft>({id,projectId,updatedAt:new Date().toISOString(),fields:defaults,photos:[]});
  const [ready,setReady]=useState(false),[saved,setSaved]=useState('Opening local draft…');
  const [failure,setFailure]=useState('');
  const pending=useRef<Promise<unknown>>(Promise.resolve());
  const current=useRef(draft), lastError=useRef<unknown>(null), live=useRef(true);
  useEffect(()=>{live.current=true;let cancelled=false;
    loadDraft(id).then(d=>{if(cancelled)return;if(d){current.current=d;setDraft(d);setSaved('Recovered local draft, including attachments.');}else setSaved('Changes will be saved on this device.');setReady(true);})
      .catch(()=>{if(!cancelled){setFailure('Could not read your draft. Close and retry before entering data.');setSaved('Draft unavailable.');}});
    return()=>{cancelled=true;live.current=false;};
  },[id]);
  function update(fields:Record<string,string>,photos:Photo[]=current.current.photos){
    const next={id,projectId,updatedAt:new Date().toISOString(),fields,photos};
    current.current=next;setDraft(next);setSaved('Saving draft…');
    pending.current=pending.current.catch(()=>{}).then(()=>saveDraft(next)).then(()=>{
      lastError.current=null;if(live.current&&current.current===next){setSaved('Draft saved on this device.');setFailure('');}
    }).catch(e=>{lastError.current=e;if(live.current){setSaved('Draft not saved.');setFailure('Device storage could not save this draft. Keep this form open and retry.');}});
  }
  async function flush(){await pending.current;if(lastError.current)throw Error('Draft could not be saved. Keep the form open and retry.');}
  async function discard(){await pending.current;await deleteDraft(id);lastError.current=null;}
  return {draft,ready,saved,failure,update,flush,discard};
}
