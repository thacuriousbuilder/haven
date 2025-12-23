import { supabase } from '@/lib/supabase';

export interface BaselineProgress {
  totalDays: number;
  daysLogged: number;
  isComplete: boolean;
  averageCalories: number | null;
  startDate: string | null;
}

export async function checkBaselineProgress(userId: string): Promise<BaselineProgress> {
  try {
    // Get user's baseline start date
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('baseline_start_date, baseline_complete, baseline_avg_daily_calories')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return {
        totalDays: 0,
        daysLogged: 0,
        isComplete: false,
        averageCalories: null,
        startDate: null,
      };
    }

    // If already marked complete, return that
    if (profile.baseline_complete) {
      return {
        totalDays: 7,
        daysLogged: 7,
        isComplete: true,
        averageCalories: profile.baseline_avg_daily_calories,
        startDate: profile.baseline_start_date,
      };
    }

    if (!profile.baseline_start_date) {
      return {
        totalDays: 0,
        daysLogged: 0,
        isComplete: false,
        averageCalories: null,
        startDate: null,
      };
    }

    // Calculate days since baseline started
    const startDate = new Date(profile.baseline_start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - startDate.getTime();
    const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const totalDays = Math.min(daysSinceStart, 7);

    // Generate array of baseline dates (7 days starting from baseline_start_date)
    const baselineDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      baselineDates.push(date.toISOString().split('T')[0]);
    }

    console.log('Baseline dates to check:', baselineDates);

    // Get all check-ins for baseline period
    const { data: checkIns, error: checkInsError } = await supabase
      .from('check_ins')
      .select('check_in_date, day_type')
      .eq('user_id', userId)
      .in('check_in_date', baselineDates);

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
    }

    console.log('Check-ins found:', checkIns);

    // Get dates that were marked as "off_day" - we DON'T exclude these from counting
    // Off days still count toward the 7 days, we just note them
    const offDays = new Set(
      (checkIns || [])
        .filter(ci => ci.day_type === 'off_day')
        .map(ci => ci.check_in_date)
    );

    console.log('Off days:', Array.from(offDays));

    // Get all food logs for baseline period
    const { data: foodLogs, error: foodLogsError } = await supabase
      .from('food_logs')
      .select('log_date, calories')
      .eq('user_id', userId)
      .in('log_date', baselineDates);

    if (foodLogsError) {
      console.error('Error fetching food logs:', foodLogsError);
    }

    console.log('Food logs found:', foodLogs);

    // Count unique days with food logs
    const daysWithLogs = new Set(
      (foodLogs || []).map(log => log.log_date)
    );

    console.log('Unique days with logs:', Array.from(daysWithLogs));

    const daysLogged = daysWithLogs.size;

    console.log('Total days logged:', daysLogged);

    // Check if baseline is complete (7 days logged)
    const isComplete = daysLogged >= 7;

    // Calculate average calories if complete
    let averageCalories: number | null = null;
    if (isComplete && foodLogs) {
      // Only average logs that have calorie data and aren't off days
      const logsWithCalories = foodLogs.filter(
        log => log.calories != null && !offDays.has(log.log_date)
      );
      
      console.log('Logs with calories (excluding off days):', logsWithCalories);
      
      if (logsWithCalories.length > 0) {
        const totalCalories = logsWithCalories.reduce(
          (sum, log) => sum + (log.calories || 0),
          0
        );
        averageCalories = Math.round(totalCalories / logsWithCalories.length);
        console.log('Average calories:', averageCalories);
      }
    }

    return {
      totalDays,
      daysLogged,
      isComplete,
      averageCalories,
      startDate: profile.baseline_start_date,
    };
  } catch (error) {
    console.error('Error checking baseline progress:', error);
    return {
      totalDays: 0,
      daysLogged: 0,
      isComplete: false,
      averageCalories: null,
      startDate: null,
    };
  }
}

export async function completeBaseline(userId: string, averageCalories: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        baseline_complete: true,
        baseline_avg_daily_calories: averageCalories,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error completing baseline:', error);
      return false;
    }

    console.log('Baseline marked complete with average:', averageCalories);
    return true;
  } catch (error) {
    console.error('Error in completeBaseline:', error);
    return false;
  }
}