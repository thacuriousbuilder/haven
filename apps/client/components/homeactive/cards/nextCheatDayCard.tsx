import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { formatNumber } from '@/utils/homeHelpers';

interface NextCheatDayCardProps {
  dayName: string;           // e.g., "Saturday"
  dateString: string;        // Full date for display (e.g., "Jan 18")
  reservedCalories: number;  // e.g., 500
  onPress?: () => void;      // Optional navigation handler
}

export function NextCheatDayCard({
  dayName,
  dateString,
  reservedCalories,
  onPress,
}: NextCheatDayCardProps) {
  const CardWrapper = onPress ? TouchableOpacity : View;
  
  return (
    <CardWrapper 
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.leftSection}>
        {/* Calendar icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="calendar" size={24} color={Colors.energyOrange} />
        </View>

        {/* Text content */}
        <View style={styles.textContent}>
          <Text style={styles.label}>Next Treat Day</Text>
          <Text style={styles.dayName}>{dayName}</Text>
        </View>
      </View>

      {/* Right section - Reserved calories */}
      <View style={styles.rightSection}>
        <Text style={styles.reservedLabel}>Reserved</Text>
        <View style={styles.caloriesRow}>
          <Text style={styles.caloriesValue}>{formatNumber(reservedCalories)}</Text>
          <Text style={styles.caloriesUnit}>cal</Text>
        {onPress && (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={Colors.steelBlue} 
            style={styles.chevron}
          />
        )}
        </View>
      </View>
    </CardWrapper>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.orangeOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  textContent: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.steelBlue,
    marginBottom: 4,
  },
  dayName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.graphite,
  },
  rightSection: {
    flexDirection: 'column',
    alignItems:"center",
    gap: Spacing.sm,

  },
  reservedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.steelBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  caloriesValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.energyOrange,
  },
  caloriesUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.energyOrange,
  },
  chevron: {
    marginLeft: Spacing.xs,
  },
});