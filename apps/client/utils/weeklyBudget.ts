
import { supabase } from '@/lib/supabase';

export async function calculateWeeklyBudget(manualBudget?: number) {
  try {
    const body = manualBudget 
      ? { manual_weekly_budget: manualBudget }
      : {};

    const { data, error } = await supabase.functions.invoke('calculateWeeklyBudget', {
      body,
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw error;
    }

    if (!data?.success) {
      const errorMsg = data?.error || 'Failed to calculate weekly budget';
      
      // If period already exists, that's OK
      if (data?.data?.already_exists) {
        return data.data;
      }
      
      throw new Error(errorMsg);
    }

    return data.data;
  } catch (error) {
    console.error('Error calculating weekly budget:', error);
    throw error;
  }
}