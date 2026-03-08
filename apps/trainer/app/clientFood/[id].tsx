// apps/trainer/app/clientFood/[id].tsx
import React from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { supabase } from '@haven/shared-utils';

interface FoodLog {
  id: string;
  name: string;
  time: string;
  calories: number;
  mealType: string;
  macros: { protein: number; carbs: number; fat: number };
}

export default function ClientFoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [foodLog, setFoodLog] = React.useState<FoodLog | null>(null);
  const [loading, setLoading] = React.useState(true);

  useFocusEffect(
    React.useCallback(() => {
      if (id) fetchFoodLog();
    }, [id])
  );

  const fetchFoodLog = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFoodLog({
        id: data.id,
        name: data.food_name,
        time: new Date(data.created_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        calories: data.calories,
        mealType: data.meal_type,
        macros: {
          protein: data.protein_grams,
          carbs: data.carbs_grams,
          fat: data.fat_grams,
        },
      });
    } catch (error) {
      console.error('Error fetching food log:', error);
      Alert.alert('Error', 'Could not load food details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return 'sunny';
      case 'lunch': return 'restaurant';
      case 'dinner': return 'moon';
      case 'snack': return 'nutrition';
      default: return 'restaurant';
    }
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

  if (!foodLog) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.graphite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.foodName} numberOfLines={2}>{foodLog.name}</Text>

        {/* Calories */}
        <View style={styles.caloriesCard}>
          <View style={styles.caloriesIconContainer}>
            <Ionicons name="flame" size={32} color={Colors.energyOrange} />
          </View>
          <Text style={styles.caloriesLabel}>Calories</Text>
          <Text style={styles.caloriesValue}>{foodLog.calories}</Text>
        </View>

        {/* Macros */}
        <View style={styles.macrosContainer}>
          {[
            { label: 'Protein', value: foodLog.macros.protein, icon: 'barbell', color: Colors.energyOrange },
            { label: 'Carbs', value: foodLog.macros.carbs, icon: 'nutrition', color: Colors.vividTeal },
            { label: 'Fats', value: foodLog.macros.fat, icon: 'water', color: Colors.steelBlue },
          ].map((macro) => (
            <View key={macro.label} style={styles.macroCard}>
              <View style={styles.macroIconContainer}>
                <Ionicons name={macro.icon as any} size={20} color={macro.color} />
              </View>
              <Text style={styles.macroLabel}>{macro.label}</Text>
              <Text style={styles.macroValue}>{macro.value}g</Text>
            </View>
          ))}
        </View>

        {/* Meta */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name={getMealIcon(foodLog.mealType) as any} size={20} color={Colors.steelBlue} />
              <Text style={styles.metaLabel}>Meal Type</Text>
            </View>
            <Text style={styles.metaValue}>
              {foodLog.mealType.charAt(0).toUpperCase() + foodLog.mealType.slice(1)}
            </Text>
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