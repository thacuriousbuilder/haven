
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { BackButton } from '@/components/onboarding/backButton';
import { ChooseObstacleOption } from '@/types/onboarding';

const OBSTACLE_OPTIONS: { value: ChooseObstacleOption; label: string }[] = [
  { value: 'bad_day_ruins_all',    label: 'One bad day and I feel like I\'ve ruined everything' },
  { value: 'weekends_undo_progress', label: 'Weekends always undo the progress I made' },
  { value: 'guilty_eating_out',    label: 'I feel guilty every time I eat out or celebrate' },
  { value: 'no_balance',           label: 'I can\'t find balance between enjoying life and my goals' },
];

export default function ChooseGoal2Screen() {
  const { data, updateData } = useOnboarding();

  const toggle = (value: ChooseObstacleOption) => {
    const current = data.chooseObstacles;
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateData({ chooseObstacles: updated });
  };

  const handleContinue = () => {
    if (data.chooseObstacles.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one option');
      return;
    }
    router.push('/newflow/interstitial2');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={2} totalSteps={15} />

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>What keeps getting in the way?</Text>
          <Text style={styles.description}>Select all that apply</Text>

          <View style={styles.options}>
            {OBSTACLE_OPTIONS.map(option => (
              <OptionCard
                key={option.value}
                title={option.label}
                selected={data.chooseObstacles.includes(option.value)}
                onPress={() => toggle(option.value)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              data.chooseObstacles.length > 0 && styles.continueButtonActive,
              data.chooseObstacles.length === 0 && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={data.chooseObstacles.length === 0}
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