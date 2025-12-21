import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { supabase } from '@/lib/supabase';
import { ContinueButton } from '@/components/onboarding/continueButton';

export default function CompleteScreen() {
  const { data } = useOnboarding();

  // Save onboarding data to database
  useEffect(() => {
    saveOnboardingData();
  }, []);

  const saveOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        return;
      }

      // Calculate age from birth date
      const birthDate = new Date(
        data.birthYear || 1990,
        (data.birthMonth || 1) - 1,
        data.birthDay || 1
      );
      const age = new Date().getFullYear() - birthDate.getFullYear();

      // Convert height to inches
      const heightInches = (data.heightFeet || 0) * 12 + (data.heightInches || 0);

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          gender: data.gender,
          birth_date: birthDate.toISOString().split('T')[0],
          unit_system: 'imperial',
          height_ft: data.heightFeet,
          height_in: data.heightInches,
          weight_lbs: data.currentWeight,
          target_weight_lbs: data.goalWeight,
          goal: data.goal,
          workouts_per_week: data.workoutFrequency,
          activity_level: data.activityLevel,
          baseline_start_date: new Date().toISOString().split('T')[0],
          baseline_complete: false,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving profile:', error);
      }
    } catch (error) {
      console.error('Error in saveOnboardingData:', error);
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>You're all set.</Text>
        <Text style={styles.subtitle}>Eat normally this week.</Text>
        <Text style={styles.subtitle}>HAVEN is just learning.</Text>
        <Text style={styles.subtitle}>Your plan starts after Day 7.</Text>

        {/* Placeholder for illustration */}
        <View style={styles.illustration}>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ContinueButton 
        onPress={handleGoHome}
        text="Go Home"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 18,
    color: '#3D5A5C',
    lineHeight: 28,
  },
  illustration: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 48,
  },
  placeholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#E09B7B',
    borderRadius: 24,
  },
});