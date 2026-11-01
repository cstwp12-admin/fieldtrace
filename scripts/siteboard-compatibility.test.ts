import { expect, it } from 'vitest';
import { previewSetup } from '../src/exchange/setup';
import { syntheticSetup } from '../src/exchange/synthetic-setup';
import { locationContext } from '../src/domain/model';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Read existing SiteBoard code only in tests. Never import its packaged project
// defaults into FieldTrace application modules or copy them into the release.
const structuresUrl=new URL('../../07_SiteBoard/app/js/structures.js',import.meta.url);
const projectUrl=new URL('../../07_SiteBoard/app/js/project.js',import.meta.url);

it.skipIf(!existsSync(structuresUrl))('agrees with the existing SiteBoard importer on the same synthetic SDR setup',async()=>{
  const {importSetup}=await import(/* @vite-ignore */ fileURLToPath(structuresUrl).replaceAll('\\','/'));
  const {setProjectConfig,zoneOf}=await import(/* @vite-ignore */ fileURLToPath(projectUrl).replaceAll('\\','/'));
  const raw=structuredClone(syntheticSetup),board=importSetup(raw),field=(await previewSetup(raw)).project;
  expect(field.shared?.projectCode).toBe(board.projectCode);
  expect(field.shared?.structures).toEqual(board.structures);
  expect(field.alignment.map(p=>[p.lon,p.lat,p.chainage])).toEqual(board.centreline);
  expect(field.shared?.zones.map(z=>[z.name,z.from,z.to])).toEqual(board.zones.map(z=>[z.name,z.from,z.to]));
  setProjectConfig(board);
  try{expect(locationContext(field,11500).zone?.name).toBe(zoneOf(11500));}finally{setProjectConfig(null);}
});
