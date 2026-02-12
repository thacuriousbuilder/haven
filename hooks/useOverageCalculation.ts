import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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

/**
 * Custom hook that:
 * 1. Calculates overage when user opens app on a new day
 * 2. Returns today's adjusted budget
 * 3. Handles all the timing logic automatically
 */
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

        // ============================================
        // STEP 1: Get user profile for comfort floor
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
          console.log('⚠️ No active weekly period found');
          setResult(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // ============================================
        // STEP 3: Check if we need to recalculate overage
        // ============================================
        
        // Check yesterday's date to see if we've already calculated for today
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = getYesterdayDateString();

        // Only recalculate if there's consumption data from yesterday
        // This prevents unnecessary calculations on the same day
        const { data: yesterdaySummary } = await supabase
          .from('daily_summaries')
          .select('calories_consumed')
          .eq('user_id', user.id)
          .eq('summary_date', yesterdayString)
          .maybeSingle();

        if (yesterdaySummary && yesterdaySummary.calories_consumed > 0) {
          console.log('🔄 Recalculating overage for new day...');
          
          // Calculate and distribute overage
          const overageResult = await calculateAndDistributeOverage(
            user.id,
            weeklyPeriod.id,
            today
          );

          if (!overageResult.success) {
            console.error('❌ Failed to calculate overage:', overageResult.error);
          }
        } else {
          console.log('✅ No new consumption data, using existing overage calculation');
        }

        // ============================================
        // STEP 4: Get today's adjusted budget
        // ============================================
        
        const adjustedBudget = await getTodaysAdjustedBudget(
          user.id,
          today,
          userGoal,
          userGender
        );

        if (!isMounted) return;

        setResult({
          ...adjustedBudget,
          isLoading: false,
        });

        console.log('✅ Overage calculation complete:', adjustedBudget);

      } catch (error) {
        console.error('Error in useOverageCalculation:', error);
        if (isMounted) {
          setResult(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    calculateOverageAndBudget();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Run once when component mounts

  return result;
}