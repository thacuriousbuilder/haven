import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';

export default function FoodLogScreen() {
  const handleContinue = () => {
    router.push('/(onboarding)/checkin1');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={12} totalSteps={15} />
      
      <View style={styles.content}>
        <Text style={styles.title}>What did you eat today?</Text>

        <View style={styles.options}>
          <View style={styles.optionCard}>
            <Ionicons name="create-outline" size={32} color="#3D5A5C" />
            <Text style={styles.optionText}>Manual input</Text>
          </View>

          <View style={styles.optionCard}>
            <Ionicons name="camera-outline" size={32} color="#3D5A5C" />
            <Text style={styles.optionText}>Scan food</Text>
          </View>

          <View style={styles.optionCard}>
            <Ionicons name="search-outline" size={32} color="#3D5A5C" />
            <Text style={styles.optionText}>Food database</Text>
          </View>
        </View>

        <Text style={styles.footnote}>
          Don't worry about accuracy. This is just to learn patterns.
        </Text>
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
    marginBottom: 48,
  },
  options: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D5A5C',
  },
  footnote: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 32,
    lineHeight: 22,
  },
});