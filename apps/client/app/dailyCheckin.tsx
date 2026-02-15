import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getLocalDateString } from '@haven/shared-utils';

export default function DailyCheckInScreen() {
  const [hasUnloggedFood, setHasUnloggedFood] = useState<boolean | null>(null);
  
  // Workout tracking states
  const [workedOutYesterday, setWorkedOutYesterday] = useState<boolean | null>(null);
  const [knowsCalories, setKnowsCalories] = useState<boolean | null>(null);
  const [manualCalories, setManualCalories] = useState('');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'intense' | null>(null);
  const [duration, setDuration] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [userWeight, setUserWeight] = useState(220); // Will load from profile

  useEffect(() => {
    loadUserProfile();
    checkIfAlreadyCheckedIn();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { data, error } = await supabase
        .from('profiles')
        .select('weight_lbs, weight_kg, unit_system')
        .eq('id', user.id)
        .single();
  
      if (error) {
        console.error('Error loading profile:', error);
        return;
      }
  
      // Determine weight in lbs (needed for calorie calculation)
      let weightInLbs = 220; // Default fallback
  
      if (data) {
        if (data.weight_lbs) {
          // User has weight in lbs
          weightInLbs = data.weight_lbs;
        } else if (data.weight_kg) {
          // User has weight in kg, convert to lbs
          weightInLbs = data.weight_kg * 2.205;
        }
      }
  
      setUserWeight(weightInLbs);
      
      console.log('✅ Loaded user weight:', weightInLbs, 'lbs');
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    }
  };
  const checkIfAlreadyCheckedIn = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayDate = getLocalDateString();

      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', todayDate)
        .maybeSingle();

      if (error) {
        console.error('Error checking check-in status:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setHasCheckedIn(true);
        setHasUnloggedFood(data.has_unlogged_food);
        setWorkedOutYesterday(data.workout_completed);
        
        if (data.workout_calories_burned) {
          setManualCalories(data.workout_calories_burned.toString());
          setKnowsCalories(true);
        }
        
        if (data.workout_intensity) {
          setIntensity(data.workout_intensity);
          setKnowsCalories(false);
        }
        
        if (data.workout_duration_minutes) {
          setDuration(data.workout_duration_minutes.toString());
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in checkIfAlreadyCheckedIn:', error);
      setLoading(false);
    }
  };

  // Calculate calories from intensity + duration
  const calculateCalories = (
    intensityLevel: 'light' | 'moderate' | 'intense',
    durationMinutes: number
  ): number => {
    const MET = {
      light: 3.5,
      moderate: 6.0,
      intense: 9.0
    };
    
    const weightKg = userWeight / 2.205;
    const hours = durationMinutes / 60;
    const calories = MET[intensityLevel] * weightKg * hours;
    
    return Math.round(calories);
  };

  const handleSave = async () => {
    // Validation
    if (hasUnloggedFood === null) {
      Alert.alert('Please answer', 'Let us know if you had any unlogged food');
      return;
    }

    if (workedOutYesterday === null) {
      Alert.alert('Please answer', 'Let us know if you worked out yesterday');
      return;
    }

    // If they worked out, validate calorie tracking
    if (workedOutYesterday) {
      if (knowsCalories === null) {
        Alert.alert('Please answer', 'Do you know how many calories you burned?');
        return;
      }

      if (knowsCalories) {
        // Manual input validation
        if (!manualCalories || parseInt(manualCalories) <= 0) {
          Alert.alert('Invalid input', 'Please enter calories burned');
          return;
        }
      } else {
        // Calculator validation
        if (!intensity) {
          Alert.alert('Please select', 'Select your workout intensity');
          return;
        }
        if (!duration || parseInt(duration) <= 0) {
          Alert.alert('Invalid input', 'Please enter workout duration');
          return;
        }
      }
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        setSaving(false);
        return;
      }

      const todayDate = getLocalDateString();

      // Calculate final calories
      let caloriesBurned: number | null = null;
      if (workedOutYesterday) {
        if (knowsCalories) {
          caloriesBurned = parseInt(manualCalories);
        } else {
          caloriesBurned = calculateCalories(
            intensity!,
            parseInt(duration)
          );
        }
      }

      // Save to database
      const { error } = await supabase
        .from('check_ins')
        .upsert({
          user_id: user.id,
          check_in_date: todayDate,
          has_unlogged_food: hasUnloggedFood,
          workout_completed: workedOutYesterday,
          workout_calories_burned: caloriesBurned,
          workout_intensity: intensity,
          workout_duration_minutes: duration ? parseInt(duration) : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,check_in_date'
        });

      if (error) {
        console.error('Error saving check-in:', error);
        Alert.alert('Error', 'Failed to save check-in');
        setSaving(false);
        return;
      }

      setSaving(false);

      // Navigation logic
      if (hasUnloggedFood) {
        Alert.alert(
          'Success',
          'Check-in saved! Now let\'s log that food.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/log'),
            }
          ]
        );
      } else {
        Alert.alert('Success', 'Check-in saved!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          }
        ]);
      }

    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Something went wrong');
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Just go back - we won't prompt again today since the check ran once
    router.back();
  };

  // Check if save button should be enabled
  const canSave = () => {
    if (hasUnloggedFood === null || workedOutYesterday === null) return false;
    
    if (workedOutYesterday) {
      if (knowsCalories === null) return false;
      if (knowsCalories && !manualCalories) return false;
      if (!knowsCalories && (!intensity || !duration)) return false;
    }
    
    return true;
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
        style={styles.container}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.graphite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Check-in</Text>
        <View style={styles.headerSpacer} />
      </View>
      
        {hasCheckedIn && (
        <View style={styles.alreadyCheckedInBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#206E6B" />
          <Text style={styles.bannerText}>
            Already checked in today • You can update your answers below
          </Text>
        </View>
)}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Question 1: Unlogged Food */}
          <View style={styles.questionCard}>
            <Text style={styles.question}>
              Did you have any late-night snacks or food you forgot to log yesterday?
            </Text>
            <Text style={styles.subtitle}>
              {hasCheckedIn ? 'You can update your response' : 'Help us keep your tracking accurate'}
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                hasUnloggedFood === true && styles.optionButtonSelected,
              ]}
              onPress={() => setHasUnloggedFood(true)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                hasUnloggedFood === true && styles.iconContainerSelected,
              ]}>
                <Ionicons
                  name="fast-food"
                  size={28}
                  color={hasUnloggedFood === true ? '#FFFFFF' : '#206E6B'}
                />
              </View>
              <Text style={[
                styles.optionText,
                hasUnloggedFood === true && styles.optionTextSelected,
              ]}>
                Yes
              </Text>
              <Text style={styles.optionSubtext}>
                I had unlogged food
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                hasUnloggedFood === false && styles.optionButtonSelected,
              ]}
              onPress={() => setHasUnloggedFood(false)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                hasUnloggedFood === false && styles.iconContainerSelected,
              ]}>
                <Ionicons
                  name="checkmark-circle"
                  size={28}
                  color={hasUnloggedFood === false ? '#FFFFFF' : '#206E6B'}
                />
              </View>
              <Text style={[
                styles.optionText,
                hasUnloggedFood === false && styles.optionTextSelected,
              ]}>
                No
              </Text>
              <Text style={styles.optionSubtext}>
                Everything logged
              </Text>
            </TouchableOpacity>
          </View>

          {/* Question 2: Yesterday's Workout */}
          <View style={[styles.questionCard, { marginTop: 24 }]}>
            <Text style={styles.question}>
              Did you work out yesterday?
            </Text>
            <Text style={styles.subtitle}>
              This helps us calculate your accurate maintenance calories
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                workedOutYesterday === true && styles.optionButtonSelected,
              ]}
              onPress={() => setWorkedOutYesterday(true)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                workedOutYesterday === true && styles.iconContainerSelected,
              ]}>
                <Ionicons
                  name="fitness"
                  size={28}
                  color={workedOutYesterday === true ? '#FFFFFF' : '#206E6B'}
                />
              </View>
              <Text style={[
                styles.optionText,
                workedOutYesterday === true && styles.optionTextSelected,
              ]}>
                Yes
              </Text>
              <Text style={styles.optionSubtext}>
                I worked out
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                workedOutYesterday === false && styles.optionButtonSelected,
              ]}
              onPress={() => {
                setWorkedOutYesterday(false);
                setKnowsCalories(null);
                setManualCalories('');
                setIntensity(null);
                setDuration('');
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                workedOutYesterday === false && styles.iconContainerSelected,
              ]}>
                <Ionicons
                  name="bed"
                  size={28}
                  color={workedOutYesterday === false ? '#FFFFFF' : '#206E6B'}
                />
              </View>
              <Text style={[
                styles.optionText,
                workedOutYesterday === false && styles.optionTextSelected,
              ]}>
                No
              </Text>
              <Text style={styles.optionSubtext}>
                Rest day
              </Text>
            </TouchableOpacity>
          </View>

          {/* If worked out, ask about calories */}
          {workedOutYesterday === true && (
            <>
              <View style={[styles.questionCard, { marginTop: 24 }]}>
                <Text style={styles.question}>
                  Do you know how many calories you burned?
                </Text>
              </View>

              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    knowsCalories === true && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    setKnowsCalories(true);
                    setIntensity(null);
                    setDuration('');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.iconContainer,
                    knowsCalories === true && styles.iconContainerSelected,
                  ]}>
                    <Ionicons
                      name="checkmark-circle"
                      size={28}
                      color={knowsCalories === true ? '#FFFFFF' : '#206E6B'}
                    />
                  </View>
                  <Text style={[
                    styles.optionText,
                    knowsCalories === true && styles.optionTextSelected,
                  ]}>
                    Yes
                  </Text>
                  <Text style={styles.optionSubtext}>
                    I know the number
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    knowsCalories === false && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    setKnowsCalories(false);
                    setManualCalories('');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.iconContainer,
                    knowsCalories === false && styles.iconContainerSelected,
                  ]}>
                    <Ionicons
                      name="calculator"
                      size={28}
                      color={knowsCalories === false ? '#FFFFFF' : '#206E6B'}
                    />
                  </View>
                  <Text style={[
                    styles.optionText,
                    knowsCalories === false && styles.optionTextSelected,
                  ]}>
                    No
                  </Text>
                  <Text style={styles.optionSubtext}>
                    Calculate it
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Manual Calorie Input */}
              {knowsCalories === true && (
                <View style={[styles.inputCard, { marginTop: 16 }]}>
                  <Text style={styles.inputLabel}>Enter calories burned</Text>
                  <TextInput
                    style={styles.input}
                    value={manualCalories}
                    onChangeText={setManualCalories}
                    placeholder="e.g., 350"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}

              {/* Calculator */}
              {knowsCalories === false && (
                <>
                  <View style={[styles.questionCard, { marginTop: 24 }]}>
                    <Text style={styles.question}>What was the intensity?</Text>
                  </View>

                  <View style={styles.intensityContainer}>
                    <TouchableOpacity
                      style={[
                        styles.intensityButton,
                        intensity === 'light' && styles.intensityButtonSelected,
                      ]}
                      onPress={() => setIntensity('light')}
                    >
                      <Text style={[
                        styles.intensityText,
                        intensity === 'light' && styles.intensityTextSelected,
                      ]}>
                        Light
                      </Text>
                      <Text style={styles.intensitySubtext}>
                        Walking, stretching, yoga
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.intensityButton,
                        intensity === 'moderate' && styles.intensityButtonSelected,
                      ]}
                      onPress={() => setIntensity('moderate')}
                    >
                      <Text style={[
                        styles.intensityText,
                        intensity === 'moderate' && styles.intensityTextSelected,
                      ]}>
                        Moderate
                      </Text>
                      <Text style={styles.intensitySubtext}>
                        Jogging, cycling, swimming
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.intensityButton,
                        intensity === 'intense' && styles.intensityButtonSelected,
                      ]}
                      onPress={() => setIntensity('intense')}
                    >
                      <Text style={[
                        styles.intensityText,
                        intensity === 'intense' && styles.intensityTextSelected,
                      ]}>
                        Intense
                      </Text>
                      <Text style={styles.intensitySubtext}>
                        HIIT, running, heavy lifting
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.inputCard, { marginTop: 16 }]}>
                    <Text style={styles.inputLabel}>How long? (minutes)</Text>
                    <TextInput
                      style={styles.input}
                      value={duration}
                      onChangeText={setDuration}
                      placeholder="e.g., 45"
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* Show calculated calories */}
                  {intensity && duration && parseInt(duration) > 0 && (
                    <View style={styles.calculatedCard}>
                      <Text style={styles.calculatedLabel}>Estimated calories burned:</Text>
                      <Text style={styles.calculatedValue}>
                        {calculateCalories(intensity, parseInt(duration))} cal
                      </Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}

          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
          <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
      >
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!canSave() || saving) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!canSave() || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {hasCheckedIn ? 'Update Check-in' : 'Save Check-in'}
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
  alreadyCheckedInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomColor: '#206E6B',
    gap: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#206E6B',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  question: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 8,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.steelBlue,
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
    fontSize: 18,
    fontWeight: '700',
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
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.graphite,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  intensityContainer: {
    gap: 12,
  },
  intensityButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  intensityButtonSelected: {
    borderColor: '#206E6B',
    backgroundColor: '#F0F9F8',
  },
  intensityText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 4,
  },
  intensityTextSelected: {
    color: '#206E6B',
  },
  intensitySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  calculatedCard: {
    backgroundColor: '#F0F9F8',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#206E6B',
    alignItems: 'center',
  },
  calculatedLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  calculatedValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#206E6B',
  },
  bottomPadding: {
    height: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap:12,
  },
  skipButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
  },
  saveButton: {
    backgroundColor: '#206E6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});