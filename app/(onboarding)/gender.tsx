import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';
import { Gender } from '@/types/onboarding';

export default function GenderScreen() {
  const { data, updateData } = useOnboarding();

  const handleContinue = () => {
    if (data.gender) {
      router.push('/(onboarding)/birthDate');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={3} totalSteps={16} />
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>We'll use this later —</Text>
        <Text style={styles.subtitle}>after we understand</Text>
        <Text style={styles.subtitle}>how you actually eat.</Text>
        
        <Text style={styles.title}>Choose your Gender</Text>
        <Text style={styles.description}>This will be use to tailor your plan.</Text>

        <View style={styles.options}>
          <OptionCard
            title="Male"
            selected={data.gender === 'male'}
            onPress={() => updateData({ gender: 'male' })}
          />
          <OptionCard
            title="Female"
            selected={data.gender === 'female'}
            onPress={() => updateData({ gender: 'female' })}
          />
          <OptionCard
            title="Other"
            selected={data.gender === 'other'}
            onPress={() => updateData({ gender: 'other' })}
          />
        </View>
      </View>

      <ContinueButton
        onPress={handleContinue}
        disabled={!data.gender}
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
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  subtitle: {
    fontSize: 16,
    color: '#3D5A5C',
    fontWeight: '600',
    lineHeight: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginTop: 32,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  options: {
    marginTop: 8,
  },
});