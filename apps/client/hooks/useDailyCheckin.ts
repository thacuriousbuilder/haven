

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import { getLocalDateString } from '@haven/shared-utils';

const CHECK_IN_HOUR = 6;

export function useDailyCheckIn() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkAndPrompt();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        checkAndPrompt();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  const checkAndPrompt = async () => {
    try {
      // GATE 1: Time check
      const currentHour = new Date().getHours();
      if (currentHour < CHECK_IN_HOUR) {
        console.log('⏰ Too early for check-in prompt');
        return;
      }

      // GATE 2: Auth check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // GATE 3: Already checked in today?
      const today = getLocalDateString();

      const { data: existingCheckIn } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', user.id)
        .eq('check_in_date', today)
        .maybeSingle();

      if (existingCheckIn) {
        console.log('✅ Already checked in today, skipping prompt');
        return;
      }

      // All gates passed — show the modal
      console.log('🔔 Prompting daily check-in');
      router.push('/dailyCheckin');

    } catch (error) {
      console.error('Error in useDailyCheckIn:', error);
    }
  };
}