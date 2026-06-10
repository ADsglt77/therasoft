import { describe, it, expect } from 'vitest';
import {
  appointmentDateTimeKey,
  formatDateKey,
  formatTime,
  parseDateKey,
  parisDateTimeKey,
} from './date.utils';

describe('formatDateKey', () => {
  it('formate une clé YYYY-MM-DD (mois indexé à 0)', () => {
    expect(formatDateKey(2026, 0, 5)).toBe('2026-01-05');
    expect(formatDateKey(2026, 11, 25)).toBe('2026-12-25');
  });
});

describe('parseDateKey', () => {
  it('rejette les dates impossibles au lieu de les normaliser', () => {
    expect(parseDateKey('2026-02-31')).toBeNull();
    expect(parseDateKey('2026-02-28')).toEqual(new Date(2026, 1, 28));
  });
});

describe('formatTime', () => {
  it('formate une chaîne HH:mm(:ss) en HHhmm', () => {
    expect(formatTime('09:30:00')).toBe('09h30');
    expect(formatTime('14:05')).toBe('14h05');
  });

  it('formate un objet Date', () => {
    expect(formatTime(new Date(Date.UTC(2026, 0, 1, 8, 5)))).toBe('08h05');
  });

  it("n'applique pas le fuseau du navigateur aux heures SQL", () => {
    expect(formatTime('1970-01-01T08:30:00.000Z')).toBe('08h30');
  });

  it('retourne 00h00 pour une entrée invalide', () => {
    expect(formatTime('pas-une-heure')).toBe('00h00');
  });
});

describe('appointmentDateTimeKey', () => {
  it('combine une date SQL et une heure SQL sans décalage', () => {
    expect(
      appointmentDateTimeKey(
        '2026-06-10T00:00:00.000Z',
        '1970-01-01T08:30:00.000Z'
      )
    ).toBe('2026-06-10T08:30');
  });

  it('produit une clé parisienne comparable', () => {
    expect(parisDateTimeKey(new Date('2026-06-10T06:30:00.000Z'))).toBe(
      '2026-06-10T08:30'
    );
  });
});
