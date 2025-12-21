import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';
import { Picker } from '@react-native-picker/picker';

export default function HeightWeightScreen() {
  const { data, updateData } = useOnboarding();
  
  const [isMetric, setIsMetric] = useState(false);
  const [heightFeet, setHeightFeet] = useState(data.heightFeet || 5);
  const [heightInches, setHeightInches] = useState(data.heightInches || 6);
  const [currentWeight, setCurrentWeight] = useState(data.currentWeight || 150);

  const handleContinue = () => {
    updateData({
      heightFeet,
      heightInches,
      currentWeight,
    });
    router.push('/(onboarding)/activityLevel');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={3} totalSteps={15} />
      
      <View style={styles.content}>

       <Text style={styles.title}>What is your height & weight?</Text>
        <Text style={styles.description}>This will be use to tailor your plan.</Text>

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

        {/* Height and Weight Labels */}
        <View style={styles.labelsRow}>
          <Text style={styles.sectionLabel}>Height</Text>
          <Text style={styles.sectionLabel}>Weight</Text>
        </View>

        {/* Pickers Row */}
        <View style={styles.pickersRow}>
          {/* Height Feet Picker */}
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={heightFeet}
              onValueChange={setHeightFeet}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {Array.from({ length: 7 }, (_, i) => i + 1).map((ft) => (
                <Picker.Item 
                  key={ft} 
                  label={`${ft} ft`} 
                  value={ft}
                />
              ))}
            </Picker>
          </View>

          {/* Height Inches Picker */}
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={heightInches}
              onValueChange={setHeightInches}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {Array.from({ length: 12 }, (_, i) => i).map((inch) => (
                <Picker.Item 
                  key={inch} 
                  label={`${inch} in`} 
                  value={inch}
                />
              ))}
            </Picker>
          </View>

          {/* Weight Picker */}
          <View style={[styles.pickerWrapper, styles.weightPicker]}>
            <Picker
              selectedValue={currentWeight}
              onValueChange={setCurrentWeight}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {Array.from({ length: 301 }, (_, i) => i + 50).map((lb) => (
                <Picker.Item 
                  key={lb} 
                  label={`${lb} lb`} 
                  value={lb}
                />
              ))}
            </Picker>
          </View>
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
    paddingTop: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D5A5C',
    marginTop: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#D1D5DB',
    borderRadius: 24,
    padding: 4,
    marginTop: 32,
    marginBottom: 40,
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
    color: '#000000',
  },
  labelsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  pickersRow: {
    flexDirection: 'row',
    gap: 12,
    height: 200,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  weightPicker: {
    flex: 1.5, // Make weight picker slightly wider
  },
  picker: {
    height: '100%',
    width: '100%',
  },
  pickerItem: {
    fontSize: 18,
    fontWeight: '500',
    color: '#3D5A5C',
    height: 200,
  },
});