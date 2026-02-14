
// USER PROFILES
export interface UserProfile {
  id: string;
  full_name: string;
  gender: string;
  unit_system: string; // 'imperial' | 'metric'
  height_cm: number;
  height_ft: number;
  height_in: number;
  weight_kg: number;
  weight_lbs: number;
  target_weight_kg: number;
  target_weight_lbs: number;
  goal: string; // 'lose_weight' | 'maintain' | 'gain_weight'
  workouts_per_week: string;
  activity_level: string;
  baseline_start_date: string; // ISO date
  baseline_complete: boolean;
  baseline_avg_daily_calories: number;
  weekly_calorie_bank: number;
  created_at: string;
  updated_at: string;
  birth_date: string; // ISO date
  onboarding_completed: boolean;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null; // ISO date
  avatar_url: string | null;
  push_notifications_enabled: boolean;
  meal_reminders_enabled: boolean;
  daily_checkin_time: string; // Time string (HH:MM:SS)

}

export interface CoachInfo {
  id: string;
  full_name: string;
  avatar_url: string | null;
  // Add trainer-specific fields like title/specialty when we have them
}

// FOOD LOGS
export interface FoodLog {
  id: string;
  user_id: string;
  log_date: string; // ISO date
  meal_type: string; // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  food_name: string;
  calories: number;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  image_url: string | null;
  entry_method: string; // 'manual' | 'barcode' | 'photo'
  created_at: string;
}

// DAILY SUMMARIES
export interface DailySummary {
  id: string;
  user_id: string;
  summary_date: string; // ISO date
  calories_consumed: number;
  calories_burned: number; 
  net_calories: number;
  budget_adjustment: number; 
  created_at: string;
  updated_at: string;
}


// ============= CHECK IN START =============
export type CheckIn = {
  id: string;
  user_id: string;
  check_in_date: string; // ISO date string (YYYY-MM-DD)
  has_unlogged_food: boolean;
  workout_planned: boolean;
  workout_time: string | null; // Time string (HH:MM:SS) or null
  workout_completed: boolean;
  workout_calories_burned: number | null;
  workout_intensity: 'light' | 'moderate' | 'intense' | null;
  workout_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
};
// For creating a new check-in (morning)
export type CheckInCreate = {
  user_id: string;
  check_in_date: string;
  has_unlogged_food: boolean;
  workout_planned: boolean;
  workout_time: string | null;
};
// For updating check-in with workout confirmation (evening)
export type WorkoutConfirmation = {
  workout_completed: boolean;
  workout_calories_burned: number | null;
  workout_intensity: 'light' | 'moderate' | 'intense' | null;
  workout_duration_minutes: number | null;
};
// For the workout confirmation screen form state
export type WorkoutConfirmationForm = {
  completed: boolean;
  knowsCalories: boolean;
  caloriesBurned: string; // string for TextInput
  intensity: 'light' | 'moderate' | 'intense';
  duration: string; // string for TextInput
};
// ============= CHECK IN END =============

// WEEKLY PERIODS
export interface WeeklyPeriod {
  id: string;
  user_id: string;
  week_start_date: string; // ISO date (Monday)
  week_end_date: string; // ISO date (Sunday)
  baseline_average_daily: number;
  weekly_budget: number;
  cumulative_overage: number
  created_at: string;
}

// WEEKLY METRICS
export interface WeeklyMetrics {
  id: string;
  user_id: string;
  weekly_period_id: string;
  calculated_date: string; // ISO date
  balance_score: number; // 0-100
  consistency_score: number; // 0-100
  drift_score: number; // 0-100
  total_consumed: number;
  total_remaining: number;
  calories_reserved: number;
  created_at: string;
}

// PLANNED CHEAT DAYS
export interface PlannedCheatDay {
  id: string;
  user_id: string;
  cheat_date: string; // ISO date
  planned_calories: number;
  actual_calories: number | null;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
}

export interface CheatDayRecommendation {
  light: number;        // Base × 1.3 (e.g., 2,200 cal)
  moderate: number;     // Base × 1.5 (recommended, e.g., 2,600 cal)
  celebration: number;  // Base × 1.75 (e.g., 3,200 cal)
  minimum: number;      // Base + 200 (must feel special)
  maximum: number;      // Max that keeps other days above 1,200 cal
}

// For validating cheat day plans
export interface CheatDayValidation {
  isValid: boolean;
  otherDaysAverage: number; // What non-cheat days will be after this plan
  status: 'safe' | 'challenging' | 'unsafe';
  message: string;
  suggestion?: string;
}

// For displaying today's adjusted budget
export interface AdjustedDailyBudget {
  baseBudget: number;           // Original daily budget (e.g., 1,705)
  adjustment: number;           // Penalty from overage (e.g., -145)
  adjustedBudget: number;       // What user actually has today (e.g., 1,560)
  isCheatDay: boolean;          // Is today a planned cheat day?
  cheatDayCalories?: number;    // If cheat day, the planned amount
  remainingRegularDays: number; // How many non-cheat days left this week
}

// For weekly overview with cheat days
export interface WeeklyOverview {
  weeklyPeriod: WeeklyPeriod;
  cheatDays: PlannedCheatDay[];
  dailySummaries: DailySummary[];
  totalConsumed: number;
  totalBurned: number;
  totalRemaining: number;
  cumulativeOverage: number;
  regularDaysAverage: number;   // Average budget for non-cheat days
}

// For creating a new cheat day
export interface InsertPlannedCheatDay {
  user_id: string;
  weekly_period_id: string;
  cheat_date: string; // YYYY-MM-DD
  planned_calories: number;
  notes?: string | null;
}

// For updating a cheat day
export interface UpdatePlannedCheatDay {
  planned_calories?: number;
  actual_calories?: number | null;
  is_completed?: boolean;
  notes?: string | null;
}

// ENUMS & CONSTANTS
export type UnitSystem = 'imperial' | 'metric';
export type Goal = 'lose_weight' | 'maintain' | 'gain_weight';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type EntryMethod = 'manual' | 'barcode' | 'photo';
export type DayType = 'baseline' | 'different' | 'same';

// HELPER TYPES FOR API RESPONSES
export interface SupabaseResponse<T> {
  data: T | null;
  error: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}