import { supabase } from '@haven/shared-utils';

/**
 * Adjusts user's calorie budget after workout completion
 * Adds burned calories to today's budget retroactively
 * Updates both daily summary and weekly metrics
 * 
 * @param userId - User's ID
 * @param date - Date of the workout (YYYY-MM-DD)
 * @param caloriesBurned - Calories burned from workout
 */
export async function adjustCaloriesForWorkout(
  userId: string,
  date: string,
  caloriesBurned: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔥 Adjusting budget: ${caloriesBurned} cal on ${date}`);

    // Step 1: Update daily_summaries with calories burned
    const { data: existingSummary, error: fetchError } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('summary_date', date)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching daily summary:', fetchError);
      return { success: false, error: 'Failed to fetch daily summary' };
    }

    // If no summary exists for today, create one
    if (!existingSummary) {
      const { error: insertError } = await supabase
        .from('daily_summaries')
        .insert({
          user_id: userId,
          summary_date: date,
          calories_consumed: 0,
          calories_burned: caloriesBurned,
        });

      if (insertError) {
        console.error('Error creating daily summary:', insertError);
        return { success: false, error: 'Failed to create daily summary' };
      }

      console.log('✅ Created daily summary with workout calories');
    } else {
      // Update existing summary
      const { error: updateError } = await supabase
        .from('daily_summaries')
        .update({
          calories_burned: caloriesBurned,
        })
        .eq('user_id', userId)
        .eq('summary_date', date);

      if (updateError) {
        console.error('Error updating daily summary:', updateError);
        return { success: false, error: 'Failed to update daily summary' };
      }

      console.log('✅ Updated daily summary with workout calories');
    }

    // Step 2: Find which weekly period this date belongs to
    const { data: weeklyPeriod, error: periodError } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('user_id', userId)
      .lte('week_start_date', date)
      .gte('week_end_date', date)
      .maybeSingle();

    if (periodError) {
      console.error('Error fetching weekly period:', periodError);
      return { success: false, error: 'Failed to fetch weekly period' };
    }

    if (!weeklyPeriod) {
      console.warn('⚠️ No weekly period found for this date');
      // Not critical - user might not be in active tracking yet
      return { success: true };
    }

    // Step 3: Recalculate weekly metrics
    // Get all daily summaries for this week
    const { data: weekSummaries, error: weekError } = await supabase
      .from('daily_summaries')
      .select('calories_consumed, calories_burned')
      .eq('user_id', userId)
      .gte('summary_date', weeklyPeriod.week_start_date)
      .lte('summary_date', weeklyPeriod.week_end_date);

    if (weekError) {
      console.error('Error fetching week summaries:', weekError);
      return { success: false, error: 'Failed to fetch week summaries' };
    }

    // Calculate total consumed and burned for the week
    const totalConsumed = weekSummaries?.reduce((sum, day) => sum + (day.calories_consumed || 0), 0) || 0;
    const totalBurned = weekSummaries?.reduce((sum, day) => sum + (day.calories_burned || 0), 0) || 0;

    // Net calories = consumed - burned
    const netCalories = totalConsumed - totalBurned;

    // Remaining = weekly budget - net calories
    const remaining = weeklyPeriod.weekly_budget - netCalories;

    console.log(`📊 Week totals: consumed ${totalConsumed}, burned ${totalBurned}, net ${netCalories}`);
    console.log(`💰 Weekly budget: ${weeklyPeriod.weekly_budget}, remaining: ${remaining}`);

    // Step 4: Update or create weekly_metrics
    const { data: existingMetric, error: metricFetchError } = await supabase
    .from('weekly_metrics')
    .select('*')
    .eq('weekly_period_id', weeklyPeriod.id)
    .order('created_at', { ascending: false }) // Get most recent first
    .limit(1)
    .maybeSingle();

    if (metricFetchError) {
      console.error('Error fetching weekly metrics:', metricFetchError);
      return { success: false, error: 'Failed to fetch weekly metrics' };
    }

    if (!existingMetric) {
      // Create new metric record
      const { error: insertMetricError } = await supabase
        .from('weekly_metrics')
        .insert({
          user_id: userId,
          weekly_period_id: weeklyPeriod.id,
          calculated_date: new Date().toISOString().split('T')[0],
          total_consumed: totalConsumed,
          total_remaining: remaining,
          calories_reserved: 0, // Update if you have cheat days logic
        });

      if (insertMetricError) {
        console.error('Error creating weekly metrics:', insertMetricError);
        return { success: false, error: 'Failed to create weekly metrics' };
      }

      console.log('✅ Created weekly metrics');
    } else {
      // Update existing metric record
      const { error: updateMetricError } = await supabase
        .from('weekly_metrics')
        .update({
          calculated_date: new Date().toISOString().split('T')[0],
          total_consumed: totalConsumed,
          total_remaining: remaining,
        })
        .eq('id', existingMetric.id);

      if (updateMetricError) {
        console.error('Error updating weekly metrics:', updateMetricError);
        return { success: false, error: 'Failed to update weekly metrics' };
      }

      console.log('✅ Updated weekly metrics');
    }

    console.log(`✅ Budget adjustment complete: ${remaining} cal remaining`);

    return { success: true };
  } catch (error) {
    console.error('Error in adjustCaloriesForWorkout:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}