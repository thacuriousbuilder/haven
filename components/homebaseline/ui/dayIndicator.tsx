

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface DayIndicatorProps {
  dayNumber: number;        // 1-7
  isCompleted: boolean;
  isCurrent: boolean;
  isDisabled?: boolean;
  showLabel?: boolean;      // Optional: show day label below
  label?: string;           // Optional: custom label (e.g., "M" or "Day 1")
}

export function DayIndicator({
  dayNumber,
  isCompleted,
  isCurrent,
  isDisabled = false,
  showLabel = false,
  label,
}: DayIndicatorProps) {
  const getCircleStyle = () => {
    if (isCompleted) {
      return styles.circleCompleted;
    }
    if (isCurrent) {
      return styles.circleCurrent;
    }
    if (isDisabled) {
      return styles.circleDisabled;
    }
    return styles.circleInactive;
  };

  const getNumberColor = () => {
    if (isCompleted) return Colors.white;
    if (isCurrent) return Colors.vividTeal;
    if (isDisabled) return Colors.textMuted;
    return Colors.steelBlue;
  };

  const getTextColor = () => {
    if (isDisabled) return Colors.textMuted;
    if (isCurrent) return Colors.vividTeal;
    return Colors.steelBlue;
  };

  return (
    <View style={styles.container}>
      {/* Circle with checkmark or number */}
      <View style={[styles.circle, getCircleStyle()]}>
        {isCompleted ? (
          <Ionicons name="checkmark" size={16} color={Colors.white} />
        ) : (
          <Text style={[styles.dayNumber, { color: getNumberColor() }]}>
            {dayNumber}
          </Text>
        )}
      </View>
      
      {/* Optional label */}
      {showLabel && label && (
        <Text style={[styles.dayLabel, { color: getTextColor() }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCompleted: {
    backgroundColor: Colors.vividTeal,
  },
  circleCurrent: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.vividTeal,
  },
  circleInactive: {
    backgroundColor: Colors.border,
  },
  circleDisabled: {
    backgroundColor: Colors.lightCream,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});