

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/onboarding/backButton';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { useOnboarding } from '@/contexts/onboardingContext';

export default function AccountTypeScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();
  const [selectedType, setSelectedType] = useState<'client' | 'trainer' | null>(
    data.accountType
  );

  const handleSelectType = (type: 'client' | 'trainer') => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (!selectedType) {
      Alert.alert('Selection Required', 'Please select an account type to continue');
      return;
    }

    // Just save to context, don't create profile yet
    updateData({ accountType: selectedType });

    // Navigate based on account type
    if (selectedType === 'trainer') {
      // Trainers skip onboarding, go straight to creating profile
      router.push('/(onboarding)/createTrainerProfile');
    } else {
      // Clients continue with onboarding
      router.push('/(onboarding)/gender');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={1} totalSteps={15} />
      
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>Choose your account type</Text>
          <Text style={styles.description}>
            How will you be using HAVEN?
          </Text>

          <View style={styles.options}>
            <OptionCard
              title="I'm here for myself"
              description="Track my nutrition and get optional coaching"
              selected={selectedType === 'client'}
              onPress={() => handleSelectType('client')}
            />
            <OptionCard
              title="I'm a Coach"
              description="Manage my clients' nutrition tracking"
              selected={selectedType === 'trainer'}
              onPress={() => handleSelectType('trainer')}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedType && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!selectedType}
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
    backgroundColor: '#fff',
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
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  options: {
    marginTop: 8,
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
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});