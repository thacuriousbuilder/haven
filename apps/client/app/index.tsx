

import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialCheckDone = false;

    const checkUserAndRoute = async (userId: string) => {
      console.log('checkUserAndRoute called for:', userId);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      console.log('profile:', JSON.stringify(profile));
      console.log('error:', JSON.stringify(error));

      if (profile?.onboarding_completed) {
        console.log('routing to home');
        router.replace('/(tabs)/home');
      } else {
        // No profile or onboarding incomplete — go to welcome
        // Mid-flow signups are handled by the onboarding screens directly
        console.log('routing to welcome');
        router.replace('/(auth)/welcome');
      }
    };

    // Only runs on app open — checks existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkUserAndRoute(session.user.id);
      } else {
        router.replace('/(auth)/welcome');
      }
      setLoading(false);
      initialCheckDone = true;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initialCheckDone) return;

      // SIGNED_IN during mid-flow onboarding is handled by signup.tsx directly
      // Only handle SIGNED_OUT here
      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/welcome');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#206E6B" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#131311',
  },
});