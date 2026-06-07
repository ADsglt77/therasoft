import { describe, it, expect } from 'vitest';
import {
  toMinutes,
  fromMinutes,
  timeStrToDate,
  timeDateToMinutes,
  isoWeekdayUtc,
  utcDateKey,
  haversineKm,
  modaliteLabel,
} from './rdv.utils';

describe('rdv.utils — temps', () => {
  it('toMinutes / fromMinutes sont réciproques', () => {
    expect(toMinutes('08:30')).toBe(510);
    expect(fromMinutes(510)).toBe('08:30');
    expect(fromMinutes(toMinutes('00:00'))).toBe('00:00');
    expect(fromMinutes(toMinutes('23:45'))).toBe('23:45');
  });

  it('timeStrToDate ↔ timeDateToMinutes (UTC)', () => {
    const d = timeStrToDate('14:15');
    expect(d.getUTCHours()).toBe(14);
    expect(d.getUTCMinutes()).toBe(15);
    expect(timeDateToMinutes(d)).toBe(toMinutes('14:15'));
  });
});

describe('rdv.utils — dates UTC', () => {
  it('isoWeekdayUtc renvoie 1=lundi … 7=dimanche', () => {
    expect(isoWeekdayUtc(new Date(Date.UTC(2026, 5, 15)))).toBe(1); // lundi 15 juin 2026
    expect(isoWeekdayUtc(new Date(Date.UTC(2026, 5, 14)))).toBe(7); // dimanche
  });

  it('utcDateKey formate en YYYY-MM-DD', () => {
    expect(utcDateKey(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05');
    expect(utcDateKey(new Date(Date.UTC(2026, 11, 31)))).toBe('2026-12-31');
  });
});

describe('rdv.utils — distance', () => {
  it('haversineKm = 0 pour le même point', () => {
    expect(haversineKm(44.84, -0.57, 44.84, -0.57)).toBe(0);
  });

  it('haversineKm ≈ 111 km pour 1° de latitude', () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 0);
  });
});

describe('rdv.utils — modalités', () => {
  it('mappe les libellés connus et retombe sur la valeur brute', () => {
    expect(modaliteLabel('XRAY')).toBe('Radiographie');
    expect(modaliteLabel('MRI')).toBe('IRM');
    expect(modaliteLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});
