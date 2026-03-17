export type WeekSummary = {
    id: string;
    weekNumber: number;
    startDate: string;   // 'Mar 10'
    endDate: string;     // 'Mar 16'
    startISO: string; 
    daysLogged: number;
    avgPerDay: number;
    totalCal: number;
  };
  
  export type DaySummary = {
    id: string;
    date: string;        // 'Mar 10'
    fullDate: string;    // ISO for navigation
    dayLabel: string;    // 'Mon'
    mealsLogged: number;
    totalCal: number;
  };