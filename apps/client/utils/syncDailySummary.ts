
import { supabase } from '@haven/shared-utils';

/**
 * Recomputes daily_summaries.calories_consumed for a given user + date
 * by summing all remaining food_logs. Call this after any food log delete.
 */
export async function syncDailySummaryAfterDelete(
  userId: string,
  logDate: string // 'YYYY-MM-DD'
): Promise<void> {
  try {
    // 1. Sum remaining food_logs for this date
    const { data: logs, error: logsError } = await supabase
      .from('food_logs')
      .select('calories')
      .eq('user_id', userId)
      .eq('log_date', logDate);

    if (logsError) {
      console.error('❌ syncDailySummary: failed to fetch logs', logsError);
      return;
    }

    const newTotal = (logs || []).reduce(
      (sum, log) => sum + (log.calories || 0),
      0
    );

    console.log(`🔄 Syncing daily summary for ${logDate}: ${newTotal} cal`);

    if (newTotal === 0) {
      // No logs left for this day — delete the summary row entirely
      await supabase
        .from('daily_summaries')
        .delete()
        .eq('user_id', userId)
        .eq('summary_date', logDate);
    } else {
      // Upsert with the correct recalculated total
      await supabase
        .from('daily_summaries')
        .upsert(
          { user_id: userId, summary_date: logDate, calories_consumed: newTotal },
          { onConflict: 'user_id,summary_date' }
        );
    }

    console.log(`✅ daily_summaries synced for ${logDate}`);
  } catch (err) {
    console.error('❌ syncDailySummaryAfterDelete error:', err);
  }
}