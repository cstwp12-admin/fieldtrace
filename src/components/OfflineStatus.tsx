import { useEffect, useState } from 'react';
import { ArrowDownToLine, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export function OfflineStatus(){
  const [online,setOnline]=useState(navigator.onLine),[ready,setReady]=useState(false),[waiting,setWaiting]=useState<ServiceWorker|null>(null),[install,setInstall]=useState<InstallEvent|null>(null),[error,setError]=useState('');
  useEffect(()=>{
    const network=()=>setOnline(navigator.onLine),prompt=(e:Event)=>{e.preventDefault();setInstall(e as InstallEvent);},installed=()=>setInstall(null);
    window.addEventListener('online',network);window.addEventListener('offline',network);window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',installed);
    let disposed=false;const disposers:(()=>void)[]=[];
    if(import.meta.env.PROD&&'serviceWorker' in navigator){
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).then(reg=>{
        if(disposed)return;
        if(reg.active?.state==='activated')setReady(true);if(reg.waiting)setWaiting(reg.waiting);
        navigator.serviceWorker.ready.then(()=>{if(!disposed)setReady(true);});
        const watch=()=>{const worker=reg.installing;if(!worker)return;
          const changed=()=>{if(disposed)return;if(worker.state==='activated')setReady(true);if(worker.state==='installed'&&navigator.serviceWorker.controller)setWaiting(reg.waiting);};
          worker.addEventListener('statechange',changed);disposers.push(()=>worker.removeEventListener('statechange',changed));
        };
        reg.addEventListener('updatefound',watch);disposers.push(()=>reg.removeEventListener('updatefound',watch));watch();
      }).catch(()=>{if(!disposed)setError('Offline shell unavailable. Use the app online and keep a project backup.');});
    }
    return()=>{disposed=true;disposers.forEach(fn=>fn());window.removeEventListener('online',network);window.removeEventListener('offline',network);window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',installed);};
  },[]);
  return <div className="offline-banner" role="status"><span>{!online?<WifiOff size={15}/>:<ShieldCheck size={15}/>} {!online?'Offline · using local records':ready?'Application available offline':import.meta.env.DEV?'Development preview · offline install requires release build':'Preparing offline application…'}</span>
    {error&&<span>{error}</span>}{install&&<button className="text-button" onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null);}}><ArrowDownToLine size={14}/>Install app</button>}
    {waiting&&<button className="text-button" onClick={()=>{
      if(document.querySelector('[role=dialog]')){setError('Save and close the current form before applying the update.');return;}
      navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload(),{once:true});waiting.postMessage({type:'ACTIVATE_UPDATE'});
    }}><RefreshCw size={14}/>Update & reload</button>}
  </div>;
}
