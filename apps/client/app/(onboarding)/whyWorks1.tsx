
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { WeeklyComparisonChart } from '@/components/onboarding/weeklyComparisonChart';
import { Colors } from '@/constants/colors';

export default function WhyWorks1Screen() {
  const handleContinue = () => {
    router.push('/(onboarding)/goal');
  };

  // OTHER APPS data - all same height and color
  const otherAppsData = [
    { day: 'Mon', color: Colors.energyOrange, height: 100 },
    { day: 'Tue', color: Colors.energyOrange, height: 100 },
    { day: 'Wed', color: Colors.energyOrange, height: 100 },
    { day: 'Thu', color: Colors.energyOrange, height: 100 },
    { day: 'Fri', color: Colors.energyOrange, height: 100 },
    { day: 'Sat', color: Colors.energyOrange, height: 100 },
    { day: 'Sun', color: Colors.energyOrange, height: 100 },
  ];

  // HAVEN data - varied heights and colors (Saturday is the "cheat day")
  const havenData = [
    { day: 'Mon', color: Colors.vividTeal, height: 70 },
    { day: 'Tue', color: Colors.vividTeal, height: 65 },
    { day: 'Wed', color: Colors.vividTeal, height: 90 },
    { day: 'Thu', color: Colors.vividTeal, height: 50 },
    { day: 'Fri', color: Colors.vividTeal, height: 75 },
    { day: 'Sat', color: Colors.energyOrange, height: 100 }, // Cheat day
    { day: 'Sun', color: Colors.vividTeal, height: 60 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <BackButton backgroundColor='#000000' />
      <ProgressBar 
        fillColor='#ffff' 
        backgroundColor='rgba(255, 255, 255, 0.3)' 
        currentStep={4} 
        totalSteps={14} 
      />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Label */}
          <Text style={styles.label}>Why it works</Text>
          
          {/* Main Headline */}
          <Text style={styles.title}>
            Other apps give you a daily limit. HAVEN gives you a weekly budget.
          </Text>
          
          {/* Subheading */}
          <Text style={styles.subheading}>
            Because life doesn't happen in neat 24-hour blocks
          </Text>

          {/* OTHER APPS Comparison */}
          <WeeklyComparisonChart
            title="OTHER APPS"
            subtitle="Same week, same goals"
            days={otherAppsData}
           backgroundColor="rgba(255, 255, 255, 0.12)"
          />

          {/* HAVEN Comparison */}
          <WeeklyComparisonChart
            title="HAVEN"
            subtitle="Same week, different goals -- Zero guilt"
            days={havenData}
           backgroundColor="rgba(0, 0, 0, 0.25)"
            subtitleColor='#fff'
          />

          {/* Bottom Description */}
          <Text style={styles.description}>
            Eat lighter when it's easy. Enjoy more when it matters. HAVEN balances your week so flexibility never costs you progress.
          </Text>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
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
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 32,
    marginBottom: 16,
  },
  subheading: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 24,
    marginTop: 24,
    marginBottom: 16,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: Colors.graphite,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});