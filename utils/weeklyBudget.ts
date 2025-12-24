// utils/weeklyBudget.ts - ALTERNATIVE VERSION

import { supabase } from '@/lib/supabase';

export async function calculateWeeklyBudget() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Not authenticated');
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const url = `${supabaseUrl}/functions/v1/calculateWeeklyBudget`;

    console.log('Calling Edge Function:', url);
    console.log('Token length:', session.access_token.length);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);

    if (!response.ok) {
      throw new Error(`Edge Function failed: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);

    if (!result?.success) {
      throw new Error(result?.error || 'Failed to calculate weekly budget');
    }

    console.log('Weekly budget created successfully:', result.data);
    return result.data;
  } catch (error) {
    console.error('Error calculating weekly budget:', error);
    throw error;
  }
}