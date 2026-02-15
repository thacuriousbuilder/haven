
export interface WeeklyBudgetSummary {
    total: number;
    used: number;
    reserved: number;
    available: number;
    progressPercentage: number; // 0-100
  }
  
  export interface PlannedCheatDay {
    id: string;
    date: string; // ISO date format
    dayName: string; // e.g., "Saturday"
    caloriesBudget: number;
    isCompleted: boolean;
    createdAt: string;
  }
  
  export interface WeekRange {
    startDate: string; // ISO date
    endDate: string; // ISO date
    displayText: string; // e.g., "Jan 12 - 18"
  }