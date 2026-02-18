
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserAndRoute = async (userId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(onboarding)/gender');
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkUserAndRoute(session.user.id);
      } else {
        router.replace('/(auth)/welcome');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkUserAndRoute(session.user.id);
      } else {
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