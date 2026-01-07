
import { supabase } from '@/lib/supabase';

export async function calculateMetrics() {
  try {
    const { data, error } = await supabase.functions.invoke('calculateMetrics');

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