import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { canMap, ch, type Observation, type Project } from '../domain/model';
import { positionAt } from '../geo/alignment';

export function MapView({ project, observations, onSelect, find }: { project: Project; observations: Observation[]; onSelect: (o: Observation) => void; find?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!root.current||!canMap(project)) return;
    const m = L.map(root.current, { zoomControl: false, attributionControl: false }); map.current = m;
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    L.polyline(project.alignment.map(p => [p.lat, p.lon] as [number,number]), { color: '#ffffff', weight: 12 }).addTo(m);
    const line = L.polyline(project.alignment.map(p => [p.lat, p.lon] as [number,number]), { color: '#7b998d', weight: 5, dashArray: '8 8' }).addTo(m);
    project.alignment.forEach((p,i) => {
      if(i!==project.alignment.length-1&&i%Math.ceil(project.alignment.length/10)!==0)return;
      const label = document.createElement('span'); label.textContent = `CH ${ch(p.chainage)}`;
      L.circleMarker([p.lat, p.lon], { color: '#446d5c', fillColor: '#fff', fillOpacity: 1, weight: 2, radius: 4 }).bindTooltip(label, { permanent: true, direction: 'right', className: 'chainage-label' }).addTo(m);
    });
    observations.forEach(o => {
      if(o.lat===null&&!canMap(project,o.chainage))return;
      const ll: [number,number] = o.lat != null && o.lon != null ? [o.lat,o.lon] : positionAt(project,o.chainage);
      const color = o.status === 'Closed' ? '#668f79' : o.priority === 'High' ? '#cb6b43' : '#b69b55';
      const dot = L.circleMarker(ll, { radius: 9, color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 }).addTo(m);
      const text = document.createElement('span'); text.textContent = `${o.ref} · ${o.title}`;
      dot.bindTooltip(text); dot.on('click', () => onSelect(o));
    });
    for(const asset of project.shared?.structures??[]){
      if(!canMap(project,asset.ch))continue;
      const label=document.createElement('span');label.textContent=`${asset.id} · ${asset.name} · CH ${ch(asset.ch)} (drawing location)`;
      L.circleMarker(positionAt(project,asset.ch),{radius:5,color:'#365c81',weight:2,fillColor:'#e4edf4',fillOpacity:1}).bindTooltip(label).addTo(m);
    }
    m.fitBounds(line.getBounds(), { padding: [45,45] });
    const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(root.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, [project, observations, onSelect]);
  useEffect(() => {
    if (find !== undefined && map.current && canMap(project,find)) {
      const ll = positionAt(project,find); map.current.setView(ll,16);
      const marker = L.circleMarker(ll,{ radius:16,color:'#153c35',fill:false }).addTo(map.current);
      return () => { marker.remove(); };
    }
  }, [find,project]);
  if(!canMap(project))return <div className="chainage-only-message"><h3>Chainage-only project</h3><p>This setup has no centreline coordinates. You can record observations by chainage and use the imported zones, structures and activities. Import a reviewed setup with a centreline to enable geographic placement.</p></div>;
  return <div ref={root} className="map-canvas" aria-label="Local project alignment and observation map" />;
}
