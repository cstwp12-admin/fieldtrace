import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({children,labelledBy,className='modal',onClose}:{children:ReactNode;labelledBy:string;className?:string;onClose:()=>void}) {
  const root=useRef<HTMLElement>(null);
  const close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const node=root.current!;
    const background=Array.from(document.querySelectorAll<HTMLElement>('.sidebar,.main-shell'));
    background.forEach(el=>el.inert=true);
    const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const items=()=>Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href]')).filter(el=>el.getClientRects().length>0);
    (items()[0]??node).focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();}
      if(e.key==='Tab'){
        const a=items();if(!a.length){e.preventDefault();return;}
        const first=a[0],last=a.at(-1)!;
        if(e.shiftKey&&(document.activeElement===first||!node.contains(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&(document.activeElement===last||!node.contains(document.activeElement))){e.preventDefault();first.focus();}
      }
    };
    node.addEventListener('keydown',key);
    return()=>{node.removeEventListener('keydown',key);background.forEach(el=>el.inert=false);document.body.style.overflow=oldOverflow;previous?.focus();};
  },[]);
  return <div className={className==='modal'?'modal-backdrop':'drawer-backdrop'}><section ref={root} tabIndex={-1} className={className} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</section></div>;
}
