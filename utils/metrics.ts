import { supabase } from '@/lib/supabase';

export async function calculateMetrics() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('calculateMetrics', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    // LOG THE FULL RESPONSE
    console.log('Edge Function Response:', JSON.stringify({ data, error }, null, 2));

    if (error) {
      console.error('Edge Function Error Details:', error);
      throw error;
    }

    if (!data?.success) {
      console.error('Edge Function Returned Error:', data);
      throw new Error(data?.error || 'Failed to calculate metrics');
    }

    return data.data;
  } catch (error) {
    console.error('Error calculating metrics:', error);
    throw error;
  }
}