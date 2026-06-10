import { describe, expect, it } from 'vitest';
import { getPlanningQuerySchema } from './planning.schemas';

describe('getPlanningQuerySchema', () => {
  it('refuse une plage inversee', () => {
    expect(() =>
      getPlanningQuerySchema.parse({
        startDate: '2026-06-20',
        endDate: '2026-06-10',
      })
    ).toThrow();
  });

  it('refuse une date impossible', () => {
    expect(() => getPlanningQuerySchema.parse({ startDate: '2026-02-31' })).toThrow();
  });
});
