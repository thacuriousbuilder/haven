import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';

export default function CheckIn1Screen() {
  const handleContinue = () => {
    router.push('/(onboarding)/checkin2');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={15} totalSteps={16} />
      
      <View style={styles.content}>
        <Text style={styles.title}>How daily check-ins work</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Each morning, HAVEN</Text>
          <Text style={styles.sectionTitle}>will ask one question:</Text>
        </View>

        <View style={styles.questionBox}>
          <Text style={styles.question}>
            "Did yesterday differ from your usual eating?"
          </Text>
        </View>

        <View style={styles.responses}>
          <Text style={styles.responseText}>If no — you're done.</Text>
          <Text style={styles.responseText}>If yes — log the change.</Text>
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
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#3D5A5C',
    lineHeight: 28,
  },
  questionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D5A5C',
    lineHeight: 28,
  },
  responses: {
    gap: 12,
  },
  responseText: {
    fontSize: 16,
    color: '#3D5A5C',
    lineHeight: 24,
  },
});