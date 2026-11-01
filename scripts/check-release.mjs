import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Publish the generated dist folder only. Never copy a project workspace into it.
const allowed = new Set(['.html','.js','.css','.svg','.png','.woff','.woff2','.ico','.webmanifest']);
async function walk(dir) {
  for (const f of await readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,f.name);
    if(f.isDirectory()) { if(f.name!=='assets')throw Error(`Unexpected release directory: ${file}`); await walk(file); }
    else {
      if(!allowed.has(path.extname(file)))throw Error(`Unexpected release file: ${file}`);
      if(/\.(js|html|css)$/.test(file)) {
        const text=await readFile(file,'utf8');
        if(/WP12|Pan Borneo|Sarang|Temuno|fieldtrace-backup\/1[\s\S]{0,50}exportedAt":/.test(text))throw Error(`Review possible project content: ${file}`);
      }
    }
  }
}
await walk('dist');
console.log('Release boundary passed: static application assets only. Review generated files before publishing.');
