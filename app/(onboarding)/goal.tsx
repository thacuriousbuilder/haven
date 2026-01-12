
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { OptionCard } from '@/components/onboarding/optionCard';
import { BackButton } from '@/components/onboarding/backButton';
import { Goal } from '@/types/onboarding';

export default function GoalScreen() {
  const { data, updateData } = useOnboarding();

  const handleSelectGoal = (goal: Goal) => {
    updateData({ goal });
  };

  const handleContinue = () => {
    if (!data.goal) {
      Alert.alert('Selection Required', 'Please select your goal to continue');
      return;
    }
    router.push('/(onboarding)/goalWeight');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={8} totalSteps={14} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>What is your goal?</Text>
          <Text style={styles.description}>This will be use to tailor your plan.</Text>

          <View style={styles.options}>
            <OptionCard
              title="Lose Weight"
              description=""  
              selected={data.goal === 'lose'}
              onPress={() => handleSelectGoal('lose')}
            />
            <OptionCard
              title="Maintain"
              description="" 
              selected={data.goal === 'maintain'}
              onPress={() => handleSelectGoal('maintain')}
            />
            <OptionCard
              title="Gain Weight"
              description="" 
              selected={data.goal === 'gain'}
              onPress={() => handleSelectGoal('gain')}
            />
          </View>
        </ScrollView>

        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !data.goal && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!data.goal}
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
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
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