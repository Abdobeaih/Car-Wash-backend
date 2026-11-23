export const PLAN_TERMS_VERSION = '2026-11-review-v1';
export const PLAN_CATALOG = {
  monthlyExterior: {
    name: 'Monthly Exterior',
    nameAr: 'الخارجية الشهرية',
    price: 750,
    allowances: { 'exterior-car-wash': 4 },
  },
  interiorExterior: {
    name: 'Interior & Exterior',
    nameAr: 'داخلي وخارجي',
    price: 1000,
    allowances: { 'exterior-car-wash': 4, 'interior-cleaning': 1 },
  },
} as const;
export type PlanCode = keyof typeof PLAN_CATALOG;
export function cairoAppointment(date: string, time: string): Date {
  const approximate = new Date(`${date}T${time}:00Z`);
  if (!Number.isFinite(approximate.getTime())) throw new Error('Invalid Cairo appointment');
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  // Check both seasonal offsets against the actual local clock. In particular,
  // offset-at-noon cannot describe midnight on a daylight-saving transition.
  const matches = [120, 180]
    .map((offset) => new Date(approximate.getTime() - offset * 60000))
    .filter((candidate) => {
      const parts = Object.fromEntries(
        formatter.formatToParts(candidate).map((p) => [p.type, p.value]),
      );
      return (
        `${parts.year}-${parts.month}-${parts.day}` === date &&
        `${parts.hour}:${parts.minute}` === time
      );
    });
  if (matches.length !== 1)
    throw new Error('Cairo appointment is missing or ambiguous at daylight-saving transition');
  return matches[0];
}

export function periodEnd(startsAt: Date): Date {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(startsAt);
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 30);
  const finalDate = day.toISOString().slice(0, 10);
  try {
    return cairoAppointment(finalDate, '00:00');
  } catch {
    return cairoAppointment(finalDate, '01:00');
  }
}
