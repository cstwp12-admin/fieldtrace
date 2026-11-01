import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronDown, ClipboardList, Clock3, Compass, Database, FileText, FolderOpen, Layers, LocateFixed, Map, MapPin, Menu, Plus, Search, ShieldCheck, Upload, X } from 'lucide-react';
import { canMap, ch, isOverdue, parseCh, photoCount, projectRange, projectSchema, statuses, type Observation, type Project } from './domain/model';
import { demoObservations, demoProject } from './domain/demo';
import { addDemo, applySetupImport, commitObservation, loadObservations, loadProjects, restoreCopy, saveProject } from './storage/database';
import { backup, csv, download } from './exchange/files';
import { MapView } from './components/MapView';
import { CaptureForm, type Capture } from './components/CaptureForm';
import { CaseDrawer } from './components/CaseDrawer';
import { EvidenceReport } from './components/EvidenceReport';
import { OfflineStatus } from './components/OfflineStatus';
import { StorageHealth } from './components/StorageHealth';
import { Dialog } from './components/Dialog';
import { SetupImportDialog } from './components/SetupImportDialog';
import { SharedSetupPanel } from './components/SharedSetupPanel';
import { previewSetup, type SetupPreview } from './exchange/setup';
import { syntheticSetup } from './exchange/synthetic-setup';
import { CaseExportDialog } from './components/CaseExportDialog';

type Tab = 'Overview' | 'Project map' | 'Observations' | 'Reports' | 'Project data';
const tabs: { name: Tab; icon: typeof Map }[] = [
  { name: 'Overview', icon: Layers }, { name: 'Project map', icon: Map },
  { name: 'Observations', icon: ClipboardList }, { name: 'Reports', icon: FileText }, { name: 'Project data', icon: Database }
];
const date = (value: string) => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : 'Not set';
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-');
function Badge({ status }: { status: string }) { return <span className={`badge ${slug(status)}`}><span />{status}</span>; }

export function App() {
  const [projects,setProjects] = useState<Project[]>([]);
  const [project,setProject] = useState<Project | null>(null);
  const [records,setRecords] = useState<Observation[]>([]);
  const [tab,setTab] = useState<Tab>('Overview');
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [loading,setLoading] = useState(true);
  const [modal,setModal] = useState<'new' | 'project' | 'exchange' | null>(null);
  const [selected,setSelected] = useState<Observation | null>(null);
  const [setupPreview,setSetupPreview] = useState<SetupPreview|null>(null);
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState('All statuses');
  const [mapSearch,setMapSearch] = useState('');
  const [find,setFind] = useState<number>();
  const [mobile,setMobile] = useState(false);
  const [print,setPrint] = useState(false);
  const [busy,setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const restoreInput = useRef<HTMLInputElement>(null);
  const selectRecord = useCallback((o: Observation) => {setSelected(o);},[]);
  const activate = useCallback(async (p: Project) => {
    setError(''); setSelected(null); setQuery(''); setFilter('All statuses'); setFind(undefined);
    try { const rows = await loadObservations(p.id); setProject(p);setRecords(rows); } catch {setError('Could not read local records. Try another browser or restore a backup.');}
  },[]);
  useEffect(() => { loadProjects().then(async ps => {setProjects(ps);if(ps.length)await activate(ps[0]);}).catch(() => setError('Local storage is unavailable. Enable browser storage to use FieldTrace.')).finally(() => setLoading(false)); },[activate]);
  useEffect(() => { if(!notice)return; const id=setTimeout(()=>setNotice(''),6000);return()=>clearTimeout(id); },[notice]);

  async function tryDemo() {
    setBusy(true);setError('');
    try { await addDemo(demoProject,demoObservations());setProjects(await loadProjects());await activate(demoProject);setNotice('Demonstration loaded. All locations and records are invented.'); }
    catch(e){setError(message(e));}finally{setBusy(false);}
  }
  function message(e:unknown) { return e instanceof Error ? e.message : 'The operation could not be completed.'; }
  async function importFile(file:File|undefined,restore=false) {
    if(!file)return;setError('');setBusy(true);
    try {
      if(file.size>(restore?100:10)*1024*1024)throw Error(restore?'Choose a backup smaller than 100 MB.':'Choose a setup smaller than 10 MB.');
      const data:unknown=JSON.parse(await file.text());
      if(restore){
        const p=await restoreCopy(data);setProjects(await loadProjects());await activate(p);setNotice('Backup restored as a separate project.');
      }else{
        setSetupPreview(await previewSetup(data));
      }
    }catch(e){setError(message(e));}finally{setBusy(false);if(fileInput.current)fileInput.current.value='';if(restoreInput.current)restoreInput.current.value='';}
  }
  async function importReviewedSetup(p:Project,targetId?:string,revision?:string) {
    const saved=await applySetupImport(p,targetId,revision);
    setProjects(await loadProjects());await activate(saved);setSetupPreview(null);
    setNotice(targetId?'Reviewed setup applied. Observations and drafts were retained.':'Shared setup imported as a separate local project.');
  }
  async function createObservation({fields:f,photos,draftId}:Capture) {
    if(!project||busy)return;setBusy(true);setError('');
    try {
      const chainage=parseCh(f.chainage);
      if(chainage<projectRange(project).from||chainage>projectRange(project).to)throw Error('Chainage is outside the active project alignment.');
      const at=new Date().toISOString(),id=crypto.randomUUID(),reporter=f.reporter.trim();
      const o:Observation={id,projectId:project.id,ref:`OBS-${id.slice(0,8).toUpperCase()}`,title:f.title.trim(),description:f.description.trim(),category:f.category as Observation['category'],priority:f.priority as Observation['priority'],chainage,side:f.side as Observation['side'],lat:f.lat?Number(f.lat):null,lon:f.lon?Number(f.lon):null,accuracyM:f.accuracy?Number(f.accuracy):null,locationSource:f.lat?'GPS':'Chainage',assignee:f.assignee.trim(),due:f.due,reporter,createdAt:at,updatedAt:at,status:'Reported',photos,history:[{at,by:reporter,status:'Reported',note:'Observation recorded.'}]};
      if(project.shared){
        if(f.assetId&&!project.shared.structures.some(a=>a.id===f.assetId))throw Error('The selected structure is not in this project setup. Review the draft selection.');
        if(f.activityId&&!project.shared.activities.some(a=>a.id===f.activityId))throw Error('The selected activity is not in this project setup. Review the draft selection.');
        o.projectContext={projectKey:project.shared.projectKey,setupRevision:project.shared.setupRevision,alignmentRevision:project.shared.alignmentRevision,...(f.assetId?{assetId:f.assetId}:{}),...(f.activityId?{activityId:f.activityId}:{})};
      }
      await commitObservation(o,draftId);
      setRecords(await loadObservations(project.id));setModal(null);selectRecord(o);setNotice('Observation submitted. Original evidence is saved in its case history.');
    }catch(e){setError(message(e));}finally{setBusy(false);}
  }
  async function exportBackup() {
    if(!project)return;
    try{await backup(project,records);setNotice('Backup download prepared, including case photographs and unfinished drafts.');}catch(e){setError(message(e));}
  }
  function preparePrint(one?:Observation) {setSelected(one??null);setPrint(true);}
  const visible=records.filter(o=>(filter==='All statuses'||(filter==='Overdue'?isOverdue(o):o.status===filter))&&`${o.title} ${o.ref} ${o.assignee} ${o.description} ${ch(o.chainage)}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const open=records.filter(o=>o.status!=='Closed').length,overdue=records.filter(o=>isOverdue(o)).length,awaiting=records.filter(o=>o.status==='Action taken').length,closed=records.filter(o=>o.status==='Closed').length;

  return <div className="app-shell">
    <input hidden ref={fileInput} type="file" accept=".json" onChange={e=>void importFile(e.target.files?.[0])}/>
    <input hidden ref={restoreInput} type="file" accept=".json" onChange={e=>void importFile(e.target.files?.[0],true)}/>
    <aside className={`sidebar ${mobile?'mobile-open':''}`}>
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setTab('Overview');setMobile(false);}}><span className="brand-mark"><Compass size={25}/></span><span>FieldTrace<small>THE SITEBOARD ECOSYSTEM</small></span></a>
      <div className="sidebar-caption">WORKSPACE</div>
      <nav aria-label="Main navigation">{tabs.map(({name,icon:Icon})=><button key={name} className={tab===name?'active':''} onClick={()=>{setTab(name);setSelected(null);setMobile(false);}}><Icon size={19}/>{name}{name==='Observations'&&open>0&&<span className="nav-count">{open}</span>}</button>)}</nav>
      <div className="sidebar-card"><span className="tiny-label">BUILT FOR THE FIELD</span><p>A clear location.<br/>A complete history.</p><span>Locate. Inspect. Follow through.</span><Compass size={60}/></div>
      <div className="sidebar-foot"><ShieldCheck size={18}/><div>Stored on this device<small>No project upload service</small></div><span className="green-dot"/></div>
      <div className="version">FIELDTRACE <span>v0.6.0 · Field pilot candidate</span></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={()=>setMobile(!mobile)}><Menu size={21}/></button><div className="project-picker"><span className="project-icon"><FolderOpen size={18}/></span><select aria-label="Active project" value={project?.id??''} onChange={e=>{const p=projects.find(p=>p.id===e.target.value);if(p)void activate(p);}}><option value="" disabled>Select a project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><ChevronDown size={14}/></div><div className="topbar-right"><span className="device-label"><span className="green-dot"/>Local workspace</span><span className="avatar">FT</span></div></header>
      <main>
        <OfflineStatus/>
        {error&&<div className="alert error" role="alert"><span>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss error"><X size={17}/></button></div>}
        {notice&&<div className="alert success" role="status"><CheckCircle2 size={18}/><span>{notice}</span></div>}
        {loading?<div className="empty-state">Opening local workspace…</div>:!project?<section className="welcome"><div className="eyebrow">YOUR FIELD WORK, CONNECTED</div><h1>Every observation.<br/>In its right place.</h1><p>Capture location evidence, follow actions through to closure, and turn your field work into a useful project record.</p><div className="welcome-actions"><button className="button primary" disabled={busy} onClick={()=>void tryDemo()}><Compass size={18}/>Explore demonstration<ArrowRight size={17}/></button><button className="button" onClick={()=>setModal('project')}><Plus size={18}/>Create a project</button></div><div className="welcome-import"><button onClick={()=>fileInput.current?.click()}>Import SDR setup / configuration</button><span>or</span><button onClick={()=>restoreInput.current?.click()}>Restore a backup</button></div><div className="welcome-grid"><article><MapPin/><h3>Locate with context</h3><p>Connect observations to your alignment and chainage.</p></article><article><ClipboardList/><h3>Follow every action</h3><p>Keep the observation, response and verification together.</p></article><article><FileText/><h3>Leave with evidence</h3><p>Produce a register or printable report from your records.</p></article></div><div className="privacy-note"><ShieldCheck size={18}/>Project files are processed locally. The demonstration uses invented data.</div></section>:<>
          {project.demonstration&&<div className="demo-strip"><span className="demo-pill">DEMO PROJECT</span>Invented records and alignment for exploring FieldTrace.<button onClick={()=>setModal('project')}>Create your project<ArrowUpRight size={14}/></button></div>}
          <div className="page-heading"><div><div className="eyebrow">{project.route || 'PROJECT WORKSPACE'}</div><h1>{tab==='Overview'?'Your field overview':tab}</h1><p>{tab==='Overview'?'A clear view of what needs attention, and where.':tab==='Project map'?'Explore your alignment and locate field evidence.':tab==='Observations'?'From the first observation to verified closure.':tab==='Reports'?'Turn field records into evidence you can use.':'Manage your project locally and keep a recovery copy.'}</p></div><button className="button primary" onClick={()=>setModal('new')}><Plus size={18}/>New observation</button></div>
          {(tab==='Overview'||tab==='Observations')&&<div className="stats-grid">{[{label:'Open observations',value:open,icon:ClipboardList,detail:'Requiring follow-through',filter:'All statuses'},{label:'Awaiting verification',value:awaiting,icon:ShieldCheck,detail:'Action has been recorded',filter:'Action taken'},{label:'Overdue actions',value:overdue,icon:Clock3,detail:'Review the target dates',filter:'Overdue'},{label:'Closed observations',value:closed,icon:CheckCircle2,detail:'Verification recorded',filter:'Closed'}].map(s=><button className={`stat-card ${s.filter==='Overdue'?'warm':''}`} key={s.label} onClick={()=>{setFilter(s.filter);setTab('Observations');}}><div><span>{s.label}</span><s.icon size={18}/></div><strong>{s.value.toString().padStart(2,'0')}</strong><small>{s.detail}<ArrowUpRight size={14}/></small></button>)}</div>}
          {(tab==='Overview'||tab==='Project map')&&<section className="panel map-panel"><div className="panel-heading"><div><h2>Project corridor</h2><p>CH {ch(projectRange(project).from)} – {ch(projectRange(project).to)} <span className="sep">/</span> {records.length} observations</p></div><form className="map-search" onSubmit={e=>{e.preventDefault();try{const n=parseCh(mapSearch);if(n<projectRange(project).from||n>projectRange(project).to)throw Error('Chainage is outside this project.');if(!canMap(project,n))throw Error('No centreline coordinates cover this chainage. It remains available for observations and reports.');setFind(n);}catch(e){setError(message(e));}}}><Search size={15}/><input aria-label="Find chainage" value={mapSearch} onChange={e=>setMapSearch(e.target.value)} placeholder="Find chainage, e.g. 1+250"/><button aria-label="Find chainage"><ArrowRight size={16}/></button></form></div><div className={`map-wrap ${tab==='Project map'?'large':''}`}><MapView project={project} observations={records} onSelect={selectRecord} find={find}/><div className="map-label"><Layers size={15}/>Alignment view<span>No external basemap</span></div><div className="map-legend"><span><i className="legend-dot orange"/>High priority</span><span><i className="legend-dot amber"/>Other open</span><span><i className="legend-dot green"/>Closed</span></div></div><div className="map-footer"><span><ShieldCheck size={14}/>Only locally imported geometry is shown.</span><span>Chainage positions are indicative.</span></div></section>}
          {(tab==='Overview'||tab==='Observations')&&<section className="panel observations-panel"><div className="panel-heading"><div><h2>{tab==='Overview'?'Latest field observations':'Observation register'}</h2><p>{tab==='Overview'?'Keep the next action in sight.':`${visible.length} records match your filters.`}</p></div>{tab==='Overview'?<button className="text-button" onClick={()=>{setTab('Observations');setFilter('All statuses');setQuery('');}}>View all observations<ArrowRight size={16}/></button>:<button className="button small" onClick={()=>csv(visible)}><ArrowDownToLine size={15}/>Export register</button>}</div>{tab==='Observations'&&<div className="table-tools"><label className="search-field"><Search size={17}/><input placeholder="Search title, reference or chainage" aria-label="Search observations" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filter observations" value={filter} onChange={e=>setFilter(e.target.value)}>{['All statuses',...statuses,'Overdue'].map(s=><option key={s}>{s}</option>)}</select><button className="button small" onClick={()=>{setSelected(null);preparePrint();}}><FileText size={15}/>Print report</button></div>}<div className="table-scroll"><table><thead><tr><th>Observation</th><th>Location</th><th>Priority</th><th>Status</th><th>Responsible party</th><th/></tr></thead><tbody>{(tab==='Overview'?[...records].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,5):visible).map(o=><tr key={o.id}><td><button className="record-title" onClick={()=>selectRecord(o)}>{o.title}</button><span className="record-sub">{o.ref} <span>·</span> {o.category}</span></td><td><span className="location-cell"><MapPin size={14}/>CH {ch(o.chainage)}</span><span className="record-sub">{o.side}</span></td><td><span className={`priority ${slug(o.priority)}`}><i/>{o.priority}</span></td><td><Badge status={o.status}/></td><td>{o.assignee||'Unassigned'}<span className={`record-sub ${isOverdue(o)?'overdue-text':''}`}>{o.due?`${isOverdue(o)?'Overdue · ':'Due '}${date(o.due)}`:'No target date'}</span></td><td><button className="icon-button" aria-label={`Open ${o.ref}`} onClick={()=>selectRecord(o)}><ArrowUpRight size={17}/></button></td></tr>)}</tbody></table>{records.length===0&&<div className="empty-state">Create your first observation to begin the location history.</div>}{tab==='Observations'&&records.length>0&&visible.length===0&&<div className="empty-state">No observations match. Adjust your search or status filter.</div>}</div></section>}
          {tab==='Overview'&&<div className="overview-bottom"><div><span className="small-icon"><Check size={18}/></span><div><h3>Capture once. Keep the whole story.</h3><p>Every update becomes part of your location evidence.</p></div></div><button className="text-button" onClick={()=>setTab('Reports')}>Prepare a report<ArrowRight size={16}/></button></div>}
          {tab==='Reports'&&<><div className="report-grid"><article className="panel report-tile"><div className="report-icon"><FileText size={25}/></div><span className="eyebrow">FIELD EVIDENCE</span><h2>Observation report</h2><p>A printable register with descriptions, location, photographs and follow-up history. Use your browser’s Save as PDF option.</p><button className="button primary" onClick={()=>{setSelected(null);preparePrint();}} disabled={!records.length}><FileText size={17}/>Preview & print</button></article><article className="panel report-tile"><div className="report-icon"><ClipboardList size={25}/></div><span className="eyebrow">MEETING READY</span><h2>Action register</h2><p>Export your observations to a spreadsheet with chainage, priority, status, responsible party and target date.</p><button className="button" disabled={!records.length} onClick={()=>csv(records)}><ArrowDownToLine size={17}/>Download CSV</button></article><article className="panel report-tile"><div className="report-icon"><Database size={25}/></div><span className="eyebrow">RECOVERY COPY</span><h2>Complete project backup</h2><p>Save configuration, observations, original and follow-up photographs, history and unfinished drafts in one private JSON file.</p><button className="button" onClick={()=>void exportBackup()}><ArrowDownToLine size={17}/>Download backup</button></article></div><div className="integration-note"><span className="demo-pill">AVAILABLE · PHASE 3B</span><h3>SiteBoard integration</h3><button className="button primary" disabled={!project.shared} onClick={()=>setModal('exchange')}><ArrowDownToLine size={16}/>Export cases to SiteBoard</button><p>Export submitted cases and their event evidence to SiteBoard. Recovery backups remain separate. Open a case to import SDR references exported by SiteBoard.</p></div></>}
          {tab==='Project data'&&<div className="data-grid"><StorageHealth/><SharedSetupPanel project={project}/><section className="panel settings-panel"><h2>Project configuration</h2><dl><dt>Project</dt><dd>{project.name}</dd><dt>Local workspace ID</dt><dd>{project.id}</dd><dt>Alignment range</dt><dd>CH {ch(projectRange(project).from)} – {ch(projectRange(project).to)}</dd><dt>Alignment points</dt><dd>{project.alignment.length}</dd><dt>Observations</dt><dd>{records.length}</dd><dt>Attached photographs</dt><dd>{records.reduce((n,o)=>n+photoCount(o),0)}</dd></dl><button className="button" onClick={()=>download('project-configuration.json',JSON.stringify(project,null,2))}><ArrowDownToLine size={17}/>Export configuration</button></section><section className="panel settings-panel"><h2>Field pilot & recovery</h2><p><a className="button" href="./pilot.html" target="_blank" rel="noopener">Open Android & iPhone pilot worksheet</a></p><p>Record device checks and measured task times. Download pilot results separately from project backups.</p><p>Project data stays in this browser. Download a backup after field work and before changing devices or browsers.</p><div className="stack-buttons"><button className="button" onClick={()=>download('synthetic-sdr-setup.json',JSON.stringify(syntheticSetup,null,2))}><ArrowDownToLine size={17}/>Download synthetic SDR setup</button><button className="button primary" onClick={()=>void exportBackup()}><ArrowDownToLine size={17}/>Back up this project</button><button className="button" onClick={()=>restoreInput.current?.click()}><Upload size={17}/>Restore as a separate copy</button><button className="button" onClick={()=>fileInput.current?.click()}><FolderOpen size={17}/>Import SDR setup / configuration</button><button className="button" onClick={()=>setModal('project')}><Plus size={17}/>Create a new project</button></div></section><section className="panel settings-panel privacy-panel"><ShieldCheck size={25}/><h2>Private by design</h2><p>This foundation has no project upload endpoint, analytics or remote map tiles. Imported files and attachments are stored in this browser.</p><p>Backups and exported reports contain project information. Keep them in your private project folder, outside the source repository.</p><p className="muted">The production build supports offline reopening after a successful first online load. Enforceable user permissions and live collaboration are planned. A recorded name is not an authenticated signature.</p></section></div>}
        </>}
        <footer className="page-footer"><span>FIELDTRACE <span className="sep">/</span> Part of the SiteBoard ecosystem</span><span>Field pilot candidate · {new Date().getFullYear()}</span></footer>
      </main>
    </div>
    {modal==='exchange'&&project&&<CaseExportDialog project={project} records={records} onClose={()=>setModal(null)}/>}
    {setupPreview&&<SetupImportDialog preview={setupPreview} projects={projects} onClose={()=>setSetupPreview(null)} onApply={importReviewedSetup}/>}
    {modal==='new'&&project&&<CaptureForm key={project.id} project={project} busy={busy} error={error} onClose={()=>{setModal(null);setError('');}} onSubmit={createObservation}/>}
    {modal==='project'&&<ProjectForm busy={busy} error={error} onClose={()=>setModal(null)} onImport={()=>{setModal(null);fileInput.current?.click();}} onCreate={async p=>{setBusy(true);setError('');try{await saveProject(p);setProjects(await loadProjects());await activate(p);setModal(null);}catch(e){setError(message(e));}finally{setBusy(false);}}}/>}
    {selected&&!print&&<CaseDrawer key={selected.id+selected.updatedAt} record={selected} onClose={()=>setSelected(null)} onPrint={()=>preparePrint(selected)} onSaved={async o=>{setRecords(await loadObservations(o.projectId));setSelected(o);setNotice('Update and event photographs saved to the case history.');}}/>}
    {print&&project&&<EvidenceReport project={project} records={selected?[selected]:visible} onClose={()=>setPrint(false)}/>}

  </div>;
}

function ProjectForm({busy,error,onClose,onImport,onCreate}:{busy:boolean;error:string;onClose:()=>void;onImport:()=>void;onCreate:(p:Project)=>Promise<void>}){
  const [problem,setProblem]=useState('');
  return <Dialog labelledBy="project-heading" onClose={onClose}><div className="modal-heading"><div><span className="eyebrow">LOCAL PROJECT</span><h2 id="project-heading">Create a project</h2></div><button className="icon-button" onClick={onClose} aria-label="Close project form"><X/></button></div><p className="muted">Start with two alignment control points. Import a full configuration for curved alignments. Use latitude / longitude in WGS84.</p><form onSubmit={e=>{e.preventDefault();setProblem('');try{const f=new FormData(e.currentTarget);const p=projectSchema.parse({id:crypto.randomUUID(),name:String(f.get('name')).trim(),route:String(f.get('route')).trim(),demonstration:false,alignment:[{lat:Number(f.get('startLat')),lon:Number(f.get('startLon')),chainage:parseCh(String(f.get('startCh')))},{lat:Number(f.get('endLat')),lon:Number(f.get('endLon')),chainage:parseCh(String(f.get('endCh')))}]});if(p.alignment[0].lat===p.alignment[1].lat&&p.alignment[0].lon===p.alignment[1].lon)throw Error('Control points must be in different locations.');void onCreate(p);}catch(e){setProblem(e instanceof Error?e.message:'Check your project details.');}}}><label>Project name<input autoFocus required maxLength={160} name="name" placeholder="Your project name"/></label><label>Route / section<input name="route" maxLength={100} placeholder="Route name and section"/></label>{['start','end'].map(k=><fieldset key={k}><legend>{k==='start'?'Start':'End'} control point</legend><div className="form-grid three"><label>Chainage<input required name={`${k}Ch`} placeholder={k==='start'?'0+000':'5+000'}/></label><label>Latitude<input required name={`${k}Lat`} type="number" step="any" min="-90" max="90"/></label><label>Longitude<input required name={`${k}Lon`} type="number" step="any" min="-180" max="180"/></label></div></fieldset>)}{(problem||error)&&<p role="alert" className="overdue-text">{problem||error}</p>}<p><button className="text-button" type="button" onClick={onImport}>Import an existing project configuration instead<ArrowRight size={15}/></button></p><div className="modal-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}><Plus size={17}/>Create locally</button></div></form></Dialog>;
}
