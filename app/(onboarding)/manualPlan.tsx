
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { supabase } from '@/lib/supabase';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';

export default function ManualPlanScreen() {
  const { data } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState({
    goalWeight: 150,
    targetDate: 'September 20',
    weeklyCalories: 14000,
    protein: 546,
    carbs: 1232,
    fats: 259,
  });

  useEffect(() => {
    calculateAndSavePlan();
  }, []);

  const calculateAndSavePlan = async () => {
    try {
      // Simulate calculating plan
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In real app, calculate based on user data
      const calculatedPlan = {
        goalWeight: data.goalWeight || 150,
        targetDate: 'September 20',
        weeklyCalories: 14000,
        protein: 546,
        carbs: 1232,
        fats: 259,
      };
      
      setPlanData(calculatedPlan);

   
      await saveOnboardingData();
      
      setLoading(false);
    } catch (error) {
      console.error('Error calculating plan:', error);
      Alert.alert('Error', 'Failed to create your plan. Please try again.');
      setLoading(false);
    }
  };

  const saveOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        throw new Error('No user found');
      }

      // Calculate birth date
      const birthDate = new Date(
        data.birthYear || 1990,
        (data.birthMonth || 1) - 1,
        data.birthDay || 1
      );

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          gender: data.gender,
          birth_date: birthDate.toISOString().split('T')[0],
          unit_system: 'imperial',
          height_ft: data.heightFeet,
          height_in: data.heightInches,
          weight_lbs: data.currentWeight,
          target_weight_lbs: data.goalWeight,
          goal: data.goal,
          workouts_per_week: data.workoutFrequency,
          activity_level: data.activityLevel,
          baseline_start_date: null, // They skipped baseline
          baseline_complete: true, // Mark as complete since they're using estimate
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving profile:', error);
        throw error;
      }

      console.log('✅ Onboarding data saved successfully (manual plan)');
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
      <ProgressBar currentStep={16} totalSteps={16} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Your Custom plan is ready!</Text>
          
          <Text style={styles.subtitle}>you should hit your goal</Text>

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
              <Text style={styles.macroValue}>{planData.protein}</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{planData.carbs.toLocaleString()}</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroValue}>{planData.fats}</Text>
              <Text style={styles.macroLabel}>Fats</Text>
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
    backgroundColor: '#fff',
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
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
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
    borderColor:"#E5E5E5",
    borderWidth:1,
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
    color: '#000',
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
    borderColor:"#E5E5E5",
    borderWidth:1,
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