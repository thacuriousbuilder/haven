

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { Colors } from '@/constants/colors';

export default function CommitmentScreen() {
  const handleStart = () => {
    router.push('/(auth)/signup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton backgroundColor="#000" iconColor="#fff" />
      <ProgressBar
        currentStep={13}
        totalSteps={15}
        backgroundColor="rgba(255, 255, 255, 0.3)"
        fillColor="#fff"
      />

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>The Next Step</Text>

          <Text style={styles.title}>Your 7-Day Baseline</Text>

          <Text style={styles.subtitle}>This is how HAVEN listens.</Text>

          <Text style={styles.description}>
            HAVEN learns what your body{' '}
            <Text style={styles.bold}>actually needs</Text>{' '}
            from how you eat and move.
          </Text>

          <Text style={styles.liveNormally}>
            For the next 7 days, live normally.
          </Text>

          <Text style={styles.description}>
            Track what you normally eat and how you usually move.
          </Text>

          <View style={styles.statements}>
            <Text style={styles.statement}>No restrictions.</Text>
            <Text style={styles.statement}>No guesswork.</Text>
            <Text style={styles.statement}>No judgement.</Text>
          </View>

          <Text style={styles.finalDescription}>
            After 7 days, HAVEN builds a weekly budget around{' '}
            <Text style={styles.tealText}>you.</Text>
          </Text>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Start My Baseline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.vividTeal,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.energyOrange,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
    lineHeight: 22,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '700',
    color: '#fff',
  },
  liveNormally: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  statements: {
    marginTop: 8,
    marginBottom: 24,
    gap: 4,
  },
  statement: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 40,
  },
  finalDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  tealText: {
    color: '#fff',
    fontWeight: '700',
  },
  buttonContainer: {
    paddingBottom: 24,
    paddingTop: 16,
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  continueButtonText: {
    color: Colors.graphite,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});