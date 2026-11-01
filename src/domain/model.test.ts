import { describe, expect, it } from 'vitest';
import { backupSchema, ch, parseCh, projectSchema, transition } from './model';
import { demoObservations, demoProject } from './demo';
import { positionAt, projectPosition } from '../geo/alignment';

describe('project and recovery contract',()=>{
  it('accepts demonstration backup with its complete record history',()=>{
    const b={schemaVersion:'fieldtrace-backup/1',exportedAt:new Date().toISOString(),project:demoProject,observations:demoObservations()};
    expect(backupSchema.safeParse(b).success).toBe(true);
    b.observations[0].projectId='another-project';
    expect(backupSchema.safeParse(b).success).toBe(false);
  });
  it('rejects duplicate records and inconsistent status',()=>{
    const o=demoObservations()[0];
    expect(backupSchema.safeParse({schemaVersion:'fieldtrace-backup/1',exportedAt:new Date().toISOString(),project:demoProject,observations:[o,o]}).success).toBe(false);
    expect(backupSchema.safeParse({schemaVersion:'fieldtrace-backup/1',exportedAt:new Date().toISOString(),project:demoProject,observations:[{...o,status:'Closed'}]}).success).toBe(false);
  });
  it('requires increasing chainage',()=>{
    expect(projectSchema.safeParse({...demoProject,alignment:[demoProject.alignment[1],demoProject.alignment[0]]}).success).toBe(false);
  });
});
describe('chainage and follow-up',()=>{
  it('parses road notation and rejects incomplete input',()=>{
    expect(parseCh('12+045')).toBe(12045);expect(ch(12045)).toBe('12+045');expect(ch(1999.8)).toBe('2+000');
    expect(()=>parseCh('')).toThrow();expect(()=>parseCh('1+2345')).toThrow();
  });
  it('requires action before closure and preserves the complete history',()=>{
    const o=demoObservations()[0];expect(()=>transition(o,'Closed','Checked','Engineer')).toThrow();
    const action=transition(o,'Action taken','Outlet cleared','Contractor');
    const closed=transition(action,'Closed','Inspected on site and verified','Engineer');
    expect(closed.history).toHaveLength(3);expect(closed.history[0]).toEqual(o.history[0]);
    expect(()=>transition(action,'Closed','','Engineer')).toThrow();
  });
  it('projects a point on an alignment segment to its chainage',()=>{
    const ll=positionAt(demoProject,1500), p=projectPosition(demoProject,...ll);
    expect(p.chainage).toBeCloseTo(1500,0);expect(p.distanceM).toBeLessThan(1);
  });
});
