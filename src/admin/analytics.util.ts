import { BadRequestException } from '@nestjs/common';

export function analyticsRange(start?: string, end?: string, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const until = end ?? today;
  const before = new Date(`${until}T00:00:00Z`);
  before.setUTCDate(before.getUTCDate() - 29);
  const from = start ?? (Number.isNaN(before.getTime()) ? '' : before.toISOString().slice(0, 10));
  const valid = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (
    !valid(from) ||
    !valid(until) ||
    from > until ||
    (Date.parse(until) - Date.parse(from)) / 86400000 > 365
  ) {
    throw new BadRequestException('Choose a valid date range of at most 366 days.');
  }
  return { start: from, end: until, timeZone: 'Africa/Cairo' };
}

export const analyticsMoney = {
  bookedValue: { $cond: [{ $ne: ['$status', 'CANCELLED'] }, '$total', 0] },
  completedValue: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, '$total', 0] },
  recordedPaid: {
    $cond: [
      { $and: [{ $ne: ['$status', 'CANCELLED'] }, { $eq: ['$paymentStatus', 'PAID'] }] },
      '$total',
      0,
    ],
  },
  outstanding: {
    $cond: [
      { $and: [{ $ne: ['$status', 'CANCELLED'] }, { $ne: ['$paymentStatus', 'PAID'] }] },
      '$total',
      0,
    ],
  },
  cancelledPaid: {
    $cond: [
      { $and: [{ $eq: ['$status', 'CANCELLED'] }, { $eq: ['$paymentStatus', 'PAID'] }] },
      '$total',
      0,
    ],
  },
};
