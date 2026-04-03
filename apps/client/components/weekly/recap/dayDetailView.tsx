// components/weekly/DayDetailView.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { DaySummary } from '@/types/recap';
import { useFoodLog } from '@/hooks/useFoodLog';
import FoodItemModal from '../recap/foodItemModal';

export type FoodLogItem = {
  id: string;
  mealTime: string;
  mealType: string;
  foodName: string;
  calories: number;
  foodTag: string | null;
  imageUrl: string | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  isFavorite: boolean;
  eatReason: string[];
  satietyResponse: string | null;
};

type Props = {
  day: DaySummary;
  weekDateRange: string;
  onBack: () => void;
};

const MEAL_ORDER: FoodLogItem['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_META: Record<string, { label: string; icon: string }> = {
  breakfast: { label: 'Breakfast', icon: 'sunny-outline' },
  lunch:     { label: 'Lunch',     icon: 'partly-sunny-outline' },
  dinner:    { label: 'Dinner',    icon: 'moon-outline' },
  snack:     { label: 'Snack',     icon: 'fast-food-outline' },
};

function buildReflectionLine(item: FoodLogItem): string | null {
  const parts: string[] = [];

  if (item.eatReason && item.eatReason.length > 0) {
    parts.push(`Ate because: ${item.eatReason.join(', ')}`);
  }

  if (item.satietyResponse) {
    const satietyMap: Record<string, string> = {
      yes:      'Kept you full',
      somewhat: 'Somewhat filling',
      no:       "Didn't keep you full",
    };
    const satietyText = satietyMap[item.satietyResponse.toLowerCase()];
    if (satietyText) parts.push(satietyText);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function DayDetailView({ day, weekDateRange, onBack }: Props) {
  const { foodLogs, loading, error, refetch } = useFoodLog(day.fullDate);
  const [selectedFood, setSelectedFood] = useState<FoodLogItem | null>(null);

  const totalCal = foodLogs.reduce((sum, item) => sum + item.calories, 0);

  // Group by meal type, only include groups with items
  const grouped = MEAL_ORDER.reduce<Record<string, FoodLogItem[]>>((acc, type) => {
    const items = foodLogs.filter(f => f.mealType.toLowerCase() === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.vividTeal} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load food log.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Back nav */}
        <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color={Colors.graphite} />
          <Text style={styles.backText}>Back to {weekDateRange}</Text>
        </TouchableOpacity>

        {/* Teal hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroDayLabel}>{day.dayLabel}</Text>
          <Text style={styles.heroDate}>{day.date}</Text>
          <View style={styles.heroStats}>
            <Ionicons name="flame-outline" size={14} color={Colors.white} />
            <Text style={styles.heroStatText}>{totalCal.toLocaleString()} cal</Text>
            <Ionicons
              name="restaurant-outline"
              size={14}
              color={Colors.white}
              style={{ marginLeft: Spacing.md }}
            />
            <Text style={styles.heroStatText}>{foodLogs.length} meals</Text>
          </View>
        </View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>Reflect on today's meals</Text>

        {foodLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No meals logged this day.</Text>
          </View>
        ) : (
          <View style={styles.groupList}>
            {MEAL_ORDER.filter(type => grouped[type]).map(type => {
              const items = grouped[type];
              const meta = MEAL_META[type];
              const groupCal = items.reduce((sum, i) => sum + i.calories, 0);

              return (
                <View key={type} style={styles.mealGroup}>
                  {/* Meal group header */}
                  <View style={styles.groupHeader}>
                    <View style={styles.groupHeaderLeft}>
                      <Ionicons
                        name={meta.icon as any}
                        size={14}
                        color={Colors.vividTeal}
                      />
                      <Text style={styles.groupLabel}>{meta.label}</Text>
                    </View>
                    <Text style={styles.groupCal}>{groupCal.toLocaleString()} cal</Text>
                  </View>

                  {/* Items in this group */}
                  <View style={styles.logList}>
                    {items.map((item) => {
                      const reflectionLine = buildReflectionLine(item);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.logCard}
                          onPress={() => setSelectedFood(item)}
                          activeOpacity={0.7}
                        >
                          {/* Thumbnail */}
                          {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
                          ) : (
                            <View style={styles.thumbnailPlaceholder}>
                              <Ionicons name="restaurant-outline" size={20} color={Colors.steelBlue} />
                            </View>
                          )}

                          {/* Info */}
                          <View style={styles.logInfo}>
                            <Text style={styles.mealTimeLine}>{item.mealTime}</Text>
                            <Text style={styles.foodName}>{item.foodName}</Text>

                            {/* Reflection summary */}
                            {reflectionLine && (
                              <View style={styles.reflectionRow}>
                                <Ionicons name="leaf-outline" size={11} color={Colors.vividTeal} />
                                <Text style={styles.reflectionText} numberOfLines={2}>
                                  {reflectionLine}
                                </Text>
                              </View>
                            )}

                            <View style={styles.bottomRow}>
                              {item.foodTag && (
                                <View style={styles.tag}>
                                  <Text style={styles.tagText}>{item.foodTag}</Text>
                                </View>
                              )}
                              <Text style={styles.calories}>{item.calories} cal</Text>
                            </View>
                          </View>

                          <Ionicons name="chevron-forward" size={16} color={Colors.steelBlue} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Food item modal */}
      {selectedFood && (
        <FoodItemModal
          item={selectedFood}
          onClose={() => setSelectedFood(null)}
          onDeleted={() => {
            setSelectedFood(null);
            refetch();
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightCream },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightCream,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  backText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.graphite,
    fontWeight: Typography.fontWeight.medium,
  },
  heroCard: {
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  heroDayLabel: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: Typography.fontWeight.medium,
  },
  heroDate: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  heroStatText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    marginLeft: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginTop: Spacing.xs,
  },
  groupList: {
    gap: Spacing.lg,
  },
  mealGroup: {
    gap: Spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  groupLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vividTeal,
  },
  groupCal: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    fontWeight: Typography.fontWeight.medium,
  },
  logList: {
    gap: Spacing.sm,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.small,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
  },
  thumbnailPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.tealOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logInfo: {
    flex: 1,
    gap: 3,
  },
  mealTimeLine: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },
  foodName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  reflectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  reflectionText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.vividTeal,
    flex: 1,
    lineHeight: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  tag: {
    backgroundColor: Colors.tealOverlay,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    color: Colors.vividTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  calories: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
});