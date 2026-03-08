import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';
import { getMealIcon, formatNumber } from '@/utils/homeHelpers';
import type { MealLogItem } from '@/types/home';

interface MealListItemProps {
  meal: MealLogItem;
  onPress?: () => void;
}

export function MealListItem({ meal, onPress }: MealListItemProps) {
  const iconName = getMealIcon(meal.mealType);

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, onPress && styles.containerTappable]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      {/* Left: Icon */}
      <View style={styles.iconContainer}>
        <Ionicons name={iconName as any} size={20} color={Colors.vividTeal} />
      </View>

      {/* Middle: Meal info */}
      <View style={styles.content}>
        <Text style={styles.mealName} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={styles.mealTime}>{meal.time}</Text>
      </View>

      {/* Right: Calories + chevron */}
      <View style={styles.rightContainer}>
        <View style={styles.caloriesContainer}>
          <Text style={styles.caloriesValue}>{formatNumber(meal.calories)}</Text>
          <Text style={styles.caloriesUnit}>kcal</Text>
        </View>
        {onPress && (
          <Ionicons name="chevron-forward" size={16} color={Colors.steelBlue} style={styles.chevron} />
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 4,
  },
  containerTappable: {
    marginHorizontal: -4,
    paddingHorizontal: 4,
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
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.graphite,
  },
  mealTime: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  caloriesContainer: {
    alignItems: 'flex-end',
  },
  caloriesValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.graphite,
  },
  caloriesUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  chevron: {
    marginLeft: 2,
    opacity: 0.6,
  },
});