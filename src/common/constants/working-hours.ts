export interface WorkingHoursConfig {
  start: string;
  end: string;
  slotMinutes: number;
  timezone: string;
}

export const WORKING_HOURS: WorkingHoursConfig = {
  start: '09:00',
  end: '18:00',
  slotMinutes: 60,
  timezone: 'local',
};

export function workingStartMinutes(): number {
  const [h, m] = WORKING_HOURS.start.split(':').map(Number);
  return h * 60 + m;
}

export function workingEndMinutes(): number {
  const [h, m] = WORKING_HOURS.end.split(':').map(Number);
  return h * 60 + m;
}

export const DEFAULT_CURRENCY = 'USD';
