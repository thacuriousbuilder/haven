import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useOnboarding } from '@/contexts/onboardingContext';
import { supabase } from '@/lib/supabase';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { Colors } from '@/constants/colors';
import { calculateBMR, calculateTDEE, adjustForGoal } from '@/utils/calorieCalculator';
import { formatDateComponents, getLocalDateString } from '@/utils/timezone';

export default function NotificationPermissionScreen() {
  const { data } = useOnboarding();

  
  const saveOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        throw new Error('No user found');
      }
  
      // Validate required data
      if (!data.gender || !data.currentWeight || !data.heightFeet || !data.birthYear) {
        throw new Error('Missing required onboarding data');
      }
  
      const fullName = user.user_metadata?.full_name || '';
      
      // Calculate birth date
      const birthDate = formatDateComponents(
        data.birthYear || 1990,
        data.birthMonth || 1,
        data.birthDay || 1
      );
  
  
      const bmr = calculateBMR(
        data.gender,
        data.currentWeight,
        data.heightFeet,
        data.heightInches || 0,
        birthDate
      );
  
      console.log('📊 Calculated BMR:', bmr);
  
     
      const tdee = calculateTDEE(bmr, data.activityLevel || 'lightly_active');
  
      console.log('📊 Calculated TDEE:', tdee);
  
      
      const adjustedDailyCalories = adjustForGoal(
        tdee,
        data.goal || 'maintain',
        data.goalWeight,
        data.currentWeight
      );
  
      console.log('📊 Adjusted Daily Calories:', adjustedDailyCalories);
  
      
      const dailyDeficit = tdee - adjustedDailyCalories;
  
      console.log('📊 Daily Deficit:', dailyDeficit);
  
      // Save to database
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          user_type: data.accountType,
          full_name: fullName,
          gender: data.gender,
          birth_date: birthDate,
          unit_system: data.unitSystem || 'imperial',
          height_ft: data.heightFeet,
          height_in: data.heightInches || 0,
          weight_lbs: data.currentWeight,
          target_weight_lbs: data.goalWeight || data.currentWeight,
          weekly_weight_goal: data.weeklyGoalRate,
          goal: data.goal,
          workouts_per_week: data.workoutFrequency,
          activity_level: data.activityLevel,
         
          bmr: bmr,
          daily_deficit: dailyDeficit,
          
          // Baseline flags
          baseline_start_date: getLocalDateString(),
          baseline_complete: false,
          onboarding_completed: true,
          
          // Timestamps
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
  
      if (error) {
        console.error('❌ Error saving profile:', error);
        throw error;
      }
  
      console.log('✅ Profile saved successfully with BMR:', bmr, 'and Deficit:', dailyDeficit);
    } catch (error) {
      console.error('❌ Error in saveOnboardingData:', error);
      throw error;
    }
  };
  const handleAllowNotifications = async () => {
    try {
      // Set up Android notification channel FIRST (required for Android 8.0+)
      console.log('🔔 Starting notification permission flow...');
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'HAVEN Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#206E6B',
        });
      }
  
      // Request notification permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📱 Existing permission status:', existingStatus);
      let finalStatus = existingStatus;
  
      if (existingStatus !== 'granted') {
        console.log('🔔 Requesting permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📱 New permission status:', finalStatus);
      }else{
        console.log('✅ Permissions already granted!');
      }
  
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notifications Disabled',
          'You can enable notifications later in Settings.'
        );
      } else {
        console.log('✅ Notifications enabled!');
      }
  
      // Save onboarding data
      await saveOnboardingData();
  
      // Navigate to home screen (baseline week flow)
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error in handleAllowNotifications:', error);
      Alert.alert('Error', 'Failed to save your data. Please try again.');
    }
  };

  const handleDontAllow = async () => {
    try {
      // Save onboarding data even if they don't allow notifications
      await saveOnboardingData();

      // Navigate to home screen (baseline week flow)
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error in handleDontAllow:', error);
      Alert.alert('Error', 'Failed to save your data. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={15} totalSteps={15} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Bell Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="notifications-outline" size={40} color="#206E6B" />
            </View>
          </View>

          <Text style={styles.title}>
            Don't miss out on important updates to hit your goals
          </Text>

          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>
              HAVEN would like to send you notifications
            </Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.denyButton}
                onPress={handleDontAllow}
                activeOpacity={0.7}
              >
                <Text style={styles.denyButtonText}>Don't Allow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.allowButton}
                onPress={handleAllowNotifications}
                activeOpacity={0.8}
              >
                <Text style={styles.allowButtonText}>Allow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131311',
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F3F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 28,
    paddingHorizontal: 16,
  },
  permissionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 0,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  denyButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
  },
  allowButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: Colors.vividTeal,
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});