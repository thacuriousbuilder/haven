import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import { getLocalDateString, utcToLocalDateString } from '@haven/shared-utils';

const CHECK_IN_HOUR = 6;

// Module-level flag — shared across all instances, no ref needed
let isModalOpen = false;

export function resetCheckInModal() {
  isModalOpen = false;
}

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
      // GATE 0: Modal already open?
      if (isModalOpen) {
        console.log('🔒 Check-in modal already open, skipping');
        return;
      }

      const currentHour = new Date().getHours();
      if (currentHour < CHECK_IN_HOUR) {
        console.log('⏰ Too early for check-in prompt');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = getLocalDateString();

      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, baseline_start_date, baseline_completion_at')
        .eq('id', user.id)
        .single();

      if (profile?.created_at) {
        const signupDate = utcToLocalDateString(profile.created_at);
        if (signupDate === today) {
          console.log('🆕 Signup day — skipping check-in prompt');
          return;
        }
      }

      const isBaselineUser = profile?.baseline_start_date && !profile?.baseline_completion_at;
      if (isBaselineUser && profile.baseline_start_date === today) {
        console.log('📅 Baseline day 1 — skipping check-in prompt');
        return;
      }

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

      console.log('🔔 Prompting daily check-in');
      isModalOpen = true;
      router.push('/dailyCheckin');

    } catch (error) {
      console.error('Error in useDailyCheckIn:', error);
    }
  };
}