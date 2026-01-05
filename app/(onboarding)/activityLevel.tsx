import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';
import { ActivityLevel } from '@/types/onboarding';

export default function ActivityLevelScreen() {
  const { data, updateData } = useOnboarding();

  const handleContinue = () => {
    if (data.activityLevel) {
      router.push('/(onboarding)/workouts');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={6} totalSteps={16} />
      
      <View style={styles.content}>
    
        <Text style={styles.title}>What is your activity level?</Text>
        <Text style={styles.description}>This will be use to tailor your plan.</Text>

        <View style={styles.options}>
          <OptionCard
            title="Not Very Active"
            description="Spend most of the day sitting (e.g. bankteller, desk job)"
            selected={data.activityLevel === 'not_very_active'}
            onPress={() => updateData({ activityLevel: 'not_very_active' })}
          />
          <OptionCard
            title="Lightly Active"
            description="Spend a good part of the day on your feet (e.g. teacher, salesperson)"
            selected={data.activityLevel === 'lightly_active'}
            onPress={() => updateData({ activityLevel: 'lightly_active' })}
          />
          <OptionCard
            title="Active"
            description="Spend a good part of the day doing some physical activity (e.g. food server, postal carrier)"
            selected={data.activityLevel === 'active'}
            onPress={() => updateData({ activityLevel: 'active' })}
          />
          <OptionCard
            title="Very Active"
            description="Spend most of the day doing heavy physical activity (e.g. bike messenger, carpenter)"
            selected={data.activityLevel === 'very_active'}
            onPress={() => updateData({ activityLevel: 'very_active' })}
          />
        </View>
      </View>

      <ContinueButton
        onPress={handleContinue}
        disabled={!data.activityLevel}
      />
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
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  subtitle: {
    fontSize: 13,
    color: '#3D5A5C',
    fontWeight: '600',
    lineHeight: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D5A5C',
    marginTop: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  options: {
    marginTop: 2,
  },
});
