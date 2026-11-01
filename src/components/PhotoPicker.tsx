import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import type { Photo } from '../domain/model';

async function readPhoto(file: File): Promise<Photo> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8*1024*1024)
    throw Error('Use JPG, PNG or WebP photographs up to 8 MB each.');
  const data = await new Promise<string>((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
  // Verify the content is an image, not just a file with an image extension.
  await new Promise<void>((resolve,reject) => {
    const image = new Image(); image.onload = () => resolve();
    image.onerror = () => reject(Error(`${file.name} is not a readable image.`)); image.src = data;
  });
  return {id:crypto.randomUUID(),name:file.name,data};
}

export function PhotoPicker({photos,onChange,disabled=false,onBusyChange}:{photos:Photo[];onChange:(p:Photo[])=>void;disabled?:boolean;onBusyChange?:(busy:boolean)=>void}) {
  const [error,setError] = useState(''), [reading,setReading] = useState(false);
  return <div className="photo-picker">
    <label className="file-label"><Upload size={19}/><span>Attach evidence photographs<small>Up to 8 per event · JPG, PNG or WebP · 8 MB each</small></span>
      <input type="file" aria-label="Evidence photographs" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled||reading} onChange={async e=>{
        const files=Array.from(e.currentTarget.files??[]);e.currentTarget.value='';setError('');
        if(files.length+photos.length>8){setError('Attach up to eight photographs per event.');return;}
        setReading(true);onBusyChange?.(true);
        try{const loaded:Photo[]=[];for(const f of files)loaded.push(await readPhoto(f));onChange([...photos,...loaded]);}
        catch(e){setError(e instanceof Error?e.message:'Could not load photographs.');}
        finally{setReading(false);onBusyChange?.(false);}
      }}/>
    </label>
    {reading&&<p role="status" className="muted">Reading photographs… Keep this form open.</p>}
    {error&&<p role="alert" className="overdue-text">{error}</p>}
    <div className="photo-grid">{photos.map(p=><figure key={p.id}><img src={p.data} alt={p.name}/><figcaption>{p.name}</figcaption><button type="button" className="text-button" disabled={disabled||reading} onClick={()=>onChange(photos.filter(x=>x.id!==p.id))}><X size={13}/>Remove attachment</button></figure>)}</div>
  </div>;
}

export function Photos({photos,caption}:{photos:Photo[];caption?:string}) {
  return <div className="photo-grid">{photos.map((p,i)=><figure key={p.id}><img src={p.data} alt={p.name}/><figcaption>{caption?`${caption} · ${i+1} · `:''}{p.name}</figcaption></figure>)}</div>;
}
