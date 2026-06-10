import { describe, it, expect } from 'vitest';
import { buildMonthGrid } from './calendar-grid.utils';

describe('buildMonthGrid', () => {
  const today = new Date(2026, 0, 15); // 15 janvier 2026

  it('produit une grille minimale de 5×7 = 35 cellules', () => {
    expect(buildMonthGrid(2026, 0, today)).toHaveLength(35);
  });

  it('produit 6 semaines lorsque le mois ne tient pas sur 35 cellules', () => {
    expect(buildMonthGrid(2026, 7, today)).toHaveLength(42);
  });

  it('contient les 31 jours de janvier marqués inCurrentMonth', () => {
    const inMonth = buildMonthGrid(2026, 0, today).filter((c) => c.inCurrentMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].dateKey).toBe('2026-01-01');
    expect(inMonth[30].dateKey).toBe('2026-01-31');
  });

  it('place le débordement du mois précédent (1er janvier 2026 = jeudi → 3 jours avant)', () => {
    const cells = buildMonthGrid(2026, 0, today);
    expect(cells[0].inCurrentMonth).toBe(false);
    expect(cells[3].inCurrentMonth).toBe(true);
    expect(cells[3].dayNumber).toBe(1);
  });

  it('repère le jour courant via le paramètre today', () => {
    const cell = buildMonthGrid(2026, 0, today).find((c) => c.isToday);
    expect(cell?.dateKey).toBe('2026-01-15');
  });
});
