
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';

export default function CommitmentScreen() {
  const handleStart = () => {
    router.push('/(onboarding)/allowNotification');
  };

  const handleSkip = () => {
    // Skip baseline and use estimate instead
    router.push('/(onboarding)/manualPlan');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={13} totalSteps={14} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Your 7-Day Baseline</Text>
          
          <Text style={styles.description}>
            For the next 7 days, eat exactly how you normally do.
          </Text>

          <View style={styles.features}>
            <Text style={styles.featureTitle}>No restrictions.</Text>
            <Text style={styles.featureTitle}>No goals.</Text>
            <Text style={styles.featureTitle}>No Judgment.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start My Baseline</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleSkip} 
            style={styles.skipButton}
            activeOpacity={0.6}
          >
            <Text style={styles.skipText}>Skip and use an estimate instead</Text>
          </TouchableOpacity>
        </View>
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
    color: '#000',
    lineHeight: 36,
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
    marginBottom: 48,
  },
  features: {
    gap: 16,
  },
  featureTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    lineHeight: 40,
  },
  footer: {
    paddingBottom: 24,
    paddingTop: 16,
  },
  primaryButton: {
    backgroundColor: '#206E6B',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
});