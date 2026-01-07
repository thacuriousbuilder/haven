import { supabase } from '@/lib/supabase';
import { getLocalDateString } from './timezone';

export async function calculateMetrics() {
  try {
    const calculationDate = getLocalDateString();
    
    console.log('🔢 Calling calculateMetrics with date:', calculationDate);
    
    const { data, error } = await supabase.functions.invoke('calculateMetrics', {
      body: {
        calculation_date: calculationDate,
      },
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw error;
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to calculate metrics');
    }

    return data.data;
  } catch (error) {
    console.error('Error calculating metrics:', error);
    throw error;
  }
}