import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';

export default function WhyWorks3Screen() {
  const handleContinue = () => {
    router.push('/(onboarding)/commitment');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={10} totalSteps={15} />
      
      <View style={styles.content}>
        <Text style={styles.title}>First, we learn you</Text>
        
        <Text style={styles.description}>
          Before giving advice, HAVEN needs to understand how you normally eat.
        </Text>

        {/* Placeholder for illustration */}
        <View style={styles.illustration}>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ContinueButton onPress={handleContinue} />
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
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    color: '#3D5A5C',
    marginTop: 16,
    lineHeight: 24,
  },
  illustration: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  placeholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#E09B7B',
    borderRadius: 24,
  },
});