

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { WeeklyComparisonChart } from '@/components/onboarding/weeklyComparisonChart';
import { Colors } from '@/constants/colors';

export default function WhyWorks1Screen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const havenData = [
    { day: 'Mon', color: Colors.vividTeal, height: 70 },
    { day: 'Tue', color: Colors.vividTeal, height: 65 },
    { day: 'Wed', color: Colors.vividTeal, height: 90 },
    { day: 'Thu', color: Colors.vividTeal, height: 50 },
    { day: 'Fri', color: Colors.vividTeal, height: 75 },
    { day: 'Sat', color: '#4CAF50', height: 100 },
    { day: 'Sun', color: Colors.vividTeal, height: 60 },
  ];

  const otherAppsData = [
    { day: 'Mon', color: Colors.energyOrange, height: 100 },
    { day: 'Tue', color: Colors.energyOrange, height: 100 },
    { day: 'Wed', color: Colors.energyOrange, height: 100 },
    { day: 'Thu', color: Colors.energyOrange, height: 100 },
    { day: 'Fri', color: Colors.energyOrange, height: 100 },
    { day: 'Sat', color: '#EF4444', height: 100 },
    { day: 'Sun', color: Colors.energyOrange, height: 100 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <BackButton backgroundColor='#000000' />
      <ProgressBar
        fillColor='#fff'
        backgroundColor='rgba(255, 255, 255, 0.3)'
        currentStep={3}
        totalSteps={15}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>How Haven works</Text>

          <Text style={styles.title}>
            Other apps give you a daily limit. HAVEN gives you a weekly budget.
          </Text>

          <Text style={styles.subheading}>
            Eat lighter when it's easy. Enjoy more when it matters. HAVEN balances your week so flexibility never costs you progress.
          </Text>

          <WeeklyComparisonChart
            title="HAVEN"
            subtitle="Same week, different goals -- Zero guilt"
            days={havenData}
            backgroundColor="rgba(0, 0, 0, 0.25)"
            subtitleColor='#fff'
          />

          <WeeklyComparisonChart
            title="OTHER APPS"
            subtitle="Same week, same goals"
            days={otherAppsData}
            backgroundColor="rgba(255, 255, 255, 0.12)"
          />

          {/* Tap prompt inside scroll so it's visible after charts */}
          <TouchableOpacity
            style={styles.tapPrompt}
            activeOpacity={1}
            onPress={() => router.push('/newflow/transition1')}
          >
            <Text style={styles.tapText}>Tap to continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
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
  scrollContent: { paddingBottom: 32 },
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
  tapPrompt: {
    alignItems: 'center',
    paddingTop: 24,
  },
  tapText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
});