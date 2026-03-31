

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { ScenarioCard } from '@/components/onboarding/scenarioCard';
import { WeeklyTotalCard } from '@/components/onboarding/weeklyTotalCard';
import { Colors } from '@/constants/colors';

export default function WhyWorks2Screen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <BackButton backgroundColor="#000" iconColor="#fff" />
      <ProgressBar
        currentStep={4}
        totalSteps={15}
        backgroundColor="rgba(255, 255, 255, 0.3)"
        fillColor="#fff"
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Your Life, Your plan</Text>

          <Text style={styles.title}>
            Saturday night shouldn't feel like cheating.
          </Text>

          <View style={styles.scenariosContainer}>
            <ScenarioCard
              icon="restaurant-outline"
              iconBackgroundColor="rgba(255, 255, 255, 0.2)"
              iconColor="#fff"
              title="Birthday dinner with friends"
              calories="ate 2,800 cal"
              badgeText="Planned"
              badgeColor={Colors.energyOrange}
            />
            <ScenarioCard
              icon="nutrition-outline"
              iconBackgroundColor="rgba(255, 255, 255, 0.2)"
              iconColor="#fff"
              title="Light lunch to balance it out"
              calories="ate 1,600 cal"
              badgeText="Light"
              badgeColor="#FF6B6B"
            />
            <ScenarioCard
              icon="checkmark-circle"
              iconBackgroundColor="rgba(76, 175, 80, 0.2)"
              iconColor="#4CAF50"
              title="Normal day, back on track"
              calories="ate 1,800 cal"
              badgeText="Normal"
              badgeColor="#4CAF50"
            />
          </View>

          <WeeklyTotalCard
            totalCalories="12,600 Cal"
            statusText="Exactly as planned"
            statusColor="#4CAF50"
          />

          <Text style={styles.description}>
            Dinners out. Drinks. Weekends.{' '}
            <Text style={styles.descriptionBold}>
              They're part of the plan, not mistakes.
            </Text>
          </Text>

          <TouchableOpacity
            style={styles.tapPrompt}
            activeOpacity={1}
            onPress={() => router.push('/newflow/transition2')}
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
    marginBottom: 24,
  },
  scenariosContainer: {
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  descriptionBold: {
    fontWeight: '700',
    color: '#fff',
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