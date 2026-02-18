
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { BackButton } from '@/components/onboarding/backButton';
import { ActivityLevel } from '@/types/onboarding';

export default function ActivityLevelScreen() {
  const { data, updateData } = useOnboarding();

  const handleSelectActivity = (level: ActivityLevel) => {
    updateData({ activityLevel: level });
  };

  const handleContinue = () => {
    if (!data.activityLevel) {
      Alert.alert('Selection Required', 'Please select your activity level to continue');
      return;
    }
    router.push('/(onboarding)/trainerCode');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={10} totalSteps={14} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>What is your activity level?</Text>
          <Text style={styles.description}>This will be use to tailor your plan.</Text>

          <View style={styles.options}>
            <OptionCard
              title="Not Very Active"
              description="Mostly desk-based day with little to no intentional movement"
              selected={data.activityLevel === 'not_very_active'}
              onPress={() => handleSelectActivity('not_very_active')}
            />
            <OptionCard
              title="Lightly Active"
              description="Mix of sitting and light movement, walking meetings, errands, light chores"
              selected={data.activityLevel === 'lightly_active'}
              onPress={() => handleSelectActivity('lightly_active')}
            />
            <OptionCard
              title="Active"
              description="Regularly on your feet or doing physical activity most of the day"
              selected={data.activityLevel === 'active'}
              onPress={() => handleSelectActivity('active')}
            />
            <OptionCard
              title="Very Active"
              description="Physically demanding day job or intense daily training"
              selected={data.activityLevel === 'very_active'}
              onPress={() => handleSelectActivity('very_active')}
            />
                      </View>
        </ScrollView>

        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !data.activityLevel && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!data.activityLevel}
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
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 24,
    lineHeight: 20,
  },
  options: {
    gap: 16,
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
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});