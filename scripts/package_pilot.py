"""Package only checked static application assets. Never copy project or QA data."""
from pathlib import Path
import hashlib, json, re, zipfile
from datetime import datetime, timezone

root=Path(__file__).resolve().parent.parent
dist=root/'dist'
allowed={'.html','.js','.css','.svg','.png','.woff','.woff2','.ico','.webmanifest'}
files=sorted(p for p in dist.rglob('*') if p.is_file())
if not files or not (dist/'index.html').exists() or not (dist/'pilot.html').exists():
    raise SystemExit('Run the production build first; application and pilot worksheet are required.')
for p in files:
    if p.suffix not in allowed or (p.parent!=dist and p.relative_to(dist).parts[0]!='assets'):
        raise SystemExit('Unexpected release path: '+str(p))
    if p.suffix in {'.html','.js','.css'} and re.search(r'WP12|Pan Borneo|Sarang|Temuno',p.read_text(encoding='utf-8')):
        raise SystemExit('Review possible project information in '+str(p))
version=json.loads((root/'package.json').read_text())['version']
folder=root/'releases';folder.mkdir(exist_ok=True)
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
archive=folder/f'fieldtrace-{version}-pilot-{stamp}.zip'
readme=f'''FieldTrace {version} - Phase 4 pilot candidate

This archive contains public static application assets only.
Publish the unpacked web files through the approved GitHub Pages/HTTPS process.
Keep index.html, assets/, pilot.html, pilot.js, pilot-core.js and sw.js together.
Do not place actual setup, reports, photos, reference packages or backups here.

On each phone open the same HTTPS application address while online first.
Wait for Application available offline before the disconnected trial.
Project data -> Open Android & iPhone pilot worksheet records field findings.
Download pilot results separately from project backups.

Physical Android/iPhone camera, GPS, suspension and field acceptance are pending.
No deployment is performed by this package generator.
'''
with zipfile.ZipFile(archive,'x',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.relative_to(dist).as_posix())
    z.writestr('.nojekyll','')
    z.writestr('PILOT_START_HERE.txt',readme)
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(digest+'  '+archive.name+'\n',encoding='utf-8')
print(json.dumps({'archive':str(archive),'assets':len(files),'bytes':archive.stat().st_size,'sha256':digest}))
