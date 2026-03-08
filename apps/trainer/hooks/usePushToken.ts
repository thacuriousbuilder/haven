
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '@haven/shared-utils';

export function usePushToken() {
  useEffect(() => {
    // Try immediately with existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        registerAndSaveToken(session.user.id);
      }
    });

    // Also listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          registerAndSaveToken(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
}

async function registerAndSaveToken(userId: string) {
  if (!Device.isDevice) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '7fd8fa84-24d6-4bc0-a620-aecabd8b5717',
  });

  const token = tokenData.data;
  if (!token) return;

  const { error } = await supabase
    .from('profiles')
    .update({
      expo_push_token: token,
      push_token_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('❌ Failed to save token:', error.message);
  }
}