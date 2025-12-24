import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';
import { WorkoutFrequency } from '@/types/onboarding';

export default function WorkoutsScreen() {
  const { data, updateData } = useOnboarding();

  const handleContinue = () => {
    if (data.workoutFrequency) {
      router.push('/(onboarding)/goal');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={5} totalSteps={15} />
      
      <View style={styles.content}>
    
        <Text style={styles.title}>How many workouts do you do per week?</Text>
        <Text style={styles.description}>This will be use to tailor your plan.</Text>

        <View style={styles.options}>
          <OptionCard
            title="0-2"
            description="Workout now and then"
            selected={data.workoutFrequency === '0-2'}
            onPress={() => updateData({ workoutFrequency: '0-2' })}
          />
          <OptionCard
            title="3-5"
            description="A few workouts per week"
            selected={data.workoutFrequency === '3-5'}
            onPress={() => updateData({ workoutFrequency: '3-5' })}
          />
          <OptionCard
            title="6+"
            description="Dedicated Athlete"
            selected={data.workoutFrequency === '6+'}
            onPress={() => updateData({ workoutFrequency: '6+' })}
          />
        </View>
      </View>

      <ContinueButton
        onPress={handleContinue}
        disabled={!data.workoutFrequency}
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
    paddingTop: 32,
  },
  subtitle: {
    fontSize: 16,
    color: '#3D5A5C',
    fontWeight: '600',
    lineHeight: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginTop: 32,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  options: {
    marginTop: 8,
  },
});