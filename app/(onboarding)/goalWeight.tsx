
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import { Ionicons } from '@expo/vector-icons';

export default function GoalWeightScreen() {
  const { data, updateData } = useOnboarding();
  
  const [isMetric, setIsMetric] = useState(false);
  
  
  const [goalWeightLbs, setGoalWeightLbs] = useState(() => {
    if (data.goalWeight) {
      return data.goalWeight.toString();
    }
    return '';
  });
  

  const [goalWeightKg, setGoalWeightKg] = useState(() => {
    if (data.goalWeight) {
      return Math.round(data.goalWeight * 0.453592).toString();
    }
    return '';
  });

  const handleContinue = () => {
    
    if (isMetric) {
      if (!goalWeightKg) {
        Alert.alert('Required', 'Please enter your goal weight');
        return;
      }
      const kg = parseInt(goalWeightKg);
      if (kg < 30 || kg > 250) {
        Alert.alert('Invalid Weight', 'Please enter a valid goal weight (30-250 kg)');
        return;
      }
    } else {
      if (!goalWeightLbs) {
        Alert.alert('Required', 'Please enter your goal weight');
        return;
      }
      const lbs = parseInt(goalWeightLbs);
      if (lbs < 50 || lbs > 500) {
        Alert.alert('Invalid Weight', 'Please enter a valid goal weight (50-500 lbs)');
        return;
      }
    }

    let finalGoalWeight: number;

    if (isMetric) {
      const kg = parseInt(goalWeightKg);
      finalGoalWeight = Math.round(kg * 2.20462);
    } else {
      finalGoalWeight = parseInt(goalWeightLbs);
    }

    updateData({ goalWeight: finalGoalWeight });
    router.push('/(onboarding)/whyWorks1');
  };

  const handleLbsChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '' || parseInt(num) <= 500) {
      setGoalWeightLbs(num);
    }
  };

  const handleKgChange = (text: string) => {
    const num = text.replace(/[^0-9]/g, '');
    if (num === '' || parseInt(num) <= 250) {
      setGoalWeightKg(num);
    }
  };

  const isFormValid = () => {
    if (isMetric) {
      return goalWeightKg !== '';
    } else {
      return goalWeightLbs !== '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={9} totalSteps={14} />
      
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>What is your goal weight?</Text>
          <Text style={styles.description}>This will be used to tailor your plan.</Text>

      
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
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
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
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />
                <Text style={styles.unitLabel}>kg</Text>
              </View>
            </View>
          )}

         
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              Don't worry, you can always change it later.
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
    color: '#000',
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