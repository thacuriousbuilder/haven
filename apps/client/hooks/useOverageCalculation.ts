
import { useEffect, useState } from 'react';
import { supabase } from '@haven/shared-utils';
import { getLocalDateString, getYesterdayDateString } from '@/utils/timezone';
import { 
  calculateAndDistributeOverage, 
  getTodaysAdjustedBudget 
} from '@/utils/cheatDayHelpers';

const OVERAGE_THRESHOLD = 150;

interface AdjustedBudgetResult {
  baseBudget: number;
  adjustment: number;
  adjustedBudget: number;
  isCheatDay: boolean;
  cheatDayCalories?: number;
  remainingRegularDays: number;
  cumulativeOverage: number;
  isLoading: boolean;
}

export function useOverageCalculation(): AdjustedBudgetResult {
  const [result, setResult] = useState<AdjustedBudgetResult>({
    baseBudget: 0,
    adjustment: 0,
    adjustedBudget: 0,
    isCheatDay: false,
    remainingRegularDays: 0,
    cumulativeOverage: 0,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const calculateOverageAndBudget = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const today = getLocalDateString();
        const yesterdayString = getYesterdayDateString();

        // ============================================
        // STEP 1: Get user profile
        // ============================================
        const { data: profile } = await supabase
          .from('profiles')
          .select('goal, gender')
          .eq('id', user.id)
          .single();

        if (!profile || !isMounted) return;

        const userGoal = profile.goal || 'maintain';
        const userGender = profile.gender || 'male';

        // ============================================
        // STEP 2: Get current weekly period
        // ============================================
        const { data: weeklyPeriod } = await supabase
          .from('weekly_periods')
          .select('*')
          .eq('user_id', user.id)
          .lte('week_start_date', today)
          .gte('week_end_date', today)
          .single();

        if (!weeklyPeriod || !isMounted) {
          setResult(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // ============================================
        // STEP 3: Same-day guard
        // ============================================
        if (weeklyPeriod.last_overage_calculated_date !== today) {

          // ============================================
          // STEP 4: Fetch yesterday's consumption
          // ============================================
          const { data: yesterdaySummary } = await supabase
            .from('daily_summaries')
            .select('calories_consumed, calories_burned')
            .eq('user_id', user.id)
            .eq('summary_date', yesterdayString)
            .maybeSingle();

          if (yesterdaySummary && yesterdaySummary.calories_consumed > 0) {
            // Was yesterday a cheat day?
            const { data: yesterdayCheatDay } = await supabase
              .from('planned_cheat_days')
              .select('planned_calories')
              .eq('user_id', user.id)
              .eq('cheat_date', yesterdayString)
              .maybeSingle();

            const dailyBase = weeklyPeriod.weekly_budget / 7;
            const yesterdayBudget = yesterdayCheatDay?.planned_calories ?? dailyBase;
            const netConsumed = (yesterdaySummary.calories_consumed || 0)
                              - (yesterdaySummary.calories_burned || 0);
            const delta = netConsumed - yesterdayBudget;

            // ============================================
            // STEP 5: Apply 150 cal threshold
            // ============================================
            if (Math.abs(delta) > OVERAGE_THRESHOLD) {
              console.log(`🔄 Delta ${Math.round(delta)} cal exceeds threshold, recalculating...`);

              const overageResult = await calculateAndDistributeOverage(
                user.id,
                weeklyPeriod.id,
                today
              );

              if (!overageResult.success) {
                console.error('❌ Failed to calculate overage:', overageResult.error);
              }
            } else {
              console.log(`✅ Delta ${Math.round(delta)} cal within threshold, no adjustment needed`);
            }
          }

          // Mark today as calculated regardless of threshold outcome
          await supabase
            .from('weekly_periods')
            .update({ last_overage_calculated_date: today })
            .eq('id', weeklyPeriod.id);
        } else {
          console.log('✅ Overage already calculated today, skipping');
        }

        // ============================================
        // STEP 6: Get today's adjusted budget
        // ============================================
        const adjustedBudget = await getTodaysAdjustedBudget(
          user.id,
          today,
          userGoal,
          userGender
        );

        if (!isMounted) return;

        setResult({ ...adjustedBudget, isLoading: false });

      } catch (error) {
        console.error('Error in useOverageCalculation:', error);
        if (isMounted) setResult(prev => ({ ...prev, isLoading: false }));
      }
    };

    calculateOverageAndBudget();

    return () => {
      isMounted = false;
    };
  }, []);

  return result;
}