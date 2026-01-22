
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
  created_at: string;
  updated_at: string;
}

// CHECK-INS
export interface CheckIn {
  id: string;
  user_id: string;
  check_in_date: string; // ISO date
  day_type: string; // 'baseline' | 'different' | 'same'
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// WEEKLY PERIODS
export interface WeeklyPeriod {
  id: string;
  user_id: string;
  week_start_date: string; // ISO date (Monday)
  week_end_date: string; // ISO date (Sunday)
  baseline_average_daily: number;
  weekly_budget: number;
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
  notes: string | null;
  created_at: string;
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