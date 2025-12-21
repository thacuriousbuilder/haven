import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';

export default function CheckIn2Screen() {
  const handleAllowNotifications = async () => {
    try {
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

      // Proceed regardless of permission
      router.push('/(onboarding)/complete');
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      router.push('/(onboarding)/complete');
    }
  };

  const handleSkip = () => {
    router.push('/(onboarding)/complete');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={14} totalSteps={15} />
      
      <View style={styles.content}>
        <Text style={styles.title}>How daily check-ins work</Text>

        <View style={styles.list}>
          <Text style={styles.listItem}>Morning micro-check</Text>
          <Text style={styles.listItem}>Weekly recap</Text>
          <Text style={styles.listItem}>Cheat day reminders (later)</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <ContinueButton 
          onPress={handleAllowNotifications}
          text="Allow Notifications"
        />
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 48,
  },
  list: {
    gap: 24,
  },
  listItem: {
    fontSize: 20,
    color: '#3D5A5C',
    lineHeight: 30,
  },
  footer: {
    paddingBottom: 24,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
});