/**
 * Unit tests for the booking working-hours util.
 */
import {
  workingStartMinutes,
  workingEndMinutes,
  slotMinutes,
} from '../src/bookings/working-hours.util';

describe('working-hours.util', () => {
  it('starts at 09:00', () => {
    expect(workingStartMinutes()).toBe(540);
  });

  it('ends at 18:00', () => {
    expect(workingEndMinutes()).toBe(1080);
  });

  it('uses 60 minute slots', () => {
    expect(slotMinutes()).toBe(60);
  });
});
