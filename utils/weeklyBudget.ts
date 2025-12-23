import { supabase } from '@/lib/supabase'; // Your Supabase client

export async function calculateWeeklyBudget() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/calculateWeeklyBudget`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to calculate weekly budget');
    }

    return result.data;
  } catch (error) {
    console.error('Error calculating weekly budget:', error);
    throw error;
  }
}