export type AccountType = 'client' | 'trainer';
export type Gender = 'male' | 'female' | 'other';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'not_very_active' | 'lightly_active' | 'active' | 'very_active';
export type WorkoutFrequency = '0-2' | '3-5' | '6+';
export type UnitSystem = 'imperial' | 'metric'; 
export type WeeklyGoalRate = 0.5 | 1 | 1.5 | 2;  

export interface OnboardingData {


  accountType: AccountType | null;

 
  gender: Gender | null;
  
 
  birthMonth: number | null;  
  birthDay: number | null;   
  birthYear: number | null;  
  
  
  unitSystem: UnitSystem;     
  heightFeet: number | null;
  heightInches: number | null;
  currentWeight: number | null;  
  goalWeight: number | null;     
  
 
  activityLevel: ActivityLevel | null;
  
 
  workoutFrequency: WorkoutFrequency | null;
  
  
  goal: Goal | null;
  
  
  weeklyGoalRate: WeeklyGoalRate | null;  
}

export const initialOnboardingData: OnboardingData = {
  accountType:null,
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
};