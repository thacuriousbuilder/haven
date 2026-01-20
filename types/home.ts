

/**
 * Macro nutrition data in grams
 * Maps to: protein_grams, carbs_grams, fat_grams in food_logs table
 */
export interface MacroData {
    protein: number;  // maps to protein_grams
    carbs: number;    // maps to carbs_grams
    fat: number;      // maps to fat_grams
  }
  
  /**
   * Daily summary for a single day
   * Maps to: daily_summaries table
   */
  export interface DailySummary {
    date: string;              // maps to summary_date (YYYY-MM-DD)
    calories: number;          // maps to calories_consumed
    caloriesBurned?: number;   // maps to calories_burned
    netCalories?: number;      // maps to net_calories
    isLogged: boolean;         // derived from existence of food_logs
    macros?: MacroData;        // aggregated from food_logs
  }
  
  /**
   * Baseline week progress tracking
   * Derived from profiles.baseline_start_date and daily_summaries count
   */
  export interface BaselineProgress {
    currentDay: number;        // calculated from baseline_start_date to today
    daysLogged: number;        // count of daily_summaries entries
    totalDays: 7;
    isComplete: boolean;       // maps to profiles.baseline_complete
  }
  
  /**
   * Today's calorie and macro stats
   * Aggregated from food_logs for current day
   */
  export interface TodayStats {
    consumed: number;          // sum of food_logs.calories for today
    remaining: number;         // calculated: goal - consumed
    goal: number;              // daily calorie goal (from weekly_budget / 7)
    macros: MacroData;         // sum of protein_grams, carbs_grams, fat_grams
  }
  
  /**
   * Weekly progress analytics
   * Derived from weekly_metrics table
   */
  export interface WeeklyProgress {
    avgCalories: number;       // maps to weekly_periods.baseline_average_daily
    status: 'on_track' | 'needs_attention' | 'over_budget';
    dailyIntake: number[];     // 7 values from daily_summaries (M-S)
    goalCalories: number;      // maps to weekly_periods.baseline_average_daily
  }
  
  /**
   * Single meal log entry
   * Maps to: food_logs table
   */
  export interface MealLogItem {
    id: string;                        // maps to food_logs.id
    name: string;                      // maps to food_logs.food_name
    time: string;                      // formatted from food_logs.created_at
    calories: number;                  // maps to food_logs.calories
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'; // maps to food_logs.meal_type
    loggedAt: string;                  // maps to food_logs.created_at (ISO)
    macros?: MacroData;                // from protein_grams, carbs_grams, fat_grams
  }
  
  /**
   * Quick log action button type
   */
  export type QuickLogAction = 'search' | 'scan' | 'voice' | 'recipe';
  
  /**
   * Meal time period for icon selection
   * Used to determine time-of-day icons in UI
   */
  export type MealTimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';