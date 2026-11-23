import { cairoAppointment, periodEnd, PLAN_CATALOG } from '../src/plans/terms';
describe('Plan approved terms and Cairo calendar', () => {
  it('stores the approved prices and inclusions', () => {
    expect(PLAN_CATALOG.monthlyExterior.price).toBe(750);
    expect(PLAN_CATALOG.interiorExterior.price).toBe(1000);
    expect(PLAN_CATALOG.interiorExterior.allowances).toEqual({
      'exterior-car-wash': 4,
      'interior-cleaning': 1,
    });
  });
  it('ends after30 Cairo dates, exclusively at the following midnight', () => {
    const start = new Date('2030-01-01T10:00:00Z');
    const end = periodEnd(start);
    expect(end.toISOString()).toBe('2030-01-30T22:00:00.000Z');
    expect(cairoAppointment('2030-01-30', '17:00').getTime()).toBeLessThan(end.getTime());
  });
  it('uses the local activation day when Cairo is ahead of UTC', () => {
    expect(periodEnd(new Date('2030-01-01T23:30:00Z')).toISOString()).toBe(
      '2030-01-31T22:00:00.000Z',
    );
  });
  it('rejects a nonexistent spring-forward midnight and ends at the first valid moment', () => {
    expect(() => cairoAppointment('2026-04-24', '00:30')).toThrow();
    expect(periodEnd(new Date('2026-03-25T10:00:00Z')).toISOString()).toBe(
      '2026-04-23T22:00:00.000Z',
    );
  });
  it('uses pre-transition offset on the last autumn date', () => {
    expect(cairoAppointment('2026-10-29', '00:00').toISOString()).toBe('2026-10-28T21:00:00.000Z');
  });
});
