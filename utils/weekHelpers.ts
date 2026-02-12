
import { getDaysDifference, formatLocalDate } from './timezone';

export interface WeekInfo {
  isPartialWeek: boolean;
  totalDaysInPeriod: number;
  daysTracked: number; // Days user has actually been tracking
  daysRemaining: number;
  startDate: Date;
  endDate: Date;
  userStartDate: Date; // When user actually started tracking this period
}

/**
 * Analyze the current weekly period to determine if it's partial
 * and calculate the actual tracking days
 */
export function analyzeWeekPeriod(
  weekStartDate: string, // Period start (always Monday) in YYYY-MM-DD
  weekEndDate: string,   // Period end (always Sunday) in YYYY-MM-DD
  periodCreatedAt: string // ISO timestamp when period was created
): WeekInfo {
  const periodStart = new Date(weekStartDate + 'T00:00:00');
  const periodEnd = new Date(weekEndDate + 'T00:00:00');
  const createdDate = new Date(periodCreatedAt);
  
  // User's actual start date is the later of period start or creation date
  const createdLocalDate = formatLocalDate(createdDate);
  const userStartDate = createdLocalDate > weekStartDate 
    ? new Date(createdLocalDate + 'T00:00:00')
    : periodStart;
  
  // Total days in the calendar period (always 7 for Mon-Sun)
  const totalDaysInPeriod = 7;
  
  // Days user is actually tracking (from start to end)
  const daysTracked = getDaysDifference(
    formatLocalDate(userStartDate),
    weekEndDate
  ) + 1;
  
  // Remaining days from today
  const today = new Date();
  const todayStr = formatLocalDate(today);
  const daysRemaining = Math.max(0, getDaysDifference(todayStr, weekEndDate) + 1);
  
  // It's partial if user didn't start on the Monday
  const isPartialWeek = daysTracked < 7;
  
  return {
    isPartialWeek,
    totalDaysInPeriod,
    daysTracked,
    daysRemaining,
    startDate: periodStart,
    endDate: periodEnd,
    userStartDate,
  };
}
