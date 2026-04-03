
import { supabase } from '@haven/shared-utils';
import type { 
  CheatDayRecommendation, 
  CheatDayValidation,
  PlannedCheatDay 
} from '@haven/shared-types';

/**
 * Calculate recommended cheat day amounts based on weekly budget
 */
export function calculateCheatDayRecommendations(
  weeklyBudget: number,
  existingCheatDays: PlannedCheatDay[] = []
): CheatDayRecommendation {
  const dailyBase = weeklyBudget / 7;
  
  const totalReserved = existingCheatDays.reduce(
    (sum, day) => sum + day.planned_calories, 
    0
  );
  
  const remainingBudget = weeklyBudget - totalReserved;
  const regularDaysCount = 7 - existingCheatDays.length;
  const maxSafe = remainingBudget - ((regularDaysCount - 1) * 1200);
  
  return {
    light: Math.round(dailyBase * 1.3),
    moderate: Math.round(dailyBase * 1.5),
    celebration: Math.round(dailyBase * 1.75),
    minimum: dailyBase + 200,
    maximum: Math.max(maxSafe, dailyBase + 200),
  };
}

/**
 * Validate if a planned cheat day amount is safe
 */
export function validateCheatDay(
  plannedCalories: number,
  weeklyBudget: number,
  existingCheatDays: PlannedCheatDay[] = []
): CheatDayValidation {
  const totalReservedOther = existingCheatDays.reduce(
    (sum, day) => sum + day.planned_calories,
    0
  );
  
  const totalReserved = totalReservedOther + plannedCalories;
  const remainingForRegularDays = weeklyBudget - totalReserved;
  const regularDaysCount = 7 - existingCheatDays.length - 1;
  const otherDaysAverage = regularDaysCount > 0 
    ? remainingForRegularDays / regularDaysCount 
    : 0;
  
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

  return { isCheatDay: !!data, cheatDay: data };
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
 */
export function calculateComfortFloor(goal: string, gender: string): number {
  const isMale = gender.toLowerCase() === 'male';
  
  switch (goal) {
    case 'lose_weight':
    case 'weight_loss':
    case 'weight_loss_aggressive':
    case 'weight_loss_moderate':
      return isMale ? 1500 : 1300;
      
    case 'maintain':
    case 'maintenance':
      return isMale ? 1600 : 1400;
      
    case 'gain_weight':
    case 'muscle_gain':
    case 'bulk':
      return isMale ? 1800 : 1500;
      
    default:
      return isMale ? 1600 : 1400;
  }
}

/**
 * Calculate and distribute daily overage across remaining regular days.
 * Positive cumulative = over budget, Negative = under budget (savings).
 */
export async function calculateAndDistributeOverage(
  userId: string,
  weeklyPeriodId: string,
  date: string
): Promise<{ success: boolean; cumulativeOverage: number; error?: string }> {
  try {
    console.log(`📊 Calculating overage for ${date}`);

    // STEP 1: Get weekly period details
    const { data: weeklyPeriod, error: periodError } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('id', weeklyPeriodId)
      .single();

    if (periodError || !weeklyPeriod) {
      return { success: false, cumulativeOverage: 0, error: 'Weekly period not found' };
    }

    const weekStartDate = weeklyPeriod.week_start_date;
    const weekEndDate   = weeklyPeriod.week_end_date;
    const weeklyBudget  = weeklyPeriod.weekly_budget;
    const dailyBase     = weeklyBudget / 7;

    // STEP 2: Get all cheat days for this week
    const { data: cheatDays } = await supabase
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .gte('cheat_date', weekStartDate)
      .lte('cheat_date', weekEndDate);

    const cheatDayDates = new Set(cheatDays?.map(day => day.cheat_date) || []);

    // STEP 3: Get all completed daily summaries up to yesterday
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

    // STEP 4: Calculate signed cumulative delta
    // Positive = overage, Negative = savings
    // Only count days where |delta| exceeds 8% of day budget (min 150 cal)
    let cumulativeDelta = 0;

    for (const daySummary of dailySummaries) {
      const dayDate = daySummary.summary_date;

      // calories_burned excluded — not captured at MVP
      const consumed = daySummary.calories_consumed || 0;

      const isCheatDay    = cheatDayDates.has(dayDate);
      const dayBudget     = isCheatDay
        ? (cheatDays?.find(cd => cd.cheat_date === dayDate)?.planned_calories ?? dailyBase)
        : dailyBase;

      // Percentage-based threshold with 150 cal floor
      const dayThreshold = Math.max(150, Math.round(dayBudget * 0.08));

      const delta = consumed - dayBudget;

      if (Math.abs(delta) > dayThreshold) {
        cumulativeDelta += delta;
        const label = isCheatDay ? '🎉 Cheat' : '📅 Regular';
        const sign  = delta > 0 ? '+' : '';
        console.log(`${label} day ${dayDate}: consumed ${consumed}, budget ${Math.round(dayBudget)}, threshold ${dayThreshold}, delta: ${sign}${Math.round(delta)}`);
      } else {
        console.log(`✅ ${dayDate}: delta ${Math.round(delta)} within threshold (${dayThreshold} cal), ignored`);
      }
    }

    console.log(`💰 Net cumulative delta: ${Math.round(cumulativeDelta)} cal`);

    // STEP 5: Persist to weekly_periods
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
 * - Cumulative overage/savings distributed across remaining days
 * - Whether today is a cheat day
 * - Comfort floor (never go too low)
 * - Ceiling cap (never go unreasonably high)
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
    // STEP 1: Get weekly period
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

    const weeklyBudget    = weeklyPeriod.weekly_budget;
    const weekEndDate     = weeklyPeriod.week_end_date;
    const cumulativeOverage = weeklyPeriod.cumulative_overage || 0;
    const dailyBase       = weeklyBudget / 7;

    // STEP 2: Check if today is a cheat day
    const { data: todayCheatDay } = await supabase
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .eq('cheat_date', date)
      .maybeSingle();

    const isCheatDay      = !!todayCheatDay;
    const cheatDayCalories = todayCheatDay?.planned_calories;

    if (isCheatDay) {
      console.log(`🎉 Today is a cheat day: ${cheatDayCalories} cal (no adjustment)`);
      return {
        baseBudget: Math.round(dailyBase),
        adjustment: 0,
        adjustedBudget: cheatDayCalories || Math.round(dailyBase),
        isCheatDay: true,
        cheatDayCalories,
        remainingRegularDays: 0,
        cumulativeOverage,
      };
    }

    // STEP 3: Get remaining future cheat days
    const { data: futureCheatDays } = await supabase
      .from('planned_cheat_days')
      .select('*')
      .eq('user_id', userId)
      .gt('cheat_date', date)
      .lte('cheat_date', weekEndDate);

    const futureCheatDaysCount = futureCheatDays?.length || 0;

    // STEP 4: Calculate remaining regular days
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = new Date(weekEndDate);

    const totalRemainingDays = Math.max(0,
      Math.ceil((endDate.getTime() - tomorrow.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const remainingRegularDays = Math.max(1, totalRemainingDays - futureCheatDaysCount);

    console.log(`📊 Remaining days: ${totalRemainingDays} total, ${futureCheatDaysCount} cheat, ${remainingRegularDays} regular`);

    // STEP 5: Calculate adjustment
    // Positive cumulative → reduce today's budget
    // Negative cumulative → increase today's budget
    const adjustment    = Math.round(cumulativeOverage / (remainingRegularDays + 1));
    let adjustedBudget  = dailyBase - adjustment;

    // Floor — never go below comfort minimum
    const comfortFloor  = calculateComfortFloor(userGoal, userGender);
    adjustedBudget      = Math.max(adjustedBudget, comfortFloor);

    // Ceiling — never go above 150% of daily base (prevents unreasonable boosts)
    const ceilingBudget = Math.round(dailyBase * 1.5);
    adjustedBudget      = Math.min(adjustedBudget, ceilingBudget);

    console.log(`💰 Today's budget: ${Math.round(dailyBase)} - ${adjustment} = ${Math.round(adjustedBudget)} cal (floor: ${comfortFloor}, ceiling: ${ceilingBudget})`);

    return {
      baseBudget: Math.round(dailyBase),
      adjustment: -adjustment,
      adjustedBudget: Math.round(adjustedBudget),
      isCheatDay: false,
      remainingRegularDays,
      cumulativeOverage,
    };

  } catch (error) {
    console.error('Error in getTodaysAdjustedBudget:', error);
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