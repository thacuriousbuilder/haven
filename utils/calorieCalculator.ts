

import type { Gender, ActivityLevel, Goal } from '@/types/onboarding';

/**
 * Map  app's gender types to calculator gender types
 */
function mapGender(gender: Gender): 'male' | 'female' {
  if (gender === 'other') {
    // Default to female for BMR calculation (more conservative)
    return 'female';
  }
  return gender;
}

/**
 * Map  app's activity level to TDEE multiplier keys
 */
function mapActivityLevel(activityLevel: ActivityLevel): keyof typeof ACTIVITY_MULTIPLIERS {
  const activityMap: Record<ActivityLevel, keyof typeof ACTIVITY_MULTIPLIERS> = {
    'not_very_active': 'lightly_active',
    'lightly_active': 'lightly_active',
    'active': 'moderately_active',  // 
    'very_active': 'very_active',
  };
  
  return activityMap[activityLevel] || 'moderately_active';
}

/**
 * Map  app's goal types to calculator goal types
 */
function mapGoal(goal: Goal): 'lose_weight' | 'gain_weight' | 'maintain_weight' {
  const goalMap: Record<Goal, 'lose_weight' | 'gain_weight' | 'maintain_weight'> = {
    'lose': 'lose_weight',
    'gain': 'gain_weight',
    'maintain': 'maintain_weight',
  };
  
  return goalMap[goal] || 'maintain_weight';
}

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 * Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
 * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
 */
export function calculateBMR(
  gender: Gender,
  weightLbs: number,
  heightFt: number,
  heightIn: number,
  birthDate: string // YYYY-MM-DD format
): number {
  // Convert weight to kg
  const weightKg = weightLbs * 0.453592;
  
  // Convert height to cm
  const totalInches = (heightFt * 12) + heightIn;
  const heightCm = totalInches * 2.54;
  
  // Calculate age
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  // Map gender to calculator type
  const calculatorGender = mapGender(gender);
  
  // Mifflin-St Jeor Equation
  let bmr: number;
  if (calculatorGender === 'male') {
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  } else {
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  }
  
  return Math.round(bmr);
}

/**
 * Activity level multipliers for TDEE calculation
 */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,       // Little to no exercise
  lightly_active: 1.375, // Light exercise 1-3 days/week
  moderately_active: 1.55, // Moderate exercise 3-5 days/week
  very_active: 1.725,   // Hard exercise 6-7 days/week
  extra_active: 1.9,    // Very hard exercise, physical job
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const mappedActivity = mapActivityLevel(activityLevel);
  const multiplier = ACTIVITY_MULTIPLIERS[mappedActivity];
  return Math.round(bmr * multiplier);
}


//adjust weight loss/per week based on goal
export function adjustForGoal(
  tdee: number,
  goal: Goal,
  targetWeightLbs?: number | null,
  currentWeightLbs?: number | null
): number {
  const mappedGoal = mapGoal(goal);
  
  if (mappedGoal === 'lose_weight') {
    const weightToLose = currentWeightLbs && targetWeightLbs 
      ? currentWeightLbs - targetWeightLbs 
      : 0;
    
    // Scale deficit based on amount to lose
    let deficit = 500; // Default: 1 lb/week
    
    if (weightToLose >= 50) {
      deficit = 750;  // 1.5 lbs/week for 50+ lbs to lose
    } else if (weightToLose >= 25) {
      deficit = 625;  // 1.25 lbs/week for 25-50 lbs to lose
    } else if (weightToLose >= 15) {
      deficit = 500;  // 1 lb/week for 15-25 lbs to lose
    } else {
      deficit = 375;  // 0.75 lb/week for last 15 lbs
    }
    
    return Math.round(tdee - deficit);
  } else if (mappedGoal === 'gain_weight') {
    return Math.round(tdee + 500);
  } else {
    return tdee;
  }
}
/**
 * Calculate weekly calorie budget
 */
export function calculateWeeklyCalorieBudget(dailyCalories: number): number {
  return dailyCalories * 7;
}

/**
 * Calculate macro distribution (in grams)
 * Standard macros:
 * - Protein: 30% of calories (4 cal/g)
 * - Carbs: 40% of calories (4 cal/g)
 * - Fats: 30% of calories (9 cal/g)
 */
export function calculateMacros(weeklyCalories: number): {
  protein: number;
  carbs: number;
  fats: number;
} {
  const proteinCalories = weeklyCalories * 0.30;
  const carbsCalories = weeklyCalories * 0.40;
  const fatsCalories = weeklyCalories * 0.30;
  
  return {
    protein: Math.round(proteinCalories / 4),  // 4 cal per gram
    carbs: Math.round(carbsCalories / 4),      // 4 cal per gram
    fats: Math.round(fatsCalories / 9),        // 9 cal per gram
  };
}

/**
 * Estimate target date for goal weight
 * Assumes 1lb/week loss or gain
 */
export function estimateTargetDate(
  currentWeight: number,
  targetWeight: number,
  goal: Goal
): string {
  const mappedGoal = mapGoal(goal);
  
  if (mappedGoal === 'maintain_weight') {
    return 'N/A - Maintaining current weight';
  }
  
  const weightDifference = Math.abs(targetWeight - currentWeight);
  const weeksToGoal = Math.ceil(weightDifference); // 1 lb per week
  
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + (weeksToGoal * 7));
  
  return targetDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
}