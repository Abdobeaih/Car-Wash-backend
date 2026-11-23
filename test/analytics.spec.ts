import { analyticsRange } from '../src/admin/analytics.util';
import { BadRequestException } from '@nestjs/common';

describe('Analytics ranges', () => {
  it('uses the Cairo calendar day and 30-day inclusive default', () => {
    expect(analyticsRange(undefined, undefined, new Date('2026-11-22T23:00:00Z'))).toEqual({
      start: '2026-10-25',
      end: '2026-11-23',
      timeZone: 'Africa/Cairo',
    });
  });
  it.each([
    ['2026-02-30', '2026-03-01'],
    ['x', '2026-03-01'],
    ['2026-03-02', '2026-03-01'],
    ['2020-01-01', '2026-01-01'],
    ['2026-01-01', '$ne'],
  ])('rejects %s to %s', (start, end) => {
    expect(() => analyticsRange(start, end)).toThrow(BadRequestException);
  });
  it('allows leap day and equal bounds', () => {
    expect(analyticsRange('2028-02-29', '2028-02-29').start).toBe('2028-02-29');
  });
});
