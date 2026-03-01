
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { Colors } from '@/constants/colors';

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
      <BackButton backgroundColor="#000" iconColor="#fff" />
      <ProgressBar 
        currentStep={13} 
        totalSteps={14}
        backgroundColor="rgba(255, 255, 255, 0.3)"
        fillColor="#fff"
      />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Label */}
          <Text style={styles.label}>The Next Step</Text>

          {/* Title */}
          <Text style={styles.title}>Your 7-Day Baseline</Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>This is how HAVEN listens.</Text>

          {/* Description with bold emphasis */}
          <Text style={styles.description}>
            HAVEN learns what your body <Text style={styles.bold}>actually needs</Text> from how you eat and move.
          </Text>

          {/* Live normally section */}
          <Text style={styles.liveNormally}>For the next 7 days, live normally.</Text>
          
          <Text style={styles.description}>
            Track what you normally eat and how you usually move.
          </Text>

          {/* Three bold statements */}
          <View style={styles.statements}>
            <Text style={styles.statement}>No restrictions.</Text>
            <Text style={styles.statement}>No guesswork.</Text>
            <Text style={styles.statement}>No judgement.</Text>
          </View>

          {/* Final description */}
          <Text style={styles.finalDescription}>
            After 7 days, HAVEN builds a weekly budget around you.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start my baseline!</Text>
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
    backgroundColor: Colors.vividTeal,
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
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '700',
    color: '#fff',
  },
  liveNormally: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 8,
  },
  statements: {
    marginTop: 32,
    marginBottom: 32,
  },
  statement: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 48,
    marginBottom: 20,
  },
  finalDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
  },
  footer: {
    paddingBottom: 24,
    paddingTop: 16,
  },
  primaryButton: {
    backgroundColor: '#fff',
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
    color: Colors.vividTeal,
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
    color: '#fff',
    textDecorationLine: 'underline',
  },
});