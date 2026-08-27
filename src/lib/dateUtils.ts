export interface DateRange {
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
}

export function getDateRange(
  period: 'mtd' | '30d' | '90d' | 'custom' = 'mtd',
  customStart?: string,
  customEnd?: string
): DateRange {
  // Get current time in Jakarta timezone (UTC+7)
  const now = new Date();
  const jakartaOffset = 7 * 60 * 60 * 1000; // UTC+7
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const jakartaTime = new Date(utcTime + jakartaOffset);

  const today = new Date(jakartaTime);
  today.setHours(0, 0, 0, 0);

  let startDate = new Date(today);
  let endDate = new Date(today);

  if (period === 'mtd') {
    // Start from the 1st of current month
    const year = today.getFullYear();
    const month = today.getMonth();
    startDate = new Date(year, month, 1);
    startDate.setHours(0, 0, 0, 0);

    // End at yesterday (h-1 means previous hour, so just use yesterday)
    endDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  } else if (period === '30d') {
    startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    endDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  } else if (period === '90d') {
    startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    endDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  } else if (period === 'custom' && customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
  }

  const periodLength = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const prevEndDate = new Date(startDate.getTime() - 1000 * 60 * 60 * 24);
  const prevStartDate = new Date(
    prevEndDate.getTime() - periodLength * 24 * 60 * 60 * 1000
  );

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    prevStartDate: formatDate(prevStartDate),
    prevEndDate: formatDate(prevEndDate),
  };
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateChange(current: number, previous: number): number {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
