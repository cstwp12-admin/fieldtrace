import type { Observation, Project } from './model';

export const demoProject: Project = {
  id: 'DEMO-CORRIDOR', name: 'Northlink Demonstration', route: 'Section A · Training corridor', demonstration: true,
  alignment: [
    { lat: 4.000, lon: 112.000, chainage: 0 },
    { lat: 4.007, lon: 112.004, chainage: 1000 },
    { lat: 4.012, lon: 112.012, chainage: 2000 },
    { lat: 4.020, lon: 112.014, chainage: 3000 },
    { lat: 4.025, lon: 112.023, chainage: 4000 },
    { lat: 4.031, lon: 112.028, chainage: 5000 }
  ]
};
const seeds = [
  ['Drain outlet obstructed', 'Drainage', 'High', 1250, 'Reported', 'Drainage team', 'Clear the outlet and provide photographs before the next review.'],
  ['Sediment control requires attention', 'Environment', 'Medium', 2480, 'Action taken', 'Earthworks team', 'Review the temporary sediment barrier after rainfall.'],
  ['Concrete finish at headwall', 'Quality', 'Medium', 3300, 'Monitoring', 'Structures team', 'Monitor the repaired finish during the next visit.'],
  ['Temporary barrier reinstated', 'Safety', 'High', 4120, 'Closed', 'Traffic team', 'Barrier reinstatement has been reviewed.'],
  ['Exposed drain crossing', 'Safety', 'High', 720, 'Reported', 'Site team', 'Provide protection and a clear pedestrian route.']
] as const;
export function demoObservations(): Observation[] {
  const now = new Date();
  return seeds.map((s, i) => {
    const at = new Date(now.getTime() - (i + 1) * 86400000).toISOString();
    const dueDate = new Date(now.getTime() + (i - 1) * 86400000);
    const due = `${dueDate.getFullYear()}-${String(dueDate.getMonth()+1).padStart(2,'0')}-${String(dueDate.getDate()).padStart(2,'0')}`;
    const history: Observation['history'] = [{ at, by: 'Demo inspector', status: 'Reported', note: 'Synthetic training record. No actual project information.' }];
    if (s[4] !== 'Reported') history.push({ at, by: 'Demo engineer', status: s[4], note: 'Illustrative follow-up for the demonstration.' });
    return { id: crypto.randomUUID(), projectId: demoProject.id, ref: `DEMO-OBS-${String(i+1).padStart(4,'0')}`, title: s[0], category: s[1], priority: s[2], chainage: s[3], side: i % 2 ? 'LHS' : 'RHS', status: s[4], assignee: s[5], description: s[6], due, lat: null, lon: null, accuracyM: null, locationSource: 'Chainage', createdAt: at, updatedAt: at, reporter: 'Demo inspector', photos: [], history };
  });
}
