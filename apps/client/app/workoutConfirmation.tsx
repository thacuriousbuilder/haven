import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { adjustCaloriesForWorkout } from '@/utils/budgetAdjustment';
import { getLocalDateString, getYesterdayDateString } from '@haven/shared-utils';

export default function WorkoutConfirmationScreen() {
  const params = useLocalSearchParams();
  const checkInId = params.checkInId as string | undefined;
  
  const [workoutCompleted, setWorkoutCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Calorie input states
  const [knowsCalories, setKnowsCalories] = useState<boolean | null>(null);
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate');
  const [duration, setDuration] = useState('');
  
  // Check-in data
  const [checkInDate, setCheckInDate] = useState<string>('');
  const [workoutTime, setWorkoutTime] = useState<string>('');

  useEffect(() => {
    loadCheckInData();
  }, []);

  const loadCheckInData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get today's check-in (the one with workout planned)
      const today = getLocalDateString();
      
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', today)
        .eq('workout_planned', true)
        .maybeSingle();

      if (error) {
        console.error('Error loading check-in:', error);
        Alert.alert('Error', 'Could not load workout data');
        setLoading(false);
        return;
      }

      if (!data) {
        Alert.alert('No Workout Found', 'No workout was scheduled for today.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        setLoading(false);
        return;
      }

      setCheckInDate(data.check_in_date);
      setWorkoutTime(data.workout_time || '');
      setWorkoutCompleted(data.workout_completed);
      
      setLoading(false);
    } catch (error) {
      console.error('Error in loadCheckInData:', error);
      setLoading(false);
    }
  };

  const calculateCalories = (intensity: 'light' | 'moderate' | 'intense', durationMinutes: number): number => {
    const rates = {
      light: 4,      // 4 cal/min (walking, yoga)
      moderate: 7,   // 7 cal/min (jogging, cycling)
      intense: 10,   // 10 cal/min (HIIT, running)
    };
    
    return Math.round(rates[intensity] * durationMinutes);
  };

  const handleContinue = () => {
    if (workoutCompleted === null) {
      Alert.alert('Please select', 'Did you complete your workout?');
      return;
    }

    if (workoutCompleted === false) {
      // User didn't work out - just save and exit
      handleSaveNoWorkout();
    } else {
      // User did work out - continue to save with calories
      handleSaveWithWorkout();
    }
  };

  const handleSaveNoWorkout = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('check_ins')
        .update({
          workout_completed: false,
          workout_calories_burned: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('check_in_date', checkInDate);

      if (error) {
        console.error('Error saving:', error);
        Alert.alert('Error', 'Failed to save');
        setSaving(false);
        return;
      }

      setSaving(false);
      Alert.alert('Got it!', 'No worries, focus on tomorrow 💪', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error in handleSaveNoWorkout:', error);
      setSaving(false);
    }
  };
  const handleSaveWithWorkout = async () => {
    // Validate calorie input
    if (knowsCalories === null) {
      Alert.alert('Please answer', 'Do you know how many calories you burned?');
      return;
    }
  
    let finalCalories = 0;
  
    if (knowsCalories === true) {
      // Manual input
      if (!caloriesBurned || parseInt(caloriesBurned) <= 0) {
        Alert.alert('Invalid input', 'Please enter calories burned');
        return;
      }
      finalCalories = parseInt(caloriesBurned);
    } else {
      // Calculator
      if (!duration || parseInt(duration) <= 0) {
        Alert.alert('Invalid input', 'Please enter workout duration');
        return;
      }
      finalCalories = calculateCalories(intensity, parseInt(duration));
    }
  
    setSaving(true);
  
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return;
      }
  
      // Prepare update data
      const updateData: any = {
        workout_completed: true,
        workout_calories_burned: finalCalories,
        updated_at: new Date().toISOString(),
      };
  
      // Add calculator data if used
      if (knowsCalories === false) {
        updateData.workout_intensity = intensity;
        updateData.workout_duration_minutes = parseInt(duration);
      }
  
      // Step 1: Save workout to check_ins table
      const { error: saveError } = await supabase
        .from('check_ins')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('check_in_date', checkInDate);
  
      if (saveError) {
        console.error('Error saving workout:', saveError);
        Alert.alert('Error', 'Failed to save workout');
        setSaving(false);
        return;
      }
  
      console.log('✅ Workout saved to check_ins');
  
      // Step 2: Adjust calorie budget
      const { success, error: budgetError } = await adjustCaloriesForWorkout(
        user.id,
        checkInDate,
        finalCalories
      );
  
      if (!success) {
        console.error('Budget adjustment failed:', budgetError);
        // Don't block the user - workout is already saved
        Alert.alert(
          'Workout Saved',
          'Your workout was logged, but there was an issue updating your budget. Please contact support if this persists.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        setSaving(false);
        return;
      }
  
      console.log('✅ Budget adjusted successfully');
  
      setSaving(false);
      Alert.alert(
        'Workout Logged! 🎉', 
        `You burned ${finalCalories} calories. Your weekly budget has been updated.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error in handleSaveWithWorkout:', error);
      Alert.alert('Error', 'Something went wrong');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#206E6B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#206E6B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout Check</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Question Card */}
            <View style={styles.questionCard}>
              <View style={styles.workoutIconContainer}>
                <Ionicons name="fitness" size={32} color="#206E6B" />
              </View>
              <Text style={styles.question}>
                Did you complete your workout?
              </Text>
              {workoutTime && (
                <Text style={styles.subtitle}>
                  You planned to work out at{' '}
                  {new Date(`2000-01-01T${workoutTime}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
              )}
            </View>

            {/* Yes/No Options */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  workoutCompleted === true && styles.optionButtonSelected,
                ]}
                onPress={() => setWorkoutCompleted(true)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  workoutCompleted === true && styles.iconContainerSelected,
                ]}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={28} 
                    color={workoutCompleted === true ? '#FFFFFF' : '#206E6B'} 
                  />
                </View>
                <Text style={[
                  styles.optionText,
                  workoutCompleted === true && styles.optionTextSelected,
                ]}>
                  Yes
                </Text>
                <Text style={styles.optionSubtext}>
                  I completed it
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  workoutCompleted === false && styles.optionButtonSelected,
                ]}
                onPress={() => setWorkoutCompleted(false)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  workoutCompleted === false && styles.iconContainerSelected,
                ]}>
                  <Ionicons 
                    name="close-circle" 
                    size={28} 
                    color={workoutCompleted === false ? '#FFFFFF' : '#9CA3AF'} 
                  />
                </View>
                <Text style={[
                  styles.optionText,
                  workoutCompleted === false && styles.optionTextSelected,
                ]}>
                  No
                </Text>
                <Text style={styles.optionSubtext}>
                  Didn't happen
                </Text>
              </TouchableOpacity>
            </View>

            {/* Calorie Input Section (shows when workout completed = Yes) */}
            {workoutCompleted === true && (
              <View style={styles.calorieInputSection}>
                {/* Question: Do you know calories? */}
                <View style={styles.calorieQuestionCard}>
                  <Text style={styles.calorieQuestion}>
                    Do you know how many calories you burned?
                  </Text>
                  
                  <View style={styles.calorieToggleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.calorieToggleButton,
                        knowsCalories === true && styles.calorieToggleButtonActive,
                      ]}
                      onPress={() => {
                        setKnowsCalories(true);
                        setCaloriesBurned('');
                      }}
                    >
                      <Text style={[
                        styles.calorieToggleText,
                        knowsCalories === true && styles.calorieToggleTextActive,
                      ]}>
                        Yes
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.calorieToggleButton,
                        knowsCalories === false && styles.calorieToggleButtonActive,
                      ]}
                      onPress={() => {
                        setKnowsCalories(false);
                        setCaloriesBurned('');
                      }}
                    >
                      <Text style={[
                        styles.calorieToggleText,
                        knowsCalories === false && styles.calorieToggleTextActive,
                      ]}>
                        No
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Manual Input (if knows calories) */}
                {knowsCalories === true && (
                  <View style={styles.manualInputCard}>
                    <Text style={styles.inputLabel}>Calories burned</Text>
                    <TextInput
                      style={styles.calorieInput}
                      value={caloriesBurned}
                      onChangeText={setCaloriesBurned}
                      placeholder="e.g., 350"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                  </View>
                )}

                {/* Calculator (if doesn't know calories) */}
                {knowsCalories === false && (
                  <View style={styles.calculatorCard}>
                    <Text style={styles.calculatorTitle}>Let's estimate</Text>
                    
                    {/* Intensity Selection */}
                    <View style={styles.intensitySection}>
                      <Text style={styles.inputLabel}>Workout intensity</Text>
                      <View style={styles.intensityOptions}>
                        <TouchableOpacity
                          style={[
                            styles.intensityButton,
                            intensity === 'light' && styles.intensityButtonActive,
                          ]}
                          onPress={() => setIntensity('light')}
                        >
                          <Ionicons 
                            name="walk" 
                            size={20} 
                            color={intensity === 'light' ? '#FFFFFF' : '#206E6B'} 
                          />
                          <Text style={[
                            styles.intensityText,
                            intensity === 'light' && styles.intensityTextActive,
                          ]}>
                            Light
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.intensityButton,
                            intensity === 'moderate' && styles.intensityButtonActive,
                          ]}
                          onPress={() => setIntensity('moderate')}
                        >
                          <Ionicons 
                            name="bicycle" 
                            size={20} 
                            color={intensity === 'moderate' ? '#FFFFFF' : '#206E6B'} 
                          />
                          <Text style={[
                            styles.intensityText,
                            intensity === 'moderate' && styles.intensityTextActive,
                          ]}>
                            Moderate
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.intensityButton,
                            intensity === 'intense' && styles.intensityButtonActive,
                          ]}
                          onPress={() => setIntensity('intense')}
                        >
                          <Ionicons 
                            name="flame" 
                            size={20} 
                            color={intensity === 'intense' ? '#FFFFFF' : '#206E6B'} 
                          />
                          <Text style={[
                            styles.intensityText,
                            intensity === 'intense' && styles.intensityTextActive,
                          ]}>
                            Intense
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Duration Input */}
                    <View style={styles.durationSection}>
                      <Text style={styles.inputLabel}>Duration (minutes)</Text>
                      <TextInput
                        style={styles.durationInput}
                        value={duration}
                        onChangeText={setDuration}
                        placeholder="e.g., 45"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                    </View>

                    {/* Calculated Result */}
                    {duration && parseInt(duration) > 0 && (
                      <View style={styles.calculatedResult}>
                        <Ionicons name="flash" size={20} color="#EF7828" />
                        <Text style={styles.calculatedText}>
                          Estimated: <Text style={styles.calculatedValue}>
                            {calculateCalories(intensity, parseInt(duration))} calories
                          </Text>
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (workoutCompleted === null || saving) && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={workoutCompleted === null || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>
                {workoutCompleted === false ? 'Save' : 'Save Workout'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFAF5',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.graphite,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  workoutIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F9F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  question: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.steelBlue,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  optionButtonSelected: {
    borderColor: '#206E6B',
    backgroundColor: '#F0F9F8',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F9F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconContainerSelected: {
    backgroundColor: '#206E6B',
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 4,
  },
  optionTextSelected: {
    color: '#206E6B',
  },
  optionSubtext: {
    fontSize: 13,
    color: Colors.steelBlue,
    textAlign: 'center',
  },
  calorieInputSection: {
    marginTop: 24,
  },
  calorieQuestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  calorieQuestion: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 16,
    textAlign: 'center',
  },
  calorieToggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  calorieToggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  calorieToggleButtonActive: {
    backgroundColor: '#F0F9F8',
    borderColor: '#206E6B',
  },
  calorieToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
  },
  calorieToggleTextActive: {
    color: '#206E6B',
  },
  manualInputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 8,
  },
  calorieInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.graphite,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calculatorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  calculatorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 20,
  },
  intensitySection: {
    marginBottom: 20,
  },
  intensityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F0F9F8',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 4,
  },
  intensityButtonActive: {
    backgroundColor: '#206E6B',
    borderColor: '#206E6B',
  },
  intensityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#206E6B',
  },
  intensityTextActive: {
    color: '#FFFFFF',
  },
  durationSection: {
    marginBottom: 16,
  },
  durationInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.graphite,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calculatedResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  calculatedText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  calculatedValue: {
    fontWeight: '700',
    color: '#EF7828',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFAF5',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  continueButton: {
    backgroundColor: '#206E6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});