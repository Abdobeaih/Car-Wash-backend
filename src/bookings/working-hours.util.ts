export function slotMinutes(): number {
  return 60;
}

export function workingStartMinutes(): number {
  return 9 * 60;
}

export function workingEndMinutes(): number {
  return 18 * 60;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function toHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
