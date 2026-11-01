import { canMap, type Project } from '../domain/model';

export function positionAt(project: Project, chainage: number): [number, number] {
  if(!canMap(project,chainage))throw Error('No centreline coordinates cover this chainage. It can be recorded without geographic placement.');
  const a = project.alignment;
  const index = a.findIndex((p, i) => i > 0 && chainage <= p.chainage);
  const n = index < 0 ? a.length - 1 : index;
  const first = a[Math.max(0, n - 1)], last = a[n];
  const t = Math.max(0, Math.min(1, (chainage - first.chainage) / (last.chainage - first.chainage)));
  return [first.lat + t * (last.lat - first.lat), first.lon + t * (last.lon - first.lon)];
}

// Local tangent-plane approximation, suitable for corridor visualization, not survey measurements.
export function projectPosition(project: Project, lat: number, lon: number) {
  let best = { chainage: 0, distanceM: Infinity, offsetM: 0 };
  const scaleY = 111195, scaleX = scaleY * Math.cos(lat * Math.PI / 180);
  for (let i = 1; i < project.alignment.length; i++) {
    const a = project.alignment[i - 1], b = project.alignment[i];
    const dx = (b.lon - a.lon) * scaleX, dy = (b.lat - a.lat) * scaleY;
    const px = (lon - a.lon) * scaleX, py = (lat - a.lat) * scaleY;
    const len2 = dx * dx + dy * dy;
    if (!len2) continue;
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
    const distanceM = Math.hypot(px - t * dx, py - t * dy);
    if (distanceM < best.distanceM) best = {
      chainage: a.chainage + t * (b.chainage - a.chainage), distanceM,
      offsetM: (dx * py - dy * px) / Math.sqrt(len2)
    };
  }
  if (!Number.isFinite(best.distanceM)) throw Error('Alignment has no usable segments.');
  return best;
}
