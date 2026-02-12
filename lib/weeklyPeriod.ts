

import { supabase } from './supabase';

interface CreatePeriodResult {
  success: boolean;
  period_id?: string;
  reason?: 'created' | 'already_exists' | 'no_baseline_data';
  error?: string;
}

/**
 * Create a weekly period for the current user
 * Call this after baseline completion or manual plan onboarding
 */
export async function createWeeklyPeriodForUser(
  userId: string
): Promise<CreatePeriodResult> {
  try {
    console.log('🎯 Creating weekly period for user:', userId);

    const { data, error } = await supabase.functions.invoke('createUserPeriod', {
      body: { user_id: userId },
    });

    if (error) {
      console.error('❌ Error calling edge function:', error);
      return {
        success: false,
        error: error.message || 'Failed to create weekly period',
      };
    }

    console.log('✅ Period creation response:', data);

    return {
      success: data.success,
      period_id: data.period_id,
      reason: data.reason,
      error: data.error,
    };

  } catch (error) {
    console.error('❌ Error in createWeeklyPeriodForUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}