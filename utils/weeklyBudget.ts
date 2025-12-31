

import { supabase } from '@/lib/supabase';

export async function calculateWeeklyBudget() {
  try {
    console.log('=== CALCULATE WEEKLY BUDGET ===');
    
    const { data, error } = await supabase.functions.invoke('calculateWeeklyBudget');

    if (error) {
      console.error('Edge Function error:', error);
      throw error;
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to calculate weekly budget');
    }

    console.log('Weekly budget created successfully:', data.data);
    return data.data;
  } catch (error) {
    console.error('Error calculating weekly budget:', error);
    throw error;
  }
}