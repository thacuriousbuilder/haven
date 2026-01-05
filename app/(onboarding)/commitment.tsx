import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';

export default function CommitmentScreen() {
  const handleStart = () => {
    router.push('/(onboarding)/foodLog');
  };

  const handleSkip = () => {
    // Skip baseline and use estimate instead
    router.push('/(onboarding)/foodLog');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={13} totalSteps={16} />
      
      <View style={styles.content}>
        <Text style={styles.title}>Your 7-Day Baseline</Text>
        
        <Text style={styles.description}>
          For the next 7 days, eat exactly how you normally do.
        </Text>

        <View style={styles.features}>
          <Text style={styles.featureTitle}>No restrictions</Text>
          <Text style={styles.featureTitle}>No goals.</Text>
          <Text style={styles.featureTitle}>No judgment.</Text>
        </View>

        <Text style={styles.explanation}>
          This helps HAVEN build a plan that actually fits your life.
        </Text>
      </View>

      <View style={styles.footer}>
        <ContinueButton 
          onPress={handleStart}
          text="Start My Baseline"
        />
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip and use an estimate instead</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D5A5C',
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    color: '#3D5A5C',
    marginTop: 16,
    lineHeight: 24,
  },
  features: {
    marginTop: 48,
    marginBottom: 32,
  },
  featureTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3D5A5C',
    lineHeight: 44,
  },
  explanation: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  footer: {
    paddingBottom: 24,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
});