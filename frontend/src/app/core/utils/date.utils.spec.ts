import { describe, it, expect } from 'vitest';
import { formatDateKey, formatTime } from './date.utils';

describe('formatDateKey', () => {
  it('formate une clé YYYY-MM-DD (mois indexé à 0)', () => {
    expect(formatDateKey(2026, 0, 5)).toBe('2026-01-05');
    expect(formatDateKey(2026, 11, 25)).toBe('2026-12-25');
  });
});

describe('formatTime', () => {
  it('formate une chaîne HH:mm(:ss) en HHhmm', () => {
    expect(formatTime('09:30:00')).toBe('09h30');
    expect(formatTime('14:05')).toBe('14h05');
  });

  it('formate un objet Date', () => {
    expect(formatTime(new Date(2026, 0, 1, 8, 5))).toBe('08h05');
  });

  it('retourne 00h00 pour une entrée invalide', () => {
    expect(formatTime('pas-une-heure')).toBe('00h00');
  });
});
