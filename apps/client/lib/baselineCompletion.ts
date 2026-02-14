
import { supabase } from './supabase';
import { createWeeklyPeriodForUser } from './weeklyPeriod';

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

    // Step 1: Get user profile for BMR, deficit, and sex (for safety minimums)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('bmr, daily_deficit, activity_level, gender')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Error loading profile:', profileError);
      return { success: false, error: 'Failed to load user profile' };
    }

    const { bmr, daily_deficit, gender } = profile;

    if (!bmr || !daily_deficit) {
      return { 
        success: false, 
        error: 'Missing BMR or deficit in profile. Complete onboarding first.' 
      };
    }

    console.log('✅ Profile loaded - BMR:', bmr, 'Deficit:', daily_deficit);

    // Step 2: Get all daily summaries for baseline week (food intake)
    const { data: summaries, error: summariesError } = await supabase
      .from('daily_summaries')
      .select('calories_consumed, summary_date')
      .eq('user_id', userId)
      .gte('summary_date', baselineStartDate)
      .lte('summary_date', baselineEndDate)
      .gt('calories_consumed', 0) // Only count days with actual food logged
      .order('summary_date');

    if (summariesError) {
      console.error('❌ Error loading summaries:', summariesError);
      return { success: false, error: 'Failed to load baseline data' };
    }

    if (!summaries || summaries.length < 3) {
      return { 
        success: false, 
        error: `Need at least 3 days of data. Found: ${summaries?.length || 0}` 
      };
    }

    console.log('✅ Loaded', summaries.length, 'days of baseline data');

    // Step 2b: Get workout calories from check_ins
    const { data: checkIns, error: checkInsError } = await supabase
      .from('check_ins')
      .select('workout_calories_burned, check_in_date')
      .eq('user_id', userId)
      .gte('check_in_date', baselineStartDate)
      .lte('check_in_date', baselineEndDate);

    if (checkInsError) {
      console.error('❌ Error loading check-ins:', checkInsError);
      // Don't fail - just proceed with 0 exercise
    }

    // Step 3: Calculate totals
    const totalFood = summaries.reduce((sum, day) => sum + (day.calories_consumed || 0), 0);
    const totalExercise = checkIns?.reduce((sum, day) => sum + (day.workout_calories_burned || 0), 0) || 0;
    const avgDailyIntake = Math.round(totalFood / summaries.length);
    const daysUsed = summaries.length;

    console.log('📊 Totals:');
    console.log('  - Days used:', daysUsed);
    console.log('  - Food:', totalFood, 'cal');
    console.log('  - Exercise:', totalExercise, 'cal (from check-ins)');
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

    // Step 6: Blend formula + baseline (50/50) for maintenance estimate
    const finalTDEE = Math.round((formulaTDEE + avgDailyIntake) / 2);
    console.log('✨ Final TDEE (blended):', finalTDEE, 'cal/day');

    // Step 7: Smart deficit application
    console.log('🎯 Calculating targets with smart deficit logic...');

    // Check how much deficit is already implied by baseline eating
    const impliedDeficit = formulaTDEE - avgDailyIntake;
    console.log('📊 Deficit Analysis:', {
      formulaTDEE,
      baselineAvg: avgDailyIntake,
      impliedDeficit,
      goalDeficit: daily_deficit,
      percentOfGoal: Math.round((impliedDeficit / daily_deficit) * 100) + '%',
    });

    let dailyTarget: number;
    let weeklyBudget: number;

    if (impliedDeficit >= daily_deficit * 0.8) {
      // Baseline already shows they're eating at 80%+ of goal deficit
      // Use baseline average - they're already there!
      dailyTarget = avgDailyIntake;
      weeklyBudget = dailyTarget * 7;
      
      console.log('✅ Baseline already at goal deficit!');
      console.log('   Implied deficit:', impliedDeficit, 'cal (', Math.round((impliedDeficit / daily_deficit) * 100) + '% of goal)');
      console.log('   Using baseline average as target:', dailyTarget, 'cal');
      
    } else {
      // Baseline is closer to maintenance - apply the goal deficit
      const targetWithDeficit = finalTDEE - daily_deficit;
      
      // But never go below baseline average (don't restrict more than natural habits)
      dailyTarget = Math.max(targetWithDeficit, avgDailyIntake);
      weeklyBudget = dailyTarget * 7;
      
      console.log('✅ Applying deficit to Final TDEE');
      console.log('   Target with deficit:', targetWithDeficit, 'cal');
      console.log('   Adjusted to (not below baseline):', dailyTarget, 'cal');
    }

    // Safety checks - prevent unhealthy extremes
    const minCalories = gender === 'female' ? 1200 : 1500;
    const maxCalories = finalTDEE + 1000; // Cap surplus for gaining weight

    const originalTarget = dailyTarget;
    dailyTarget = Math.max(minCalories, Math.min(maxCalories, dailyTarget));
    
    if (dailyTarget !== originalTarget) {
      console.log('⚠️  Safety adjustment applied:', originalTarget, '→', dailyTarget);
    }

    weeklyBudget = dailyTarget * 7;

    console.log('🎯 Final Targets:');
    console.log('  - Daily target:', dailyTarget, 'cal');
    console.log('  - Weekly budget:', weeklyBudget, 'cal');
    console.log('  - Actual deficit from formula:', formulaTDEE - dailyTarget, 'cal');

    // Step 8: Save to user profile
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

    console.log('🎯 Creating first weekly period...');
    const periodResult = await createWeeklyPeriodForUser(userId);

    if (!periodResult.success) {
      console.error('⚠️  Warning: Failed to create weekly period:', periodResult.error);
      // Don't fail the entire baseline completion - just log the warning
      // User can still proceed, cron will create it later
    }

    if (periodResult.reason === 'created') {
      console.log('✅ First weekly period created!');
    } else if (periodResult.reason === 'already_exists') {
      console.log('ℹ️  Weekly period already exists');
    }
    
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
 * Complete baseline with estimated data (for users with <3 days logged)
 * Uses BMR and reported activity level from onboarding
 */
export async function completeBaselineWithEstimatedData(
  userId: string
): Promise<BaselineCompletionResult> {
  try {
    console.log('🔮 Completing baseline with estimated data...');

    // Step 1: Get user profile for BMR, activity level, deficit, and sex
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('bmr, daily_deficit, activity_level, baseline_start_date, gender')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('❌ Error loading profile:', profileError);
      return { success: false, error: 'Failed to load user profile' };
    }

    const { bmr, daily_deficit, activity_level, gender } = profile;

    if (!bmr || !daily_deficit || !activity_level) {
      return { 
        success: false, 
        error: 'Missing BMR, deficit, or activity level. Complete onboarding first.' 
      };
    }

    console.log('✅ Profile loaded - BMR:', bmr, 'Deficit:', daily_deficit, 'Activity:', activity_level);

    // Step 2: Get activity factor from reported level
    const activityFactors: Record<string, number> = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
    };

    const activityFactor = activityFactors[activity_level.toLowerCase()] || 1.2;

    // Step 3: Calculate TDEE using formula (no baseline averaging)
    const estimatedTDEE = Math.round(bmr * activityFactor);
    console.log('🧮 Estimated TDEE:', estimatedTDEE, 'cal/day');

    // Step 4: Calculate daily target and weekly budget with safety checks
    let dailyTarget = estimatedTDEE - daily_deficit;
    
    // Safety minimums
    const minCalories = gender === 'female' ? 1200 : 1500;
    const maxCalories = estimatedTDEE + 1000;
    
    dailyTarget = Math.max(minCalories, Math.min(maxCalories, dailyTarget));
    const weeklyBudget = dailyTarget * 7;

    console.log('🎯 Targets:');
    console.log('  - Daily:', dailyTarget, 'cal');
    console.log('  - Weekly:', weeklyBudget, 'cal');

    // Step 5: Get any logged days count (even if <3)
    let daysLogged = 0;
    if (profile.baseline_start_date) {
      const { count } = await supabase
        .from('daily_summaries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('summary_date', profile.baseline_start_date)
        .gt('calories_consumed', 0);
      
      daysLogged = count || 0;
    }

    // Step 6: Save to user profile with estimated flag
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        baseline_avg_daily_calories: null, // No baseline avg since estimated
        baseline_total_exercise: 0, // No exercise data
        actual_activity_level: activity_level, // Use reported since no data
        tdee: estimatedTDEE,
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

    console.log('✅ Baseline completed with estimated data!');

    console.log('🎯 Creating first weekly period...');
    const periodResult = await createWeeklyPeriodForUser(userId);
    
    if (!periodResult.success) {
      console.error('⚠️  Warning: Failed to create weekly period:', periodResult.error);
      // Don't fail the entire baseline completion - just log the warning
    }
    
    if (periodResult.reason === 'created') {
      console.log('✅ First weekly period created!');
    } else if (periodResult.reason === 'already_exists') {
      console.log('ℹ️  Weekly period already exists');
    }
    
    return {
      success: true,
      data: {
        daysUsed: daysLogged,
        baselineAvgDailyIntake: 0, // No baseline data
        baselineTotalExercise: 0,
        actualActivityLevel: activity_level,
        actualActivityFactor: activityFactor,
        formulaTDEE: estimatedTDEE,
        finalTDEE: estimatedTDEE,
        dailyTarget,
        weeklyBudget,
      },
    };

  } catch (error) {
    console.error('❌ Error in completeBaselineWithEstimatedData:', error);
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