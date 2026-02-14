
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { BackButton } from '@/components/onboarding/backButton';
import { WorkoutFrequency } from '@/types/onboarding';

export default function WorkoutsScreen() {
  const { data, updateData } = useOnboarding();

  const handleSelectWorkout = (frequency: WorkoutFrequency) => {
    updateData({ workoutFrequency: frequency });
  };

  const handleContinue = () => {
    if (!data.workoutFrequency) {
      Alert.alert('Selection Required', 'Please select your workout frequency to continue');
      return;
    }
    router.push('/(onboarding)/activityLevel');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={10} totalSteps={15} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>How many workouts do you do per week?</Text>
          <Text style={styles.description}>This will be use to tailor your plan.</Text>

          <View style={styles.options}>
            <OptionCard
              title="0-2"
              description="Workout now and then"
              selected={data.workoutFrequency === '0-2'}
              onPress={() => handleSelectWorkout('0-2')}
            />
            <OptionCard
              title="3-5"
              description="A few workouts per week"
              selected={data.workoutFrequency === '3-5'}
              onPress={() => handleSelectWorkout('3-5')}
            />
            <OptionCard
              title="6+"
              description="Dedicated Athlete"
              selected={data.workoutFrequency === '6+'}
              onPress={() => handleSelectWorkout('6+')}
            />
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !data.workoutFrequency && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!data.workoutFrequency}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131311',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 24,
    lineHeight: 20,
  },
  options: {
    gap: 16,
  },
  buttonContainer: {
    paddingBottom: 24,
    paddingTop: 16,
  },
  continueButton: {
    backgroundColor: '#206E6B',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});