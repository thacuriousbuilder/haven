import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';
import { Ionicons } from '@expo/vector-icons';

export default function HeightWeightScreen() {
  const { data, updateData } = useOnboarding();
  
  const [isMetric, setIsMetric] = useState(false);
  
  // Imperial state
  const [heightFeet, setHeightFeet] = useState(data.heightFeet?.toString() || '');
  const [heightInches, setHeightInches] = useState(data.heightInches?.toString() || '');
  const [currentWeight, setCurrentWeight] = useState(data.currentWeight?.toString() || '');
  
  // Metric state (converted from imperial if exists)
  const [heightCm, setHeightCm] = useState(() => {
    if (data.heightFeet && data.heightInches) {
      const totalInches = (data.heightFeet * 12) + data.heightInches;
      return Math.round(totalInches * 2.54).toString();
    }
    return '';
  });
  
  const [weightKg, setWeightKg] = useState(() => {
    if (data.currentWeight) {
      return Math.round(data.currentWeight * 0.453592).toString();
    }
    return '';
  });

  const handleContinue = () => {
    let finalHeightFeet: number;
    let finalHeightInches: number;
    let finalWeight: number;

    if (isMetric) {
      // Convert metric to imperial for storage
      const cm = parseInt(heightCm) || 170;
      const kg = parseInt(weightKg) || 68;
      
      const totalInches = Math.round(cm / 2.54);
      finalHeightFeet = Math.floor(totalInches / 12);
      finalHeightInches = totalInches % 12;
      finalWeight = Math.round(kg * 2.20462);
    } else {
      // Use imperial values directly
      finalHeightFeet = parseInt(heightFeet) || 5;
      finalHeightInches = parseInt(heightInches) || 6;
      finalWeight = parseInt(currentWeight) || 150;
    }

    updateData({
      heightFeet: finalHeightFeet,
      heightInches: finalHeightInches,
      currentWeight: finalWeight,
    });
    
    router.push('/(onboarding)/activityLevel');
  };

  const handleFeetChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '' || (parseInt(num) >= 1 && parseInt(num) <= 8)) {
      setHeightFeet(num);
    }
  };

  const handleInchesChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '' || (parseInt(num) >= 0 && parseInt(num) <= 11)) {
      setHeightInches(num);
    }
  };

  const handleWeightChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    // Allow any numeric input while typing - validate on continue
    if (num === '' || parseInt(num) <= 500) {
      setCurrentWeight(num);
    }
  };

  const handleCmChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    // Allow any numeric input while typing - validate on continue
    if (num === '' || parseInt(num) <= 250) {
      setHeightCm(num);
    }
  };

  const handleKgChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    // Allow any numeric input while typing - validate on continue
    if (num === '' || parseInt(num) <= 250) {
      setWeightKg(num);
    }
  };

  const calculateBMI = () => {
    if (isMetric) {
      const cm = parseInt(heightCm) || 0;
      const kg = parseInt(weightKg) || 0;
      if (cm > 0 && kg > 0) {
        const meters = cm / 100;
        return (kg / (meters * meters)).toFixed(1);
      }
    } else {
      const feet = parseInt(heightFeet) || 0;
      const inches = parseInt(heightInches) || 0;
      const lbs = parseInt(currentWeight) || 0;
      const totalInches = (feet * 12) + inches;
      if (totalInches > 0 && lbs > 0) {
        return ((lbs / (totalInches * totalInches)) * 703).toFixed(1);
      }
    }
    return null;
  };

  const bmi = calculateBMI();

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={5} totalSteps={16} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What is your height & weight?</Text>
        <Text style={styles.description}>This helps us personalize your plan.</Text>

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
          <>
            {/* Imperial Inputs */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>Height</Text>
              <View style={styles.heightInputs}>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    value={heightFeet}
                    onChangeText={handleFeetChange}
                    keyboardType="number-pad"
                    maxLength={1}
                    // placeholder="5"
                    placeholderTextColor="#9CA3AF"
                    autoComplete='off'
                  textContentType='none'
                  autoCorrect={false}
                  autoCapitalize='none'
                  />
                  <Text style={styles.unitLabel}>ft</Text>
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    value={heightInches}
                    onChangeText={handleInchesChange}
                    keyboardType="number-pad"
                    maxLength={2}
                    // placeholder="6"
                    placeholderTextColor="#9CA3AF"
                    autoComplete='off'
                 textContentType='none'
                  autoCorrect={false}
                  autoCapitalize='none'
                  />
                  <Text style={styles.unitLabel}>in</Text>
                </View>
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>Current Weight</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, styles.fullWidthInput]}
                  value={currentWeight}
                  onChangeText={handleWeightChange}
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
          </>
        ) : (
          <>
            {/* Metric Inputs */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>Height</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, styles.fullWidthInput]}
                  value={heightCm}
                  onChangeText={handleCmChange}
                  keyboardType="number-pad"
                  maxLength={3}
                  // placeholder="170"
                  placeholderTextColor="#9CA3AF"
                  autoComplete='off'
                  textContentType='none'
                  autoCorrect={false}
                  autoCapitalize='none'
                />
                <Text style={styles.unitLabel}>cm</Text>
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>Current Weight</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, styles.fullWidthInput]}
                  value={weightKg}
                  onChangeText={handleKgChange}
                  keyboardType="number-pad"
                  maxLength={3}
                  // placeholder="68"
                  placeholderTextColor="#9CA3AF"
                  autoComplete='off'
                  textContentType='none'
                  autoCorrect={false}
                  autoCapitalize='none'
                />
                <Text style={styles.unitLabel}>kg</Text>
              </View>
            </View>
          </>
        )}

        {/* BMI Card
        {bmi && (
          <View style={styles.bmiCard}>
            <View style={styles.bmiHeader}>
              <Ionicons name="fitness-outline" size={24} color="#3D5A5C" />
              <Text style={styles.bmiLabel}>Your BMI</Text>
            </View>
            <Text style={styles.bmiValue}>{bmi}</Text>
            <Text style={styles.bmiDescription}>
              {parseFloat(bmi) < 18.5 && 'Underweight'}
              {parseFloat(bmi) >= 18.5 && parseFloat(bmi) < 25 && 'Normal weight'}
              {parseFloat(bmi) >= 25 && parseFloat(bmi) < 30 && 'Overweight'}
              {parseFloat(bmi) >= 30 && 'Obese'}
            </Text>
          </View>
        )} */}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            We use your height and weight to calculate your baseline metabolic rate and personalize your calorie targets.
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
  heightInputs: {
    flexDirection: 'row',
    gap: 12,
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
  bmiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bmiLabel: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bmiValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 8,
  },
  bmiDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
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