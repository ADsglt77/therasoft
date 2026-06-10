import { describe, expect, it } from 'vitest';
import { openingHoursForDay, parseOpeningHours } from './opening-hours';

describe('parseOpeningHours', () => {
  it('accepte uniquement des horaires cohérents', () => {
    expect(
      parseOpeningHours([
        { day: 1, open: '08:00', close: '18:00' },
        { day: 2, open: '18:00', close: '08:00' },
      ])
    ).toEqual([{ day: 1, open: '08:00', close: '18:00' }]);
  });

  it('renvoie le créneau du jour demandé', () => {
    expect(
      openingHoursForDay(
        [
          { day: 1, open: '08:00', close: '18:00' },
          { day: 2, open: '09:00', close: '17:00' },
        ],
        2
      )
    ).toEqual({ day: 2, open: '09:00', close: '17:00' });
  });
});
