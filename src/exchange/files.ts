import { backupSchema, type Draft, type Observation, type Project } from '../domain/model';
import { loadDrafts } from '../storage/database';
export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function backupData(project: Project, observations: Observation[], drafts: Draft[] = []) {
  return backupSchema.parse({ schemaVersion: 'fieldtrace-backup/5', exportedAt: new Date().toISOString(), project, observations, drafts });
}
export async function backup(project: Project, observations: Observation[]) {
  const data = backupData(project, observations, await loadDrafts(project.id));
  const content = JSON.stringify(data, null, 2);
  if (new Blob([content]).size > 100*1024*1024) throw Error('Project exceeds this pilot’s 100 MB backup limit. Keep this browser data and ask the project administrator to plan a larger-data export before clearing storage.');
  download(`${project.id.replace(/[^a-z0-9-]/gi,'_')}.fieldtrace-backup.json`, content);
}
export function csv(observations: Observation[]) {
  const cell = (s: unknown) => { let v = String(s ?? ''); if (/^[=+@\-\t\r]/.test(v)) v = `'${v}`; return `"${v.replaceAll('"','""')}"`; };
  const rows = [['Reference','Title','Category','Priority','Chainage (m)','Side','Status','Responsible party','Due date','Reporter','Location source'], ...observations.map(o => [o.ref,o.title,o.category,o.priority,o.chainage,o.side,o.status,o.assignee,o.due,o.reporter,o.locationSource])];
  download('fieldtrace-observation-register.csv', '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
}
