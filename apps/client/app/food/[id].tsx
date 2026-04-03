import React, { useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { supabase } from '@haven/shared-utils';
import type { MealLogItem } from '@/types/home';
import { syncDailySummaryAfterDelete } from '@/utils/syncDailySummary';

async function recalculateDailySummary(userId: string, logDate: string) {
  const { data: logs } = await supabase
    .from('food_logs')
    .select('calories')
    .eq('user_id', userId)
    .eq('log_date', logDate);

  const total = logs?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;

  if (total === 0) {
    await supabase
      .from('daily_summaries')
      .delete()
      .eq('user_id', userId)
      .eq('summary_date', logDate);
  } else {
    await supabase
      .from('daily_summaries')
      .upsert(
        { user_id: userId, summary_date: logDate, calories_consumed: total, calories_burned: 0 },
        { onConflict: 'user_id,summary_date' }
      );
  }
}

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [foodLog, setFoodLog] = useState<MealLogItem | null>(null);
  const [logDate, setLogDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnFood, setIsOwnFood] = useState(true);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      if (id) fetchFoodLog();
    }, [id])
  );

  const fetchFoodLog = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setIsOwnFood(user?.id === data.user_id);
      setLogDate(data.log_date);

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
        image_url: data.image_url || null,
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

  const handleDelete = async () => {
    Alert.alert('Delete Food', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: log } = await supabase
              .from('food_logs')
              .select('log_date')
              .eq('id', id)
              .single();

            const { error } = await supabase
              .from('food_logs')
              .delete()
              .eq('id', id);

            if (error) throw error;

            if (log?.log_date) {
              await syncDailySummaryAfterDelete(user.id, log.log_date);
            }

            router.back();
          } catch (err) {
            console.error('Error deleting food log:', err);
            Alert.alert('Error', 'Failed to delete. Please try again.');
          }
        },
      },
    ]);
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

  if (!foodLog) return null;

  const getMealTypeLabel = (type: string) =>
    type.charAt(0).toUpperCase() + type.slice(1);

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return 'sunny';
      case 'lunch': return 'restaurant';
      case 'dinner': return 'moon';
      case 'snack': return 'nutrition';
      default: return 'restaurant';
    }
  };

  const hasImage = !!foodLog.image_url;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Hero image or teal fallback ── */}
      <View style={styles.heroContainer}>
        {hasImage ? (
          <Image
            source={{ uri: foodLog.image_url! }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroFallback}>
            <Ionicons name="restaurant" size={64} color="rgba(255,255,255,0.4)" />
          </View>
        )}

        {/* Gradient overlay for header legibility */}
        <View style={styles.heroOverlay} />

        {/* ── Overlaid header ── */}
        <View style={[styles.heroHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.graphite} />
          </TouchableOpacity>

          <Text style={styles.heroHeaderTitle}>Nutrition</Text>

          {isOwnFood ? (
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconButton} />
          )}
        </View>
      </View>

      {/* ── Content card slides up over image ── */}
      <ScrollView
        style={styles.contentCard}
        contentContainerStyle={[
          styles.contentCardInner,
          { paddingBottom: insets.bottom + 24 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Food name + time row */}
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <View style={styles.mealTypePill}>
              <Ionicons
                name={getMealIcon(foodLog.mealType) as any}
                size={12}
                color={Colors.vividTeal}
              />
              <Text style={styles.mealTypePillText}>
                {getMealTypeLabel(foodLog.mealType)}
              </Text>
            </View>
            <Text style={styles.foodName} numberOfLines={2}>
              {foodLog.name}
            </Text>
          </View>

          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{foodLog.time}</Text>
          </View>
        </View>

        {/* ── Calories row ── */}
        <View style={styles.caloriesRow}>
          <View style={styles.caloriesIconWrap}>
            <Ionicons name="flame" size={24} color={Colors.energyOrange} />
          </View>
          <View style={styles.caloriesTextWrap}>
            <Text style={styles.caloriesLabel}>Calories</Text>
            <Text style={styles.caloriesValue}>{foodLog.calories}</Text>
          </View>
        </View>

        {/* ── Macro cards ── */}
        {foodLog.macros && (
          <View style={styles.macrosRow}>
            <View style={styles.macroCard}>
              <View style={[styles.macroIconWrap, { backgroundColor: 'rgba(239,120,40,0.1)' }]}>
                <Ionicons name="barbell" size={16} color={Colors.energyOrange} />
              </View>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{foodLog.macros.protein ?? '—'}g</Text>
            </View>

            <View style={styles.macroCard}>
              <View style={[styles.macroIconWrap, { backgroundColor: 'rgba(32,110,107,0.1)' }]}>
                <Ionicons name="nutrition" size={16} color={Colors.vividTeal} />
              </View>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{foodLog.macros.carbs ?? '—'}g</Text>
            </View>

            <View style={styles.macroCard}>
              <View style={[styles.macroIconWrap, { backgroundColor: 'rgba(104,124,136,0.1)' }]}>
                <Ionicons name="water" size={16} color={Colors.steelBlue} />
              </View>
              <Text style={styles.macroLabel}>Fats</Text>
              <Text style={styles.macroValue}>{foodLog.macros.fat ?? '—'}g</Text>
            </View>
          </View>
        )}

        {/* ── Meta info ── */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Meal type</Text>
            <Text style={styles.metaValue}>{getMealTypeLabel(foodLog.mealType)}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Logged at</Text>
            <Text style={styles.metaValue}>{foodLog.time}</Text>
          </View>
        </View>

        {/* ── CTAs ── */}
        {isOwnFood && (
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={18} color={Colors.white} />
              <Text style={styles.editButtonText}>Edit Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const HERO_HEIGHT = 300

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.vividTeal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightCream,
  },

  // ── Hero ──
  heroContainer: {
    height: HERO_HEIGHT,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.vividTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  heroHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Content card ──
  contentCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
  },
  contentCardInner: {
    padding: Spacing.xl,
  },

  // ── Title row ──
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
    gap: 12,
  },
  titleLeft: {
    flex: 1,
    gap: 6,
  },
  mealTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.tealOverlay,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  mealTypePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.vividTeal,
  },
  foodName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.graphite,
    lineHeight: 28,
  },
  timeContainer: {
    backgroundColor: Colors.lightCream,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.steelBlue,
  },

  // ── Calories ──
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: 14,
  },
  caloriesIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesTextWrap: {
    gap: 2,
  },
  caloriesLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  caloriesValue: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.graphite,
  },

  // ── Macros ──
  macrosRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  macroCard: {
    flex: 1,
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  macroIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.graphite,
  },

  // ── Meta ──
  metaCard: {
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.steelBlue,
    fontWeight: '500',
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

  // ── CTAs ──
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  editButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.vividTeal,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
})