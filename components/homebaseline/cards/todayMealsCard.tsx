

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { MealListItem } from '../ui/mealListItem';
import { getTimeBasedMealIcon } from '@/utils/homeHelpers';
import type { MealLogItem } from '@/types/home';

interface TodayMealsCardProps {
  meals: MealLogItem[];
  onSeeAll?: () => void;
  onAddMeal?: () => void;
  onMealPress?: (meal: MealLogItem) => void;
}

export function TodayMealsCard({
  meals,
  onSeeAll,
  onAddMeal,
  onMealPress,
}: TodayMealsCardProps) {
  // Show max 3 meals, plus "not logged yet" if less than 4 meals
  const displayedMeals = meals.slice(0, 3);
  const hasMore = meals.length > 3;
  const showNotLogged = meals.length < 4;

  // Get current hour for "not logged yet" icon
  const currentHour = new Date().getHours();
  const notLoggedIcon = getTimeBasedMealIcon(currentHour);
  const notLoggedTime = currentHour < 12 
    ? 'Expected ~7 PM' 
    : currentHour < 18 
    ? 'Expected ~7 PM' 
    : 'Expected later';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Today's Meals</Text>
        {hasMore && onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
            <View style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See all</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.vividTeal} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Meals list */}
      <View style={styles.mealsList}>
        {displayedMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant" size={32} color={Colors.steelBlue} />
            <Text style={styles.emptyText}>No meals logged yet today</Text>
            {onAddMeal && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={onAddMeal}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={Colors.white} />
                <Text style={styles.addButtonText}>Log your first meal</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {displayedMeals.map((meal, index) => (
              <View key={meal.id}>
                {index > 0 && <View style={styles.divider} />}
                <MealListItem
                  meal={meal}
                  onPress={onMealPress ? () => onMealPress(meal) : undefined}
                />
              </View>
            ))}

            {/* "Not logged yet" placeholder */}
            {showNotLogged && onAddMeal && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.notLoggedContainer}
                  onPress={onAddMeal}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons name={notLoggedIcon as any} size={20} color={Colors.textMuted} />
                  </View>
                  <View style={styles.content}>
                    <Text style={styles.notLoggedText}>Not logged yet</Text>
                    <Text style={styles.notLoggedTime}>{notLoggedTime}</Text>
                  </View>
                  <View style={styles.addIconContainer}>
                    <Ionicons name="add-circle" size={28} color={Colors.vividTeal} />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.graphite,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.vividTeal,
  },
  mealsList: {
    // Container for meals
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.vividTeal,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  notLoggedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  notLoggedText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  notLoggedTime: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  addIconContainer: {
    // Container for add icon
  },
});