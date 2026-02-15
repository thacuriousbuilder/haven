
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { Ionicons } from '@expo/vector-icons';

export default function HeightWeightScreen() {
  const { data, updateData } = useOnboarding();
  
  const [isMetric, setIsMetric] = useState(false);
  
 
  const [heightFeet, setHeightFeet] = useState(data.heightFeet?.toString() || '');
  const [heightInches, setHeightInches] = useState(data.heightInches?.toString() || '');
  const [currentWeight, setCurrentWeight] = useState(data.currentWeight?.toString() || '');
  

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
  
    if (isMetric) {
      if (!heightCm || !weightKg) {
        Alert.alert('Required', 'Please enter your height and weight');
        return;
      }
      const cm = parseInt(heightCm);
      const kg = parseInt(weightKg);
      if (cm < 100 || cm > 250) {
        Alert.alert('Invalid Height', 'Please enter a valid height (100-250 cm)');
        return;
      }
      if (kg < 30 || kg > 250) {
        Alert.alert('Invalid Weight', 'Please enter a valid weight (30-250 kg)');
        return;
      }
    } else {
      if (!heightFeet || !heightInches || !currentWeight) {
        Alert.alert('Required', 'Please enter your height and weight');
        return;
      }
      const feet = parseInt(heightFeet);
      const inches = parseInt(heightInches);
      const lbs = parseInt(currentWeight);
      if (feet < 3 || feet > 8) {
        Alert.alert('Invalid Height', 'Please enter a valid height (3-8 feet)');
        return;
      }
      if (lbs < 50 || lbs > 500) {
        Alert.alert('Invalid Weight', 'Please enter a valid weight (50-500 lbs)');
        return;
      }
    }

    let finalHeightFeet: number;
    let finalHeightInches: number;
    let finalWeight: number;

    if (isMetric) {
    
      const cm = parseInt(heightCm);
      const kg = parseInt(weightKg);
      
      const totalInches = Math.round(cm / 2.54);
      finalHeightFeet = Math.floor(totalInches / 12);
      finalHeightInches = totalInches % 12;
      finalWeight = Math.round(kg * 2.20462);
    } else {
      // Use imperial values directly
      finalHeightFeet = parseInt(heightFeet);
      finalHeightInches = parseInt(heightInches);
      finalWeight = parseInt(currentWeight);
    }

    updateData({
      heightFeet: finalHeightFeet,
      heightInches: finalHeightInches,
      currentWeight: finalWeight,
    });
    
    router.push('/(onboarding)/whyWorks1');
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
    if (num === '' || parseInt(num) <= 500) {
      setCurrentWeight(num);
    }
  };

  const handleCmChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '' || parseInt(num) <= 250) {
      setHeightCm(num);
    }
  };

  const handleKgChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '' || parseInt(num) <= 250) {
      setWeightKg(num);
    }
  };

  const isFormValid = () => {
    if (isMetric) {
      return heightCm !== '' && weightKg !== '';
    } else {
      return heightFeet !== '' && heightInches !== '' && currentWeight !== '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={4} totalSteps={15} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          
          <Text style={styles.title}>Height and weight</Text>
          <Text style={styles.description}>This helps us personalize your plan.</Text>

          
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
            
              <View style={styles.inputSection}>
                <Text style={styles.sectionLabel}>Height</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, styles.fullWidthInput]}
                    value={heightCm}
                    onChangeText={handleCmChange}
                    keyboardType="number-pad"
                    maxLength={3}
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

          
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              We use your height and weight to calculate your baseline metabolic rate and personalize your calorie targets.
            </Text>
          </View>
        </ScrollView>

   
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !isFormValid() && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!isFormValid()}
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
    backgroundColor: '#131311',
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
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 24,
    lineHeight: 20,
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
    color: '#000',
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
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