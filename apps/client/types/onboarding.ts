

export type AccountType = 'client' | 'trainer';
export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose' | 'gain' | 'maintain';
export type ActivityLevel = 'not_very_active' | 'lightly_active' | 'active' | 'very_active';
export type WorkoutFrequency = '0-2' | '3-5' | '6+';
export type UnitSystem = 'imperial' | 'metric';
export type WeeklyGoalRate = 0.5 | 1 | 1.5 | 2;
export type PlanPath = 'baseline' | 'estimate';

export type ChooseGoalOption =
  | 'lose_weight'
  | 'stop_guilt'
  |'gain_weight'  
  | 'enjoy_food'
  | 'understand_patterns';

export type ChooseObstacleOption =
  | 'bad_day_ruins_all'
  | 'weekends_undo_progress'
  | 'guilty_eating_out'
  | 'no_balance';

export interface OnboardingData {
  // Account
  firstName: string;
  lastName: string;
  accountType: AccountType | null;

  // Goals & obstacles (new)
  chooseGoals: ChooseGoalOption[];
  chooseObstacles: ChooseObstacleOption[];

  // Bio
  gender: Gender | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthYear: number | null;

  // Body metrics
  unitSystem: UnitSystem;
  heightFeet: number | null;
  heightInches: number | null;
  currentWeight: number | null;
  goalWeight: number | null;

  // Activity
  activityLevel: ActivityLevel | null;
  workoutFrequency: WorkoutFrequency | null;

  // Plan
  goal: Goal | null;
  weeklyGoalRate: WeeklyGoalRate | null;
  planPath: PlanPath | null;

  // Preferences (new)
  mealTimesEnabled: boolean;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  eveningRecapEnabled: boolean;
  eveningRecapTime: string;
  notificationsEnabled: boolean;
  timezone: string;

}

export const initialOnboardingData: OnboardingData = {
  firstName: '',
  lastName: '',
  accountType: null,

  chooseGoals: [],
  chooseObstacles: [],

  gender: null,
  birthMonth: null,
  birthDay: null,
  birthYear: null,

  unitSystem: 'imperial',
  heightFeet: null,
  heightInches: null,
  currentWeight: null,
  goalWeight: null,

  activityLevel: null,
  workoutFrequency: null,

  goal: null,
  weeklyGoalRate: null,
  planPath: null,

  mealTimesEnabled: false,
  breakfastTime: '8:00 AM',
  lunchTime: '12:00 PM',
  dinnerTime: '6:00 PM',
  eveningRecapEnabled: false,
  eveningRecapTime: '8:00 PM',
  notificationsEnabled: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};