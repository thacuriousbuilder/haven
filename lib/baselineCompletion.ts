import { supabase } from './supabase';

// Activity level thresholds and factors
const ACTIVITY_LEVELS = {
  sedentary: { threshold: 500, factor: 1.2, label: 'Sedentary' },
  lightly_active: { threshold: 1200, factor: 1.375, label: 'Lightly Active' },
  moderately_active: { threshold: 2000, factor: 1.55, label: 'Moderately Active' },
  very_active: { threshold: Infinity, factor: 1.725, label: 'Very Active' },
};

interface BaselineCompletionResult {
  success: boolean;
  data?: {
    daysUsed: number;
    baselineAvgDailyIntake: number;
    baselineTotalExercise: number;
    actualActivityLevel: string;
    actualActivityFactor: number;
    formulaTDEE: number;
    finalTDEE: number;
    dailyTarget: number;
    weeklyBudget: number;
  };
  error?: string;
}

/**
 * Complete baseline week and calculate final TDEE
 * This runs when user finishes their 7-day baseline period
 */
export async function completeBaseline(
  userId: string,
  baselineStartDate: string,
  baselineEndDate: string
): Promise<BaselineCompletionResult> {
  try {
    console.log('🎯 Starting baseline completion...');
    console.log('Date range:', baselineStartDate, 'to', baselineEndDate);

    // Step 1: Get user profile for BMR and deficit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('bmr, daily_deficit, activity_level')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Error loading profile:', profileError);
      return { success: false, error: 'Failed to load user profile' };
    }

    const { bmr, daily_deficit } = profile;

    if (!bmr || !daily_deficit) {
      return { 
        success: false, 
        error: 'Missing BMR or deficit in profile. Complete onboarding first.' 
      };
    }

    console.log('✅ Profile loaded - BMR:', bmr, 'Deficit:', daily_deficit);

    // Step 2: Get all daily summaries for baseline week
    const { data: summaries, error: summariesError } = await supabase
      .from('daily_summaries')
      .select('calories_consumed, calories_burned, summary_date')
      .eq('user_id', userId)
      .gte('summary_date', baselineStartDate)
      .lte('summary_date', baselineEndDate)
      .gt('calories_consumed', 0) // Only count days with actual food logged
      .order('summary_date');

    if (summariesError) {
      console.error('❌ Error loading summaries:', summariesError);
      return { success: false, error: 'Failed to load baseline data' };
    }

    if (!summaries || summaries.length < 5) {
      return { 
        success: false, 
        error: `Need at least 5 days of data. Found: ${summaries?.length || 0}` 
      };
    }

    console.log('✅ Loaded', summaries.length, 'days of baseline data');

    // Step 3: Calculate totals
    const totalFood = summaries.reduce((sum, day) => sum + (day.calories_consumed || 0), 0);
    const totalExercise = summaries.reduce((sum, day) => sum + (day.calories_burned || 0), 0);
    const avgDailyIntake = Math.round(totalFood / summaries.length);
    const daysUsed = summaries.length;

    console.log('📊 Totals:');
    console.log('  - Days used:', daysUsed);
    console.log('  - Food:', totalFood, 'cal');
    console.log('  - Exercise:', totalExercise, 'cal');
    console.log('  - Avg daily intake:', avgDailyIntake, 'cal/day');

    // Step 4: Determine actual activity level from exercise
    let actualActivityLevel = 'sedentary';
    let actualActivityFactor = 1.2;

    if (totalExercise < ACTIVITY_LEVELS.sedentary.threshold) {
      actualActivityLevel = 'sedentary';
      actualActivityFactor = ACTIVITY_LEVELS.sedentary.factor;
    } else if (totalExercise < ACTIVITY_LEVELS.lightly_active.threshold) {
      actualActivityLevel = 'lightly_active';
      actualActivityFactor = ACTIVITY_LEVELS.lightly_active.factor;
    } else if (totalExercise < ACTIVITY_LEVELS.moderately_active.threshold) {
      actualActivityLevel = 'moderately_active';
      actualActivityFactor = ACTIVITY_LEVELS.moderately_active.factor;
    } else {
      actualActivityLevel = 'very_active';
      actualActivityFactor = ACTIVITY_LEVELS.very_active.factor;
    }

    console.log('🏃 Activity level:', actualActivityLevel, '(factor:', actualActivityFactor + ')');

    // Step 5: Calculate formula TDEE with actual activity
    const formulaTDEE = Math.round(bmr * actualActivityFactor);
    console.log('🧮 Formula TDEE:', formulaTDEE, 'cal/day');

    // Step 6: Blend formula + baseline (50/50)
    const finalTDEE = Math.round((formulaTDEE + avgDailyIntake) / 2);
    console.log('✨ Final TDEE (blended):', finalTDEE, 'cal/day');

    // Step 7: Calculate daily target and weekly budget
    const dailyTarget = finalTDEE - daily_deficit;
    const weeklyBudget = dailyTarget * 7;

    console.log('🎯 Targets:');
    console.log('  - Daily:', dailyTarget, 'cal');
    console.log('  - Weekly:', weeklyBudget, 'cal');

    // Step 8: Safety check - minimum calories
    const minimumCalories = 1500; // Can make this gender-specific later
    if (dailyTarget < minimumCalories) {
      console.warn('⚠️ Daily target too low:', dailyTarget);
      return {
        success: false,
        error: `Target of ${dailyTarget} cal/day is below safe minimum (${minimumCalories}). Reduce your weight loss rate or increase activity.`
      };
    }

    // Step 9: Save to user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        baseline_avg_daily_calories: avgDailyIntake,
        baseline_total_exercise: totalExercise,
        actual_activity_level: actualActivityLevel,
        tdee: finalTDEE,
        daily_target: dailyTarget,
        weekly_budget: weeklyBudget,
        baseline_complete: true,
        baseline_completion_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      return { success: false, error: 'Failed to save results' };
    }

    console.log('✅ Baseline completion saved to profile!');

    return {
      success: true,
      data: {
        daysUsed,
        baselineAvgDailyIntake: avgDailyIntake,
        baselineTotalExercise: totalExercise,
        actualActivityLevel,
        actualActivityFactor,
        formulaTDEE,
        finalTDEE,
        dailyTarget,
        weeklyBudget,
      },
    };

  } catch (error) {
    console.error('❌ Error in completeBaseline:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get human-readable label for activity level
 */
export function getActivityLevelLabel(level: string): string {
  const levelKey = level as keyof typeof ACTIVITY_LEVELS;
  return ACTIVITY_LEVELS[levelKey]?.label || level;
}