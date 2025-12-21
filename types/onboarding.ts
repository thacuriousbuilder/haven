

export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'not_very_active' | 'lightly_active' | 'active' | 'very_active';
export type WorkoutFrequency = '0-2' | '3-5' | '6+';

export interface OnboardingData {
  // Screen 1
  gender: Gender | null;
  
  // Screen 2
  birthMonth: number | null;  // 1-12
  birthDay: number | null;    // 1-31
  birthYear: number | null;   // e.g., 1990
  
  // Screen 3
  heightFeet: number | null;
  heightInches: number | null;
  currentWeight: number | null;  // lbs
  goalWeight: number | null;     // lbs
  
  // Screen 4
  activityLevel: ActivityLevel | null;
  
  // Screen 5
  workoutFrequency: WorkoutFrequency | null;
  
  // Screen 6
  goal: Goal | null;
  
  // Screens 7-10 are informational (no data)
  // Screen 11 is informational (no data)
  // Screen 12-13 are informational (notification permission handled separately)
}

export const initialOnboardingData: OnboardingData = {
  gender: null,
  birthMonth: null,
  birthDay: null,
  birthYear: null,
  heightFeet: null,
  heightInches: null,
  currentWeight: null,
  goalWeight: null,
  activityLevel: null,
  workoutFrequency: null,
  goal: null,
};