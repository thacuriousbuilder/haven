import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';
import { Goal } from '@/types/onboarding';

export default function GoalScreen() {
  const { data, updateData } = useOnboarding();

  const handleContinue = () => {
    if (data.goal) {
      router.push('/(onboarding)/goalWeight');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={6} totalSteps={15} />
      
      <View style={styles.content}>

        <Text style={styles.title}>What is your goal?</Text>
        <Text style={styles.description}>This will be use to tailor your plan.</Text>

        <View style={styles.options}>
          <OptionCard
            title="Lose Weight"
            selected={data.goal === 'lose'}
            onPress={() => updateData({ goal: 'lose' })}
          />
          <OptionCard
            title="Maintain"
            selected={data.goal === 'maintain'}
            onPress={() => updateData({ goal: 'maintain' })}
          />
          <OptionCard
            title="Gain Weight"
            selected={data.goal === 'gain'}
            onPress={() => updateData({ goal: 'gain' })}
          />
        </View>
      </View>

      <ContinueButton
        onPress={handleContinue}
        disabled={!data.goal}
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