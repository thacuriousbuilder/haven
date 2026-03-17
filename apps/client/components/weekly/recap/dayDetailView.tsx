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

export default function DayDetailView({ day, weekDateRange, onBack }: Props) {
  const { foodLogs, loading, error, refetch } = useFoodLog(day.fullDate);
  const [selectedFood, setSelectedFood] = useState<FoodLogItem | null>(null);

  const totalCal = foodLogs.reduce((sum, item) => sum + item.calories, 0);

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

        {/* Food log */}
        <Text style={styles.sectionTitle}>Food Log</Text>

        {foodLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No meals logged this day.</Text>
          </View>
        ) : (
          <View style={styles.logList}>
            {foodLogs.map((item) => (
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
                  <Text style={styles.mealTimeLine}>
                    {item.mealTime} · {item.mealType}
                  </Text>
                  <Text style={styles.foodName}>{item.foodName}</Text>
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
            ))}
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
  content:   { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100, },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  logList: { gap: Spacing.sm },
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
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.border,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logInfo:  { flex: 1 },
  mealTimeLine: {
    fontSize: Typography.fontSize.xs,
    color: Colors.energyOrange,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  foodName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: Spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },
  calories: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  emptyState: {
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