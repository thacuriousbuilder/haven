

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { useOnboarding } from '@/contexts/onboardingContext';
import { WeeklyGoalRate } from '@/types/onboarding';

const GOAL_OPTIONS: WeeklyGoalRate[] = [0.5, 1, 1.5, 2];

export default function WeeklyGoalScreen() {
  const { data, updateData } = useOnboarding();
  const [selectedGoal, setSelectedGoal] = useState<WeeklyGoalRate | null>(data.weeklyGoalRate);


  const weightUnit = data.unitSystem === 'metric' ? 'kg' : 'lbs';

  const handleSelectGoal = (goal: WeeklyGoalRate) => {
    setSelectedGoal(goal);
  };

  const handleContinue = () => {
    if (selectedGoal) {
      updateData({ weeklyGoalRate: selectedGoal });
      router.push('/(onboarding)/whyWorks2');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={8} totalSteps={15} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>What is your weekly goal?</Text>
          <Text style={styles.subtitle}>This will be use to tailor your plan.</Text>

          <View style={styles.optionsContainer}>
            {GOAL_OPTIONS.map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.optionCard,
                  selectedGoal === goal && styles.optionCardSelected
                ]}
                onPress={() => handleSelectGoal(goal)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.optionValue,
                  selectedGoal === goal && styles.optionValueSelected
                ]}>
                  {goal}
                </Text>
                <Text style={[
                  styles.optionUnit,
                  selectedGoal === goal && styles.optionUnitSelected
                ]}>
                  {weightUnit}/week
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedGoal && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!selectedGoal}
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
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
    marginBottom: 32,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  optionCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCardSelected: {
    borderColor: '#206E6B',
    backgroundColor: '#fff',
  },
  optionValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  optionValueSelected: {
    color: '#206E6B',
  },
  optionUnit: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  optionUnitSelected: {
    color: '#206E6B',
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
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});