
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { BackButton } from '@/components/onboarding/backButton';
import { Gender } from '@/types/onboarding';

export default function GenderScreen() {
  const { data, updateData } = useOnboarding();

  const handleSelectGender = (gender: Gender) => {
    updateData({ gender });
  };

  const handleContinue = () => {
    if (!data.gender) {
      Alert.alert('Selection Required', 'Please select your gender to continue');
      return;
    }
    router.push('/(onboarding)/birthDate');
  };

  return (
    <SafeAreaView style={styles.container}>
     <BackButton onPress={() => router.replace('/(auth)/signup')} />
      <ProgressBar currentStep={1} totalSteps={14} />
      
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>Choose your Gender</Text>
          <Text style={styles.description}>
            This will be use to tailor your plan.
          </Text>

          <View style={styles.options}>
            <OptionCard
              title="Male"
              description=""
              selected={data.gender === 'male'}
              onPress={() => handleSelectGender('male')}
            />
            <OptionCard
              title="Female"
              description=""
              selected={data.gender === 'female'}
              onPress={() => handleSelectGender('female')}
            />
            <OptionCard
              title="Other"
              description=""
              selected={data.gender === 'other'}
              onPress={() => handleSelectGender('other')}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !data.gender && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!data.gender}
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
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 32,
    lineHeight: 20,
  },
  options: {
    gap: 16,
  },
  buttonContainer: {
    paddingBottom: 24,
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