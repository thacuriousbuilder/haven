
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodLogData {
  food_name: string;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  meal_type: MealType;
}

export default function EditFoodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');

  useEffect(() => {
    if (id) {
      fetchFoodLog();
    }
  }, [id]);

  const fetchFoodLog = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Populate form
      setFoodName(data.food_name);
      setCalories(data.calories.toString());
      setProtein(data.protein_grams.toString());
      setCarbs(data.carbs_grams.toString());
      setFat(data.fat_grams.toString());
      setMealType(data.meal_type);
    } catch (error) {
      console.error('Error fetching food log:', error);
      Alert.alert('Error', 'Could not load food details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!foodName.trim()) {
      Alert.alert('Validation Error', 'Please enter a food name');
      return;
    }

    const caloriesNum = parseInt(calories);
    const proteinNum = parseFloat(protein);
    const carbsNum = parseFloat(carbs);
    const fatNum = parseFloat(fat);

    if (isNaN(caloriesNum) || caloriesNum < 0) {
      Alert.alert('Validation Error', 'Please enter valid calories');
      return;
    }

    if (isNaN(proteinNum) || proteinNum < 0) {
      Alert.alert('Validation Error', 'Please enter valid protein grams');
      return;
    }

    if (isNaN(carbsNum) || carbsNum < 0) {
      Alert.alert('Validation Error', 'Please enter valid carbs grams');
      return;
    }

    if (isNaN(fatNum) || fatNum < 0) {
      Alert.alert('Validation Error', 'Please enter valid fat grams');
      return;
    }

    try {
      setSaving(true);

      const updates: FoodLogData = {
        food_name: foodName.trim(),
        calories: caloriesNum,
        protein_grams: proteinNum,
        carbs_grams: carbsNum,
        fat_grams: fatNum,
        meal_type: mealType,
      };

      const { error } = await supabase
        .from('food_logs')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Meal updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating food log:', error);
      Alert.alert('Error', 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Discard Changes?', 'Are you sure you want to discard your changes?', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.vividTeal} />
        </View>
      </SafeAreaView>
    );
  }

  const mealTypes: { value: MealType; label: string; icon: string }[] = [
    { value: 'breakfast', label: 'Breakfast', icon: 'sunny' },
    { value: 'lunch', label: 'Lunch', icon: 'partly-sunny' },
    { value: 'dinner', label: 'Dinner', icon: 'moon' },
    { value: 'snack', label: 'Snack', icon: 'fast-food' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Meal</Text>

        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          activeOpacity={0.7}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.vividTeal} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Food Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Food Name</Text>
            <TextInput
              style={styles.input}
              value={foodName}
              onChangeText={setFoodName}
              placeholder="e.g., Grilled Chicken Salad"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Calories */}
          <View style={styles.section}>
            <Text style={styles.label}>Calories</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
          </View>

          {/* Macros */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Macronutrients</Text>
            
            <View style={styles.macrosGrid}>
              <View style={styles.macroInputContainer}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  style={styles.input}
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.macroInputContainer}>
                <Text style={styles.label}>Carbs (g)</Text>
                <TextInput
                  style={styles.input}
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.macroInputContainer}>
                <Text style={styles.label}>Fat (g)</Text>
                <TextInput
                  style={styles.input}
                  value={fat}
                  onChangeText={setFat}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Meal Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meal Type</Text>
            <View style={styles.mealTypeGrid}>
              {mealTypes.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.mealTypeButton,
                    mealType === option.value && styles.mealTypeButtonActive,
                  ]}
                  onPress={() => setMealType(option.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={
                      mealType === option.value ? Colors.white : Colors.vividTeal
                    }
                  />
                  <Text
                    style={[
                      styles.mealTypeText,
                      mealType === option.value && styles.mealTypeTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.lightCream,
  },
  headerButton: {
    minWidth: 60,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.graphite,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.vividTeal,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.steelBlue,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.graphite,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  macroInputContainer: {
    flex: 1,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  mealTypeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.small,
  },
  mealTypeButtonActive: {
    backgroundColor: Colors.vividTeal,
    borderColor: Colors.vividTeal,
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.vividTeal,
  },
  mealTypeTextActive: {
    color: Colors.white,
  },
});