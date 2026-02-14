import { supabase } from '@/lib/supabase';
import { getLocalDateString } from './timezone';

export async function calculateMetrics() {
  try {
    const calculationDate = getLocalDateString();
    
    console.log('🔢 Calling calculateMetrics with date:', calculationDate);
    console.log('🔢 Timestamp:', new Date().toISOString());
    
    const { data, error } = await supabase.functions.invoke('calculateMetrics', {
      body: {
        calculation_date: calculationDate,
      },
    });

    console.log('📊 Raw response:', { data, error });

    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    if (!data?.success) {
      console.error('❌ Data check failed:', data);
      throw new Error(data?.error || 'Failed to calculate metrics');
    }

    console.log('✅ Metrics success:', data.data);
    return data.data;
  } catch (error) {
    console.error('💥 Error calculating metrics:', error);
    throw error;
  }
}