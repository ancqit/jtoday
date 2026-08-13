export function formatShopTime(hhmm: string): string {
  const [hourPart, minutePart] = hhmm.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return hhmm;
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatShopHours(openTime: string, closedTime: string): string {
  return `${formatShopTime(openTime)} – ${formatShopTime(closedTime)}`;
}
