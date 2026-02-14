
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { supabase } from '@/lib/supabase';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { createWeeklyPeriodForUser } from '@/lib/weeklyPeriod';

import {
  calculateBMR,
  calculateTDEE,
  adjustForGoal,
  calculateWeeklyCalorieBudget,
  calculateMacros,
  estimateTargetDate,
} from '@/utils/calorieCalculator';
import { formatDateComponents } from '@/utils/timezone';

export default function ManualPlanScreen() {
  const { data } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState({
    goalWeight: 0,
    targetDate: '',
    weeklyCalories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });

  useEffect(() => {
    calculateAndSavePlan();
  }, []);


  const calculateAndSavePlan = async () => {
    try {
      setLoading(true);
  
      // Validate and provide defaults for null values
      const gender = data.gender || 'other';
      const currentWeight = data.currentWeight || 150;
      const heightFeet = data.heightFeet || 5;
      const heightInches = data.heightInches || 8;
      const birthYear = data.birthYear || 1990;
      const birthMonth = data.birthMonth || 1;
      const birthDay = data.birthDay || 1;
      const activityLevel = data.activityLevel || 'lightly_active';
      const goal = data.goal || 'maintain';
      const goalWeight = data.goalWeight || currentWeight;
  
      // Calculate birth date
      const birthDate = formatDateComponents(birthYear, birthMonth, birthDay);
  
      // Step 1: Calculate BMR
      const bmr = calculateBMR(
        gender,
        currentWeight,
        heightFeet,
        heightInches,
        birthDate
      );
  
      // Step 2: Calculate TDEE
      const tdee = calculateTDEE(bmr, activityLevel);
  
      // Step 3: Adjust for goal
      const dailyCalories = adjustForGoal(
        tdee,
        goal,
        goalWeight,
        currentWeight
      );
  
      // Step 4: Calculate weekly budget
      const weeklyCalories = calculateWeeklyCalorieBudget(dailyCalories);
  
      // Step 5: Calculate macros
      const macros = calculateMacros(weeklyCalories);
  
      // Step 6: Estimate target date
      const targetDate = estimateTargetDate(
        currentWeight,
        goalWeight,
        goal
      );
  
      const calculatedPlan = {
        goalWeight: goalWeight,
        targetDate: targetDate,
        weeklyCalories: weeklyCalories,
        protein: macros.protein,
        carbs: macros.carbs,
        fats: macros.fats,
      };
  
      setPlanData(calculatedPlan);
  
      // Save onboarding data AND create weekly budget
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
      
      if (!user) {
        throw new Error('No user found');
      }
  
      // Calculate birth date
      const birthDate = formatDateComponents(
        data.birthYear || 1990,
        data.birthMonth || 1,
        data.birthDay || 1
      );
  
  
      const dailyTarget = Math.round(weeklyCalories / 7);
  
      // Save profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: data.fullName,
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
          baseline_start_date: null,
          baseline_complete: true,
          baseline_avg_daily_calories: dailyTarget,
          weekly_budget: weeklyCalories, 
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });
  
      if (profileError) {
        console.error('Error saving profile:', profileError);
        throw profileError;
      }
  
      console.log('✅ Profile saved for manual user');
  
      
      console.log('🎯 Creating first weekly period...');
      const periodResult = await createWeeklyPeriodForUser(user.id);
      
      if (!periodResult.success) {
        console.error('⚠️  Warning: Failed to create weekly period:', periodResult.error);
        // Don't fail onboarding - just log the warning
        // User can still proceed, cron will create it later
      }
      
      if (periodResult.reason === 'created') {
        console.log('✅ First weekly period created!');
      } else if (periodResult.reason === 'already_exists') {
        console.log('ℹ️  Weekly period already exists');
      }
  
    } catch (error) {
      console.error('Error in saveOnboardingData:', error);
      throw error;
    }
  };
  
  const handleContinue = () => {
    router.replace('/(tabs)/home');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#206E6B" />
          <Text style={styles.loadingText}>Calculating your plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={14} totalSteps={15} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Your Custom Plan is Ready!</Text>
          
          <Text style={styles.subtitle}>You should hit your goal</Text>

          <View style={styles.goalCard}>
            <Text style={styles.goalText}>
              {planData.goalWeight}lbs by {planData.targetDate}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Weekly Recommendation</Text>

          <View style={styles.macrosContainer}>
            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{planData.weeklyCalories.toLocaleString()}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{planData.protein.toLocaleString()}</Text>
              <Text style={styles.macroLabel}>Protein (g)</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{planData.carbs.toLocaleString()}</Text>
              <Text style={styles.macroLabel}>Carbs (g)</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{planData.fats.toLocaleString()}</Text>
              <Text style={styles.macroLabel}>Fats (g)</Text>
            </View>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Let's get started!</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#206E6B',
    fontWeight: '500',
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
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderColor: '#E5E5E5',
    borderWidth: 1,
  },
  goalText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  macrosContainer: {
    gap: 12,
  },
  macroCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderColor: '#E5E5E5',
    borderWidth: 1,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  buttonContainer: {
    paddingBottom: 24,
    paddingTop: 16,
  },
  continueButton: {
    backgroundColor: '#206E6B',
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
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});