
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useOnboarding } from '@/contexts/onboardingContext';
import { supabase } from '@/lib/supabase';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';

export default function NotificationPermissionScreen() {
  const { data } = useOnboarding();

  const saveOnboardingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        return;
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
          baseline_start_date: new Date().toISOString().split('T')[0],
          baseline_complete: false,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving profile:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveOnboardingData:', error);
      throw error;
    }
  };

  const handleAllowNotifications = async () => {
    try {
      // Request notification permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notifications Disabled',
          'You can enable notifications later in Settings.'
        );
      }

      // Save onboarding data
      await saveOnboardingData();

      // Navigate to complete screen (baseline week flow)
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
      <ProgressBar currentStep={16} totalSteps={16} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 32,
    paddingHorizontal: 16,
  },
  permissionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
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
    color: '#000',
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
    backgroundColor: '#fff',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  allowButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#206E6B',
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});