
import React, { useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import type { MealLogItem } from '@/types/home';

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [foodLog, setFoodLog] = useState<MealLogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnFood, setIsOwnFood] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        fetchFoodLog();
      }
    }, [id])
  );

  const fetchFoodLog = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('id', id)
        .single();
  
      if (error) throw error;
  
      // Check if current user owns this food log
      setIsOwnFood(user?.id === data.user_id);
  
      // Transform to MealLogItem format
      const mealLog: MealLogItem = {
        id: data.id,
        name: data.food_name,
        time: new Date(data.created_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        calories: data.calories,
        mealType: data.meal_type,
        loggedAt: data.created_at,
        macros: {
          protein: data.protein_grams,
          carbs: data.carbs_grams,
          fat: data.fat_grams,
        },
      };
  
      setFoodLog(mealLog);
    } catch (error) {
      console.error('Error fetching food log:', error);
      Alert.alert('Error', 'Could not load food details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete "${foodLog?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('food_logs')
                .delete()
                .eq('id', id);

              if (error) throw error;

              router.back();
            } catch (error) {
              console.error('Error deleting food log:', error);
              Alert.alert('Error', 'Could not delete meal');
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    router.push(`/food/${id}/edit`);
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

  if (!foodLog) {
    return null;
  }

  const getMealTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast':
        return 'sunny';
      case 'lunch':
        return 'restaurant';
      case 'dinner':
        return 'moon';
      case 'snack':
        return 'nutrition';
      default:
        return 'restaurant';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.graphite} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Nutrition</Text>

        {isOwnFood ? (
          <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteButton}
             activeOpacity={0.7}
            >
          <Ionicons name="trash" size={22} color={Colors.error} />
           </TouchableOpacity>
             ) : (
        <View style={styles.deleteButton} />
         )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Food Name */}
        <Text style={styles.foodName} numberOfLines={2}>
          {foodLog.name}
        </Text>

        {/* Calories Hero Card */}
        <View style={styles.caloriesCard}>
          <View style={styles.caloriesIconContainer}>
            <Ionicons name="flame" size={32} color={Colors.energyOrange} />
          </View>
          <Text style={styles.caloriesLabel}>Calories</Text>
          <Text style={styles.caloriesValue}>{foodLog.calories}</Text>
        </View>

        {/* Macros Cards */}
        {foodLog.macros && (
          <View style={styles.macrosContainer}>
            <View style={styles.macroCard}>
              <View style={styles.macroIconContainer}>
                <Ionicons name="barbell" size={20} color={Colors.energyOrange} />
              </View>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{foodLog.macros.protein}g</Text>
            </View>

            <View style={styles.macroCard}>
              <View style={styles.macroIconContainer}>
                <Ionicons name="nutrition" size={20} color={Colors.vividTeal} />
              </View>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{foodLog.macros.carbs}g</Text>
            </View>

            <View style={styles.macroCard}>
              <View style={styles.macroIconContainer}>
                <Ionicons name="water" size={20} color={Colors.steelBlue} />
              </View>
              <Text style={styles.macroLabel}>Fats</Text>
              <Text style={styles.macroValue}>{foodLog.macros.fat}g</Text>
            </View>
          </View>
        )}

        {/* Meta Info Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name={getMealIcon(foodLog.mealType) as any} size={20} color={Colors.steelBlue} />
              <Text style={styles.metaLabel}>Meal Type</Text>
            </View>
            <Text style={styles.metaValue}>{getMealTypeLabel(foodLog.mealType)}</Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={20} color={Colors.steelBlue} />
              <Text style={styles.metaLabel}>Logged At</Text>
            </View>
            <Text style={styles.metaValue}>{foodLog.time}</Text>
          </View>
        </View>

        {/* Edit Button */}
        {isOwnFood && (
  <TouchableOpacity
    style={styles.editButton}
    onPress={handleEdit}
    activeOpacity={0.7}
  >
    <Ionicons name="create" size={20} color={Colors.white} />
    <Text style={styles.editButtonText}>Edit Details</Text>
  </TouchableOpacity>
)}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.lightCream,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.graphite,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  foodName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: Spacing.xl,
  },
  caloriesCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
  },
  caloriesIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  caloriesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.steelBlue,
    marginBottom: Spacing.xs,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.graphite,
  },
  macrosContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  macroCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  macroIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.steelBlue,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.graphite,
  },
  metaCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.graphite,
  },
  metaDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.vividTeal,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.small,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});