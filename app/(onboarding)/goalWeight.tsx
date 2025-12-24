import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';
import { Picker } from '@react-native-picker/picker';

export default function GoalWeightScreen() {
  const { data, updateData } = useOnboarding();
  
  const [goalWeight, setGoalWeight] = useState(data.goalWeight || 150);

  const handleContinue = () => {
    updateData({ goalWeight });
    router.push('/(onboarding)/whyWorks1');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={7} totalSteps={15} />
      
      <View style={styles.content}>
        
        <Text style={styles.title}>What is your goal weight?</Text>
        <Text style={styles.description}>This will be use to tailor your plan.</Text>

        <View style={styles.pickerContainer}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={goalWeight}
              onValueChange={setGoalWeight}
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

        <Text style={styles.footnote}>Don't worry you can always change it later.</Text>
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
  pickerContainer: {
    marginTop: 24,
  },
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    height: 200,
  },
  picker: {
    height: '100%',
    width: '100%',
  },
  pickerItem: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3D5A5C',
  },
  footnote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
});