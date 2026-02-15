
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@haven/shared-utils';

export default function CreateTrainerProfileScreen() {
  useEffect(() => {
    createTrainerProfile();
  }, []);

  const createTrainerProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      // Create trainer profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          user_type: 'trainer',
          onboarding_completed: true,
          gender: "",
          birth_date: null,
          unit_system: "",
          height_ft: null,
          height_in: null,
          weight_lbs: null,
          target_weight_lbs: null,
          weekly_weight_goal: null,
          goal:"",
          workouts_per_week: null,
          activity_level: "",
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // Generate invite code
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const inviteCode = `COACH-${randomCode}`;

      const { error: inviteError } = await supabase
        .from('trainer_invites')
        .insert({
          trainer_id: user.id,
          invite_code: inviteCode,
        });

      if (inviteError) throw inviteError;

      // Navigate to home
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Error creating trainer profile:', error);
      Alert.alert('Error', error.message || 'Failed to create trainer profile');
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#206E6B" />
        <Text style={styles.text}>Setting up your trainer account...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#206E6B',
    fontWeight: '500',
  },
});