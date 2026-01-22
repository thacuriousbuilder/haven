
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

type GoalType = 'lose' | 'maintain' | 'gain';

interface WeightGoalsData {
  currentWeight: number;
  targetWeight: number;
  goal: GoalType;
  weeklyGoal: number;
  unitSystem: 'imperial' | 'metric';
}

export default function WeightGoalsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<WeightGoalsData>({
    currentWeight: 0,
    targetWeight: 0,
    goal: 'lose',
    weeklyGoal: 1.0,
    unitSystem: 'imperial',
  });

  const weeklyGoalOptions = [0.5, 1, 1.5, 2];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const currentWeight = profile.unit_system === 'imperial' 
        ? profile.weight_lbs 
        : profile.weight_kg;

      const targetWeight = profile.unit_system === 'imperial'
        ? profile.target_weight_lbs
        : profile.target_weight_kg;

      setData({
        currentWeight: currentWeight || 0,
        targetWeight: targetWeight || 0,
        goal: profile.goal || 'lose',
        weeklyGoal: profile.weekly_weight_goal || 1.0,
        unitSystem: profile.unit_system || 'imperial',
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load your data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeline = () => {
    if (data.goal === 'maintain') return null;
    
    const difference = Math.abs(data.targetWeight - data.currentWeight);
    const weeks = Math.ceil(difference / data.weeklyGoal);
    
    return {
      totalLoss: Math.round(difference),
      weeks: weeks,
    };
  };

  const handleSave = async () => {
    // Validation
    if (data.currentWeight <= 0 || data.targetWeight <= 0) {
      Alert.alert('Invalid Input', 'Please enter valid weights');
      return;
    }

    if (data.goal === 'lose' && data.targetWeight >= data.currentWeight) {
      Alert.alert('Invalid Target', 'Target weight must be less than current weight for weight loss');
      return;
    }

    if (data.goal === 'gain' && data.targetWeight <= data.currentWeight) {
      Alert.alert('Invalid Target', 'Target weight must be more than current weight for weight gain');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData = data.unitSystem === 'imperial' ? {
        weight_lbs: data.currentWeight,
        target_weight_lbs: data.targetWeight,
        goal: data.goal,
        weekly_weight_goal: data.weeklyGoal,
      } : {
        weight_kg: data.currentWeight,
        target_weight_kg: data.targetWeight,
        goal: data.goal,
        weekly_weight_goal: data.weeklyGoal,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Your weight goals have been saved!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving goals:', error);
      Alert.alert('Error', 'Failed to save your goals');
    } finally {
      setSaving(false);
    }
  };

  const timeline = calculateTimeline();
  const unit = data.unitSystem === 'imperial' ? 'lbs' : 'kg';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#206E6B" />
        </View>
      </SafeAreaView>
    );
  }

  // UI will be in next step
 // app/weight-goals.tsx
// Replace: return <View />;
// With:

return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Weight Goals</Text>
          <View style={{ width: 40 }} />
        </View>
  
        {/* Current Weight */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="scale-outline" size={24} color="#206E6B" />
            </View>
            <Text style={styles.cardTitle}>Current Weight</Text>
          </View>
  
          <View style={styles.weightInputContainer}>
            <TextInput
              style={styles.weightInput}
              value={data.currentWeight.toString()}
              onChangeText={(text) => {
                const value = parseFloat(text) || 0;
                setData(prev => ({ ...prev, currentWeight: value }));
              }}
              keyboardType="decimal-pad"
              maxLength={4}
            />
            <Text style={styles.unitLabel}>{unit}</Text>
          </View>
        </View>
  
        {/* Goal Selection */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What's your goal?</Text>
          
          <View style={styles.goalOptions}>
            <TouchableOpacity
              style={[
                styles.goalOption,
                data.goal === 'lose' && styles.goalOptionSelected
              ]}
              onPress={() => setData(prev => ({ ...prev, goal: 'lose' }))}
            >
              <Ionicons 
                name="trending-down" 
                size={28} 
                color={data.goal === 'lose' ? '#206E6B' : '#9CA3AF'} 
              />
              <Text style={[
                styles.goalOptionText,
                data.goal === 'lose' && styles.goalOptionTextSelected
              ]}>
                Lose{'\n'}Weight
              </Text>
            </TouchableOpacity>
  
            <TouchableOpacity
              style={[
                styles.goalOption,
                data.goal === 'maintain' && styles.goalOptionSelected
              ]}
              onPress={() => setData(prev => ({ ...prev, goal: 'maintain' }))}
            >
              <Ionicons 
                name="remove" 
                size={28} 
                color={data.goal === 'maintain' ? '#206E6B' : '#9CA3AF'} 
              />
              <Text style={[
                styles.goalOptionText,
                data.goal === 'maintain' && styles.goalOptionTextSelected
              ]}>
                Maintain
              </Text>
            </TouchableOpacity>
  
            <TouchableOpacity
              style={[
                styles.goalOption,
                data.goal === 'gain' && styles.goalOptionSelected
              ]}
              onPress={() => setData(prev => ({ ...prev, goal: 'gain' }))}
            >
              <Ionicons 
                name="trending-up" 
                size={28} 
                color={data.goal === 'gain' ? '#EF7828' : '#9CA3AF'} 
              />
              <Text style={[
                styles.goalOptionText,
                data.goal === 'gain' && styles.goalOptionTextSelected
              ]}>
                Gain{'\n'}Weight
              </Text>
            </TouchableOpacity>
          </View>
        </View>
  
        {/* Target Weight */}
        {data.goal !== 'maintain' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEF3E8' }]}>
                <Ionicons name="radio-button-on-outline" size={24} color="#EF7828" />
              </View>
              <Text style={styles.cardTitle}>Target Weight</Text>
            </View>
  
            <View style={styles.weightInputContainer}>
              <TextInput
                style={styles.weightInput}
                value={data.targetWeight.toString()}
                onChangeText={(text) => {
                  const value = parseFloat(text) || 0;
                  setData(prev => ({ ...prev, targetWeight: value }));
                }}
                keyboardType="decimal-pad"
                maxLength={4}
              />
              <Text style={styles.unitLabel}>{unit}</Text>
            </View>
          </View>
        )}
  
        {/* Weekly Goal */}
        {data.goal !== 'maintain' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Weekly Goal</Text>
            <Text style={styles.sectionDescription}>
              How much do you want to {data.goal === 'lose' ? 'lose' : 'gain'} per week?
            </Text>
  
            <View style={styles.weeklyGoalOptions}>
              {weeklyGoalOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.weeklyGoalOption,
                    data.weeklyGoal === option && styles.weeklyGoalOptionSelected
                  ]}
                  onPress={() => setData(prev => ({ ...prev, weeklyGoal: option }))}
                >
                  <Text style={[
                    styles.weeklyGoalValue,
                    data.weeklyGoal === option && styles.weeklyGoalValueSelected
                  ]}>
                    {option}
                  </Text>
                  <Text style={[
                    styles.weeklyGoalUnit,
                    data.weeklyGoal === option && styles.weeklyGoalUnitSelected
                  ]}>
                    {unit}/week
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
  
        {/* Timeline */}
        {timeline && (
          <View style={styles.timelineCard}>
            <Ionicons name="information-circle-outline" size={24} color="#206E6B" />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>
                You'll reach {data.targetWeight} {unit}
              </Text>
              <Text style={styles.timelineDescription}>
                At {data.weeklyGoal} {unit}/week, you'll reach your goal in approximately{' '}
                <Text style={styles.timelineBold}>{timeline.weeks} weeks</Text>
              </Text>
            </View>
          </View>
        )}
  
        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Goals</Text>
            </>
          )}
        </TouchableOpacity>
  
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.lightCream,
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
      backgroundColor: Colors.lightCream,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#1F2937',
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      marginHorizontal: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#E8F4F3',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1F2937',
    },
    weightInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    weightInput: {
      fontSize: 48,
      fontWeight: '700',
      color: '#1F2937',
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 16,
      minWidth: 160,
    },
    unitLabel: {
      fontSize: 24,
      fontWeight: '500',
      color: '#6B7280',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1F2937',
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      color: '#6B7280',
      marginBottom: 20,
    },
    goalOptions: {
      flexDirection: 'row',
      gap: 12,
    },
    goalOption: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    goalOptionSelected: {
      borderColor: '#206E6B',
      backgroundColor: '#F0F9F8',
    },
    goalOptionText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#6B7280',
      marginTop: 8,
      textAlign: 'center',
    },
    goalOptionTextSelected: {
      color: '#206E6B',
    },
    weeklyGoalOptions: {
      flexDirection: 'row',
      gap: 12,
    },
    weeklyGoalOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 20,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    weeklyGoalOptionSelected: {
      borderColor: '#206E6B',
      backgroundColor: '#F0F9F8',
    },
    weeklyGoalValue: {
      fontSize: 28,
      fontWeight: '700',
      color: '#6B7280',
      marginBottom: 4,
    },
    weeklyGoalValueSelected: {
      color: '#206E6B',
    },
    weeklyGoalUnit: {
      fontSize: 13,
      fontWeight: '500',
      color: '#9CA3AF',
    },
    weeklyGoalUnitSelected: {
      color: '#206E6B',
    },
    timelineCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#F0F9F8',
      borderRadius: 16,
      padding: 20,
      marginHorizontal: 16,
      marginBottom: 16,
      gap: 12,
    },
    timelineContent: {
      flex: 1,
    },
    timelineTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1F2937',
      marginBottom: 4,
    },
    timelineDescription: {
      fontSize: 14,
      color: '#6B7280',
      lineHeight: 20,
    },
    timelineBold: {
      fontWeight: '700',
      color: '#206E6B',
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#206E6B',
      marginHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });