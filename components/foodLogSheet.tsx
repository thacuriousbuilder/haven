import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface FoodLogSheetProps {
  onSuccess: () => void;
}

type LogMethod = 'manual' | 'scan' | 'database' | null;
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function FoodLogSheet({ onSuccess }: FoodLogSheetProps) {
  const [selectedMethod, setSelectedMethod] = useState<LogMethod>(null);
  const [foodDescription, setFoodDescription] = useState('');
  const [estimatedCalories, setEstimatedCalories] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [saving, setSaving] = useState(false);

  const handleMethodSelect = (method: LogMethod) => {
    setSelectedMethod(method);
  };

  const handleSave = async () => {
    if (!foodDescription.trim()) {
      Alert.alert('Error', 'Please describe what you ate');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          food_name: foodDescription,
          calories: estimatedCalories ? parseInt(estimatedCalories) : null,
          log_date: new Date().toISOString().split('T')[0],
          meal_type: mealType,
        });

      if (error) {
        console.error('Error saving food log:', error);
        Alert.alert('Error', 'Failed to save food log');
        setSaving(false);
        return;
      }

      // Success
      setFoodDescription('');
      setEstimatedCalories('');
      setMealType('snack');
      setSelectedMethod(null);
      setSaving(false);
      Alert.alert('Success', 'Food logged!');
      onSuccess();
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Something went wrong');
      setSaving(false);
    }
  };

  const mealTypes: { value: MealType; label: string; icon: string }[] = [
    { value: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
    { value: 'lunch', label: 'Lunch', icon: 'partly-sunny-outline' },
    { value: 'dinner', label: 'Dinner', icon: 'moon-outline' },
    { value: 'snack', label: 'Snack', icon: 'fast-food-outline' },
  ];

  if (!selectedMethod) {
    return (
      <ScrollView 
        style={styles.methodSelection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.methodContent}
      >
        <Text style={styles.sectionTitle}>How would you like to log?</Text>
        
        <TouchableOpacity
          style={styles.methodCard}
          onPress={() => handleMethodSelect('manual')}
        >
          <View style={styles.methodIcon}>
            <Ionicons name="create-outline" size={28} color="#3D5A5C" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Manual Input</Text>
            <Text style={styles.methodDescription}>
              Quickly type what you ate
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodCard, styles.methodCardDisabled]}
          onPress={() => Alert.alert('Coming Soon', 'Barcode scanning will be available soon!')}
        >
          <View style={styles.methodIcon}>
            <Ionicons name="camera-outline" size={28} color="#9CA3AF" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={[styles.methodTitle, styles.disabledText]}>Scan Barcode</Text>
            <Text style={styles.methodDescription}>Coming soon</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodCard, styles.methodCardDisabled]}
          onPress={() => Alert.alert('Coming Soon', 'Food database search will be available soon!')}
        >
          <View style={styles.methodIcon}>
            <Ionicons name="search-outline" size={28} color="#9CA3AF" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={[styles.methodTitle, styles.disabledText]}>Search Database</Text>
            <Text style={styles.methodDescription}>Coming soon</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Manual input form
  return (
    <ScrollView 
      style={styles.formContainer} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formContent}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setSelectedMethod(null)}
      >
        <Ionicons name="arrow-back" size={20} color="#3D5A5C" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.formTitle}>What did you eat?</Text>
      <Text style={styles.formSubtitle}>
        Don't worry about being exact. We're just learning patterns.
      </Text>

      {/* Meal Type Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Meal type</Text>
        <View style={styles.mealTypeGrid}>
          {mealTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.mealTypeCard,
                mealType === type.value && styles.mealTypeCardActive
              ]}
              onPress={() => setMealType(type.value)}
            >
              <Ionicons 
                name={type.icon as any} 
                size={24} 
                color={mealType === type.value ? '#FFFFFF' : '#3D5A5C'} 
              />
              <Text style={[
                styles.mealTypeText,
                mealType === type.value && styles.mealTypeTextActive
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Food description</Text>
        <TextInput
          style={styles.textInput}
          value={foodDescription}
          onChangeText={setFoodDescription}
          placeholder="e.g., Chicken salad with ranch dressing"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Estimated calories (optional)</Text>
        <TextInput
          style={styles.input}
          value={estimatedCalories}
          onChangeText={setEstimatedCalories}
          placeholder="500"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          maxLength={5}
        />
        <Text style={styles.hint}>
          It's okay to guess! Accuracy improves over time.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Food Log'}
        </Text>
      </TouchableOpacity>

      {/* Extra padding for keyboard */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  methodSelection: {
    flex: 1,
  },
  methodContent: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 20,
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  methodCardDisabled: {
    opacity: 0.6,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: '#3D5A5C',
    fontWeight: '600',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 8,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealTypeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mealTypeCardActive: {
    backgroundColor: '#3D5A5C',
    borderColor: '#3D5A5C',
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5A5C',
  },
  mealTypeTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#3D5A5C',
    minHeight: 100,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#3D5A5C',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#3D5A5C',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 300,
  },
});