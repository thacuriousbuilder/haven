import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';
import { Ionicons } from '@expo/vector-icons';

export default function GoalWeightScreen() {
  const { data, updateData } = useOnboarding();
  
  const [isMetric, setIsMetric] = useState(false);
  
  // Imperial state
  const [goalWeightLbs, setGoalWeightLbs] = useState(() => {
    if (data.goalWeight) {
      return data.goalWeight.toString();
    }
    return '';
  });
  
  // Metric state (converted from imperial if exists)
  const [goalWeightKg, setGoalWeightKg] = useState(() => {
    if (data.goalWeight) {
      return Math.round(data.goalWeight * 0.453592).toString();
    }
    return '';
  });

  const handleContinue = () => {
    let finalGoalWeight: number;

    if (isMetric) {
      // Convert metric to imperial for storage
      const kg = parseInt(goalWeightKg) || 68;
      finalGoalWeight = Math.round(kg * 2.20462);
    } else {
      // Use imperial values directly
      finalGoalWeight = parseInt(goalWeightLbs) || 150;
    }

    updateData({ goalWeight: finalGoalWeight });
    router.push('/(onboarding)/whyWorks1');
  };

  const handleLbsChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    // Allow any numeric input while typing - validate on continue
    if (num === '' || parseInt(num) <= 500) {
      setGoalWeightLbs(num);
    }
  };

  const handleKgChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    // Allow any numeric input while typing - validate on continue
    if (num === '' || parseInt(num) <= 250) {
      setGoalWeightKg(num);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={9} totalSteps={16} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What is your goal weight?</Text>
        <Text style={styles.description}>This will be used to tailor your plan.</Text>

        {/* Unit Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !isMetric && styles.toggleButtonActive]}
            onPress={() => setIsMetric(false)}
          >
            <Text style={[styles.toggleText, !isMetric && styles.toggleTextActive]}>
              Imperial
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, isMetric && styles.toggleButtonActive]}
            onPress={() => setIsMetric(true)}
          >
            <Text style={[styles.toggleText, isMetric && styles.toggleTextActive]}>
              Metric
            </Text>
          </TouchableOpacity>
        </View>

        {!isMetric ? (
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>Goal Weight</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, styles.fullWidthInput]}
                value={goalWeightLbs}
                onChangeText={handleLbsChange}
                keyboardType="number-pad"
                maxLength={3}
                placeholderTextColor="#9CA3AF"
                autoComplete='off'
                textContentType='oneTimeCode'
                autoCorrect={false}
                autoCapitalize='none'
              />
              <Text style={styles.unitLabel}>lbs</Text>
            </View>
          </View>
        ) : (
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>Goal Weight</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, styles.fullWidthInput]}
                value={goalWeightKg}
                onChangeText={handleKgChange}
                keyboardType="number-pad"
                maxLength={3}
                placeholderTextColor="#9CA3AF"
                autoComplete='off'
                textContentType='none'
                autoCorrect={false}
                autoCapitalize='none'
              />
              <Text style={styles.unitLabel}>kg</Text>
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            Don't worry, you can always change it later.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

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
    paddingTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#D1D5DB',
    borderRadius: 24,
    padding: 4,
    marginBottom: 32,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  toggleTextActive: {
    color: '#3D5A5C',
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    padding: 0,
    textAlign: 'center',
  },
  fullWidthInput: {
    textAlign: 'left',
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});