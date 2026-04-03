
import { useEffect, useState } from 'react';
import { supabase } from '@haven/shared-utils';
import { getLocalDateString, getYesterdayDateString } from '@/utils/timezone';
import { 
  calculateAndDistributeOverage, 
  getTodaysAdjustedBudget 
} from '@/utils/cheatDayHelpers';

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

        const today           = getLocalDateString();
        const yesterdayString = getYesterdayDateString();

        // STEP 1: Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('goal, gender')
          .eq('id', user.id)
          .single();

        if (!profile || !isMounted) return;

        const userGoal   = profile.goal   || 'maintain';
        const userGender = profile.gender || 'male';

        // STEP 2: Get current weekly period
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

        // STEP 3: Same-day guard — only recalculate once per day
        if (weeklyPeriod.last_overage_calculated_date !== today) {

          // STEP 4: Check if yesterday has any logged data
          const { data: yesterdaySummary } = await supabase
            .from('daily_summaries')
            .select('calories_consumed')
            .eq('user_id', user.id)
            .eq('summary_date', yesterdayString)
            .maybeSingle();

          if (yesterdaySummary && yesterdaySummary.calories_consumed > 0) {

            // STEP 5: Check if user manually adjusted remaining days
            const { data: existingAdjustments } = await supabase
              .from('daily_target_adjustments')
              .select('target_date')
              .eq('user_id', user.id)
              .eq('weekly_period_id', weeklyPeriod.id)
              .gte('target_date', today);

            const userAlreadyAdjusted = existingAdjustments && existingAdjustments.length > 0;

            if (userAlreadyAdjusted) {
              console.log('✅ User already manually adjusted — skipping auto-distribution');
            } else {
              // STEP 6: Always run full recalculation
              // Threshold filtering happens inside calculateAndDistributeOverage
              console.log('🔄 Running full weekly recalculation...');

              const overageResult = await calculateAndDistributeOverage(
                user.id,
                weeklyPeriod.id,
                today
              );

              if (!overageResult.success) {
                console.error('❌ Failed to calculate overage:', overageResult.error);
              } else {
                // STEP 6b: Write today's adjusted target so home + plan tab stay in sync
                const adjustedBudget = await getTodaysAdjustedBudget(
                  user.id,
                  today,
                  userGoal,
                  userGender
                );

                if (adjustedBudget.adjustedBudget !== adjustedBudget.baseBudget) {
                  await supabase
                    .from('daily_target_adjustments')
                    .upsert({
                      user_id:           user.id,
                      weekly_period_id:  weeklyPeriod.id,
                      target_date:       today,
                      adjusted_calories: adjustedBudget.adjustedBudget,
                    }, { onConflict: 'user_id,target_date' });

                  console.log(`✅ Written today's adjusted target: ${adjustedBudget.adjustedBudget} cal`);
                }
              }
            }
          } else {
            console.log('⏭️ No data for yesterday, skipping recalculation');
          }

          // Mark today as calculated regardless of outcome
          await supabase
            .from('weekly_periods')
            .update({ last_overage_calculated_date: today })
            .eq('id', weeklyPeriod.id);

        } else {
          console.log('✅ Overage already calculated today, skipping');
        }

        // STEP 7: Get today's adjusted budget for display
        const adjustedBudget = await getTodaysAdjustedBudget(
          user.id,
          today,
          userGoal,
          userGender
        );
        console.log('🔔 Final result:', {
          baseBudget: adjustedBudget.baseBudget,
          adjustedBudget: adjustedBudget.adjustedBudget,
          cumulativeOverage: adjustedBudget.cumulativeOverage,
        });

        if (!isMounted) return;
        setResult({ ...adjustedBudget, isLoading: false });

      } catch (error) {
        console.error('Error in useOverageCalculation:', error);
        if (isMounted) setResult(prev => ({ ...prev, isLoading: false }));
      }
    };

    calculateOverageAndBudget();

    return () => { isMounted = false; };
  }, []);

  return result;
}