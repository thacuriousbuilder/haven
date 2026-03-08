import { supabase } from '@haven/shared-utils';
import type { 
  CheatDayRecommendation, 
  CheatDayValidation,
  PlannedCheatDay 
} from '@haven/shared-types';

/**
 * Calculate recommended cheat day amounts based on weekly budget
 * Uses multiplier approach: Base × 1.5 for default recommendation
 */
export function calculateCheatDayRecommendations(
  weeklyBudget: number,
  existingCheatDays: PlannedCheatDay[] = []
): CheatDayRecommendation {
  const dailyBase = weeklyBudget / 7;
  
  // Calculate how much budget is already reserved for other cheat days
  const totalReserved = existingCheatDays.reduce(
    (sum, day) => sum + day.planned_calories, 
    0
  );
  
  // Remaining budget after existing cheat days
  const remainingBudget = weeklyBudget - totalReserved;
  
  // How many days are NOT already planned as cheat days
  const regularDaysCount = 7 - existingCheatDays.length;
  
  // Calculate maximum safe cheat amount
  // Must leave other regular days at 1,200 cal minimum
  const maxSafe = remainingBudget - ((regularDaysCount - 1) * 1200);
  
  return {
    light: Math.round(dailyBase * 1.3),        // ~30% boost
    moderate: Math.round(dailyBase * 1.5),     // ~50% boost (recommended)
    celebration: Math.round(dailyBase * 1.75), // ~75% boost
    minimum: dailyBase + 200,                  // Must feel "special"
    maximum: Math.max(maxSafe, dailyBase + 200), // Never go below minimum
  };
}

/**
 * Validate if a planned cheat day amount is safe
 * Ensures other days won't drop below 1,200 cal minimum
 */
export function validateCheatDay(
  plannedCalories: number,
  weeklyBudget: number,
  existingCheatDays: PlannedCheatDay[] = []
): CheatDayValidation {
  // Calculate reserved budget from OTHER cheat days (not including the one we're planning)
  const totalReservedOther = existingCheatDays.reduce(
    (sum, day) => sum + day.planned_calories,
    0
  );
  
  // Total budget after this new cheat day and existing ones
  const totalReserved = totalReservedOther + plannedCalories;
  
  // Remaining budget for regular days
  const remainingForRegularDays = weeklyBudget - totalReserved;
  
  // Number of regular (non-cheat) days
  const regularDaysCount = 7 - existingCheatDays.length - 1; // -1 for the new cheat day
  
  // Average budget per regular day
  const otherDaysAverage = regularDaysCount > 0 
    ? remainingForRegularDays / regularDaysCount 
    : 0;
  
  // Determine safety level
  if (otherDaysAverage < 1200) {
    return {
      isValid: false,
      otherDaysAverage: Math.round(otherDaysAverage),
      status: 'unsafe',
      message: `This would leave your other ${regularDaysCount} days at only ${Math.round(otherDaysAverage)} cal each, below the safe 1,200 minimum.`,
      suggestion: `Try reducing to ${Math.round(weeklyBudget - (regularDaysCount * 1200))} cal or fewer to stay safe.`,
    };
  }
  
  if (otherDaysAverage < 1400) {
    return {
      isValid: true,
      otherDaysAverage: Math.round(otherDaysAverage),
      status: 'challenging',
      message: `This leaves your other ${regularDaysCount} days at ${Math.round(otherDaysAverage)} cal each. Challenging but doable!`,
    };
  }
  
  return {
    isValid: true,
    otherDaysAverage: Math.round(otherDaysAverage),
    status: 'safe',
    message: `Perfect! Your other ${regularDaysCount} days will have ${Math.round(otherDaysAverage)} cal each - comfortable and sustainable.`,
  };
}

/**
 * Get all cheat days for a specific weekly period
 */
export async function getCheatDaysForWeek(
  userId: string,
  weekStartDate: string,
  weekEndDate: string
): Promise<PlannedCheatDay[]> {
  const { data, error } = await supabase
    .from('planned_cheat_days')
    .select('*')
    .eq('user_id', userId)
    .gte('cheat_date', weekStartDate)
    .lte('cheat_date', weekEndDate)
    .order('cheat_date', { ascending: true });

  if (error) {
    console.error('Error fetching cheat days:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if a specific date is a planned cheat day
 */
export async function isCheatDay(
  userId: string,
  date: string
): Promise<{ isCheatDay: boolean; cheatDay: PlannedCheatDay | null }> {
  const { data, error } = await supabase
    .from('planned_cheat_days')
    .select('*')
    .eq('user_id', userId)
    .eq('cheat_date', date)
    .maybeSingle();

  if (error) {
    console.error('Error checking cheat day:', error);
    return { isCheatDay: false, cheatDay: null };
  }

  return { 
    isCheatDay: !!data, 
    cheatDay: data 
  };
}

/**
 * Get count of cheat days remaining this week
 */
export function getCheatDaysRemaining(
  cheatDays: PlannedCheatDay[],
  today: string
): number {
  return cheatDays.filter(day => day.cheat_date >= today && !day.is_completed).length;
}

/**
 * Calculate total calories reserved for cheat days this week
 */
export function getTotalReservedCalories(cheatDays: PlannedCheatDay[]): number {
  return cheatDays.reduce((sum, day) => sum + day.planned_calories, 0);
}

/**
 * Calculate safe minimum daily calories based on user's goal and gender
 * These are COMFORT floors, not bare minimums
 * 
 * @param goal - User's goal (lose_weight, maintain, gain_weight)
 * @param gender - User's gender (male, female)
 * @returns Safe minimum daily calorie floor
 */
export function calculateComfortFloor(goal: string, gender: string): number {
    const isMale = gender.toLowerCase() === 'male';
    
    switch (goal) {
      case 'lose_weight':
      case 'weight_loss':
      case 'weight_loss_aggressive':
      case 'weight_loss_moderate':
        // Weight loss: Still need adequate nutrition
        return isMale ? 1500 : 1300;
        
      case 'maintain':
      case 'maintenance':
        // Maintenance: Comfortable baseline
        return isMale ? 1600 : 1400;
        
      case 'gain_weight':
      case 'muscle_gain':
      case 'bulk':
        // Muscle gain: Need fuel for growth
        return isMale ? 1800 : 1500;
        
      default:
        // Default to maintenance values
        return isMale ? 1600 : 1400;
    }
  }

  /**
 * Calculate and distribute daily overage across remaining regular days
 * Called when user opens app or logs food on a new day
 * 
 * @param userId - User's ID
 * @param weeklyPeriodId - Current weekly period ID
 * @param date - Today's date (YYYY-MM-DD)
 * @returns Success status and updated cumulative overage
 */
// utils/cheatDayHelpers.ts
// Replace ONLY the calculateAndDistributeOverage function

const OVERAGE_THRESHOLD = 150;

export async function calculateAndDistributeOverage(
  userId: string,
  weeklyPeriodId: string,
  date: string
): Promise<{ success: boolean; cumulativeOverage: number; error?: string }> {
  try {
    console.log(`📊 Calculating overage for ${date}`);

    // ============================================
    // STEP 1: Get weekly period details
    // ============================================
    const { data: weeklyPeriod, error: periodError } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('id', weeklyPeriodId)
      .single();

    if (periodError || !weeklyPeriod) {
      return { success: false, cumulativeOverage: 0, error: 'Weekly period not found' };
    }

    const weekStartDate = weeklyPeriod.week_start_date;
    const weekEndDate = weeklyPeriod.week_end_date;
    const weeklyBudget = weeklyPeriod.weekly_budget;
    const dailyBase = weeklyBudget / 7;

    // ============================================
    // STEP 2: Get all cheat days for this week
    // ============================================
    const { data: cheatDays } = await supabase
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .gte('cheat_date', weekStartDate)
      .lte('cheat_date', weekEndDate);

    const cheatDayDates = new Set(cheatDays?.map(day => day.cheat_date) || []);

    // ============================================
    // STEP 3: Get all daily summaries up to yesterday
    // (We exclude today — it's not complete yet)
    // ============================================
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    const { data: dailySummaries } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('summary_date', weekStartDate)
      .lte('summary_date', yesterdayString)
      .order('summary_date', { ascending: true });

    if (!dailySummaries || dailySummaries.length === 0) {
      console.log('✅ No completed days yet, no overage to calculate');
      return { success: true, cumulativeOverage: 0 };
    }

    // ============================================
    // STEP 4: Calculate signed cumulative delta
    // Positive = overage, Negative = savings
    // Only count days where |delta| > 150
    // ============================================
    let cumulativeDelta = 0;

    for (const daySummary of dailySummaries) {
      const dayDate = daySummary.summary_date;
      const consumed = daySummary.calories_consumed || 0;
      const burned = daySummary.calories_burned || 0;
      const netConsumed = consumed - burned;

      const isCheatDay = cheatDayDates.has(dayDate);
      const dayBudget = isCheatDay
        ? (cheatDays?.find(cd => cd.cheat_date === dayDate)?.planned_calories ?? dailyBase)
        : dailyBase;

      const delta = netConsumed - dayBudget;

      if (Math.abs(delta) > OVERAGE_THRESHOLD) {
        cumulativeDelta += delta;
        const label = isCheatDay ? '🎉 Cheat' : '📅 Regular';
        const sign = delta > 0 ? '+' : '';
        console.log(`${label} day ${dayDate}: net ${netConsumed}, budget ${Math.round(dayBudget)}, delta: ${sign}${Math.round(delta)}`);
      } else {
        console.log(`✅ ${dayDate}: delta ${Math.round(delta)} within threshold, ignored`);
      }
    }

    // cumulativeDelta can be negative (net savings) or positive (net overage)
    console.log(`💰 Net cumulative delta: ${Math.round(cumulativeDelta)} cal`);

    // ============================================
    // STEP 5: Persist to weekly_periods
    // We store the raw signed delta as cumulative_overage
    // getTodaysAdjustedBudget handles the floor logic
    // ============================================
    const { error: updateError } = await supabase
      .from('weekly_periods')
      .update({ cumulative_overage: Math.round(cumulativeDelta) })
      .eq('id', weeklyPeriodId);

    if (updateError) {
      return { success: false, cumulativeOverage: 0, error: 'Failed to update overage' };
    }

    return { success: true, cumulativeOverage: Math.round(cumulativeDelta) };

  } catch (error) {
    console.error('Error in calculateAndDistributeOverage:', error);
    return { 
      success: false, 
      cumulativeOverage: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get today's adjusted daily budget accounting for:
 * - Cumulative overage distributed across remaining days
 * - Whether today is a cheat day
 * - Personalized comfort floor
 * 
 * @param userId - User's ID
 * @param date - Today's date (YYYY-MM-DD)
 * @param userGoal - User's goal (for comfort floor calculation)
 * @param userGender - User's gender (for comfort floor calculation)
 * @returns Adjusted budget details
 */
export async function getTodaysAdjustedBudget(
  userId: string,
  date: string,
  userGoal: string,
  userGender: string
): Promise<{
  baseBudget: number;
  adjustment: number;
  adjustedBudget: number;
  isCheatDay: boolean;
  cheatDayCalories?: number;
  remainingRegularDays: number;
  cumulativeOverage: number;
}> {
  try {
    // ============================================
    // STEP 1: Get weekly period
    // ============================================
    
    const { data: weeklyPeriod } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('user_id', userId)
      .lte('week_start_date', date)
      .gte('week_end_date', date)
      .single();

    if (!weeklyPeriod) {
      throw new Error('No active weekly period found');
    }

    const weeklyBudget = weeklyPeriod.weekly_budget;
    const weekEndDate = weeklyPeriod.week_end_date;
    const cumulativeOverage = weeklyPeriod.cumulative_overage || 0;
    const dailyBase = weeklyBudget / 7;

    // ============================================
    // STEP 2: Check if today is a cheat day
    // ============================================
    
    const { data: todayCheatDay } = await supabase
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .eq('cheat_date', date)
      .maybeSingle();

    const isCheatDay = !!todayCheatDay;
    const cheatDayCalories = todayCheatDay?.planned_calories;

    // If today IS a cheat day, return planned calories (no adjustment)
    if (isCheatDay) {
      console.log(`🎉 Today is a cheat day: ${cheatDayCalories} cal (no adjustment)`);
      return {
        baseBudget: dailyBase,
        adjustment: 0,
        adjustedBudget: cheatDayCalories || dailyBase,
        isCheatDay: true,
        cheatDayCalories,
        remainingRegularDays: 0, // Not applicable for cheat days
        cumulativeOverage,
      };
    }

    // ============================================
    // STEP 3: Get remaining cheat days (after today)
    // ============================================
    
    const { data: futureCheatDays } = await supabase
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .gt('cheat_date', date)
      .lte('cheat_date', weekEndDate);

    const futureCheatDaysCount = futureCheatDays?.length || 0;

    // ============================================
    // STEP 4: Calculate remaining regular days
    // ============================================
    
    // Days from tomorrow to end of week
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = new Date(weekEndDate);
    
    const totalRemainingDays = Math.max(0, 
      Math.ceil((endDate.getTime() - tomorrow.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    
    // Subtract future cheat days to get remaining REGULAR days
    const remainingRegularDays = Math.max(1, totalRemainingDays - futureCheatDaysCount);

    console.log(`📊 Remaining days: ${totalRemainingDays} total, ${futureCheatDaysCount} cheat, ${remainingRegularDays} regular`);

    // ============================================
    // STEP 5: Calculate adjustment
    // ============================================
    
    // Distribute cumulative overage across remaining regular days (including today)
    const adjustment = Math.round(cumulativeOverage / (remainingRegularDays + 1)); // +1 includes today

    // Calculate adjusted budget
    let adjustedBudget = dailyBase - adjustment;

    // Apply comfort floor
    const comfortFloor = calculateComfortFloor(userGoal, userGender);
    adjustedBudget = Math.max(adjustedBudget, comfortFloor);

    console.log(`💰 Today's budget: ${Math.round(dailyBase)} - ${adjustment} = ${Math.round(adjustedBudget)} cal (floor: ${comfortFloor})`);

    return {
      baseBudget: Math.round(dailyBase),
      adjustment: -adjustment, // Negative because it's a penalty
      adjustedBudget: Math.round(adjustedBudget),
      isCheatDay: false,
      remainingRegularDays,
      cumulativeOverage,
    };

  } catch (error) {
    console.error('Error in getTodaysAdjustedBudget:', error);
    
    // Return safe defaults on error
    return {
      baseBudget: 1700,
      adjustment: 0,
      adjustedBudget: 1700,
      isCheatDay: false,
      remainingRegularDays: 1,
      cumulativeOverage: 0,
    };
  }
}

