

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { BackButton } from '@/components/onboarding/backButton';
import { ChooseGoalOption } from '@/types/onboarding';

const GOAL_OPTIONS: { value: ChooseGoalOption; label: string }[] = [
  { value: 'lose_weight',         label: 'Lose weight sustainably' },
  { value: 'gain_weight',         label: 'Gain weight sustainably' },
  { value: 'stop_guilt',          label: 'Stop feeling guilty after meals' },
  { value: 'enjoy_food',          label: 'Enjoy food without the stress' },
  { value: 'understand_patterns', label: 'Understand my eating patterns' },
];

const MUTUALLY_EXCLUSIVE: ChooseGoalOption[][] = [
  ['lose_weight', 'gain_weight'],
];

export default function ChooseGoalScreen() {
  const { data, updateData } = useOnboarding();

  const toggle = (value: ChooseGoalOption) => {
    const current = data.chooseGoals;

    if (current.includes(value)) {
      updateData({ chooseGoals: current.filter(v => v !== value) });
      return;
    }

    // Remove mutually exclusive options before adding
    const exclusiveGroup = MUTUALLY_EXCLUSIVE.find(group => group.includes(value));
    const filtered = exclusiveGroup
      ? current.filter(v => !exclusiveGroup.includes(v))
      : current;

    updateData({ chooseGoals: [...filtered, value] });
  };

  const handleContinue = () => {
    if (data.chooseGoals.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one goal');
      return;
    }
    router.push('/newflow/chooseGoal2');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={1} totalSteps={15} />

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>What are you working towards?</Text>
          <Text style={styles.description}>Select all that apply</Text>

          <View style={styles.options}>
            {GOAL_OPTIONS.map(option => (
              <OptionCard
                key={option.value}
                title={option.label}
                selected={data.chooseGoals.includes(option.value)}
                onPress={() => toggle(option.value)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
           style={[
            styles.continueButton,
            data.chooseGoals.length > 0 && styles.continueButtonActive,
            data.chooseGoals.length === 0 && styles.continueButtonDisabled,
          ]}
            onPress={handleContinue}
            disabled={data.chooseGoals.length === 0}
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
    paddingTop: 24,
    justifyContent: 'space-between',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#999896',
    marginBottom: 24,
  },
  options: { gap: 12 },
  buttonContainer: { paddingBottom: 24 },
  continueButton: {
    backgroundColor: '#504D47',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  continueButtonActive: {
    backgroundColor: '#206E6B',
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
  },
});