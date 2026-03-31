

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '@/contexts/onboardingContext';
import { supabase } from '@haven/shared-utils';
import { createWeeklyPeriodForUser } from '@/lib/weeklyPeriod';
import { Colors } from '@/constants/colors';
import {
  calculateBMR,
  calculateTDEE,
  adjustForGoal,
  calculateWeeklyCalorieBudget,
  calculateMacros,
  estimateTargetDate,
} from '@/utils/calorieCalculator';
import { formatDateComponents } from '@haven/shared-utils';

export default function ManualPlanScreen() {
  const { data, isRestoring, resetData } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState({
    goalWeight: 0,
    targetDate: '',
    weeklyCalories: 0,
    dailyAverage: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });

  useEffect(() => {
    if (!isRestoring) {
      console.log('📋 Onboarding data received:', {
        gender: data.gender,
        currentWeight: data.currentWeight,
        goalWeight: data.goalWeight,
        heightFeet: data.heightFeet,
        heightInches: data.heightInches,
        birthYear: data.birthYear,
        activityLevel: data.activityLevel,
        planPath: data.planPath,
      });
      calculateAndSavePlan();
    }
  }, [isRestoring]);

  const calculateAndSavePlan = async () => {
    try {
      setLoading(true);

      const gender = data.gender || 'other';
      const currentWeight = data.currentWeight || 150;
      const heightFeet = data.heightFeet || 5;
      const heightInches = data.heightInches || 8;
      const birthYear = data.birthYear || 1990;
      const birthMonth = data.birthMonth || 1;
      const birthDay = data.birthDay || 1;
      const activityLevel = data.activityLevel || 'lightly_active';
      const goal = data.goal || 'lose';
      const goalWeight = data.goalWeight || currentWeight;

      const birthDate = formatDateComponents(birthYear, birthMonth, birthDay);
      const bmr = calculateBMR(gender, currentWeight, heightFeet, heightInches, birthDate);
      const tdee = calculateTDEE(bmr, activityLevel);
      const dailyCalories = adjustForGoal(tdee, goal, goalWeight, currentWeight);
      const weeklyCalories = calculateWeeklyCalorieBudget(dailyCalories);
      const macros = calculateMacros(weeklyCalories);
      const targetDate = estimateTargetDate(currentWeight, goalWeight, goal);
      const dailyAverage = Math.round(weeklyCalories / 7);

      setPlanData({
        goalWeight,
        targetDate,
        weeklyCalories,
        dailyAverage,
        protein: macros.protein,
        carbs: macros.carbs,
        fats: macros.fats,
      });

      await saveOnboardingData(weeklyCalories);
      setLoading(false);
    } catch (error) {
      console.error('Error calculating plan:', error);
      Alert.alert('Error', 'Failed to create your plan. Please try again.');
      setLoading(false);
    }
  };

  const saveOnboardingData = async (weeklyCalories: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const birthDate = formatDateComponents(
        data.birthYear || 1990,
        data.birthMonth || 1,
        data.birthDay || 1
      );

      const dailyTarget = Math.round(weeklyCalories / 7);

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          gender: data.gender || 'other',
          birth_date: birthDate,
          unit_system: 'imperial',
          height_ft: data.heightFeet || 5,
          height_in: data.heightInches || 0,
          weight_lbs: data.currentWeight || 150,
          target_weight_lbs: data.goalWeight || data.currentWeight || 150,
          goal: data.goal || 'maintain',
          workouts_per_week: data.workoutFrequency || '0-2',
          activity_level: data.activityLevel || 'lightly_active',
          plan_path: 'estimate',
          choose_goals: data.chooseGoals,
          choose_obstacles: data.chooseObstacles,
          baseline_start_date: null,
          baseline_complete: true,
          baseline_avg_daily_calories: dailyTarget,
          weekly_budget: weeklyCalories,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;
      console.log('✅ Profile saved for estimate user');

      const periodResult = await createWeeklyPeriodForUser(user.id);
      if (periodResult.reason === 'created') {
        console.log('✅ First weekly period created!');
      }

      // Clear AsyncStorage after successful write
      await resetData();
      console.log('✅ Onboarding data cleared from storage');

    } catch (error) {
      console.error('Error in saveOnboardingData:', error);
      throw error;
    }
  };

  const handleContinue = () => {
    router.replace('/newflow/interstitial4');
  };

  if (isRestoring || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Calculating your plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sparkle icon */}
        <View style={styles.sparkleContainer}>
          <Text style={styles.sparkle}>✦✦</Text>
        </View>

        <Text style={styles.title}>Your plan is ready!</Text>

        {/* Goal card */}
        <View style={styles.goalCard}>
          <View style={styles.goalRow}>
            <View style={styles.goalIconCircle}>
              <Ionicons name="radio-button-on" size={22} color={Colors.energyOrange} />
            </View>
            <View>
              <Text style={styles.goalLabel}>Your goal</Text>
              <Text style={styles.goalValue}>{planData.goalWeight}lbs</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.goalRow}>
            <View style={styles.goalIconCircle}>
              <Ionicons name="calendar-outline" size={22} color="rgba(255,255,255,0.7)" />
            </View>
            <View>
              <Text style={styles.goalLabel}>Estimated by</Text>
              <Text style={styles.goalValue}>{planData.targetDate}</Text>
            </View>
          </View>
        </View>

        {/* Weekly budget card */}
        <View style={styles.budgetCard}>
          <Text style={styles.budgetLabel}>YOUR  WEEKLY BUDGET</Text>
          <Text style={styles.budgetCalories}>
            {planData.weeklyCalories.toLocaleString()}
          </Text>
          <Text style={styles.budgetUnit}>calories per week</Text>
          <Text style={styles.budgetDaily}>
            ~{planData.dailyAverage.toLocaleString()} per day on average
          </Text>
        </View>

        {/* Macros card */}
        <View style={styles.macrosCard}>
          <Text style={styles.macrosLabel}>WEEKLY MACROS</Text>
          <View style={styles.macrosRow}>
            <View style={[styles.macroItem, styles.macroOrange]}>
              <Text style={styles.macroValue}>{planData.protein.toLocaleString()}G</Text>
              <Text style={styles.macroName}>Protein</Text>
            </View>
            <View style={[styles.macroItem, styles.macroGreen]}>
              <Text style={styles.macroValue}>{planData.carbs.toLocaleString()}G</Text>
              <Text style={styles.macroName}>Carbs</Text>
            </View>
            <View style={[styles.macroItem, styles.macroGrey]}>
              <Text style={styles.macroValue}>{planData.fats.toLocaleString()}G</Text>
              <Text style={styles.macroName}>Fats</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Let's get started!</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.vividTeal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    alignItems: 'center',
  },
  sparkleContainer: {
    marginBottom: 12,
  },
  sparkle: {
    fontSize: 24,
    color: '#FFD700',
    letterSpacing: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  goalCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 12,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  goalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  budgetCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  budgetCalories: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 56,
  },
  budgetUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.energyOrange,
    marginBottom: 4,
  },
  budgetDaily: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  macrosCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  macrosLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.2,
    marginBottom: 16,
    textAlign: 'center',
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroItem: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  macroOrange: {
    borderColor: Colors.energyOrange,
    backgroundColor: 'rgba(239,120,40,0.1)',
  },
  macroGreen: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76,175,80,0.1)',
  },
  macroGrey: {
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  macroName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  continueButton: {
    backgroundColor: Colors.energyOrange,
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});