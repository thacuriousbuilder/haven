

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { DayIndicator } from '../ui/dayIndicator';
import type { BaselineProgress } from '@/types/home';

interface BaselineProgressCardProps {
  progress: BaselineProgress;
  completedDays: boolean[];  // Array of 7 booleans
  currentDayIndex: number;   // 0-6
}

export function BaselineProgressCard({
  progress,
  completedDays,
  currentDayIndex,
}: BaselineProgressCardProps) {
  const daysRemaining = progress.totalDays - progress.daysLogged;
  const progressText = daysRemaining > 0 
    ? `Day ${progress.currentDay} of ${progress.totalDays} — ${daysRemaining} days to go!`
    : 'Baseline complete!';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>7-Day Baseline</Text>
          <Text style={styles.subtitle}>{progressText}</Text>
        </View>
        
        {/* Progress badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {progress.daysLogged}/{progress.totalDays}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBarFill, 
            { width: `${(progress.daysLogged / progress.totalDays) * 100}%` }
          ]} 
        />
      </View>

      {/* Day indicators - Just numbers 1-7 */}
      <View style={styles.daysContainer}>
        {Array.from({ length: 7 }).map((_, index) => {
          const isCompleted = completedDays[index];
          const isCurrent = index === currentDayIndex && !isCompleted;
          const isDisabled = index > currentDayIndex && !isCompleted;
          
          return (
            <DayIndicator
              key={index}
              dayNumber={index + 1}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isDisabled={isDisabled}
              showLabel={false}
            />
          );
        })}
      </View>

      {/* Motivational message */}
      <View style={styles.messageContainer}>
        <Ionicons name="heart" size={18} color={Colors.energyOrange} />
        <Text style={styles.messageText}>
          {daysRemaining > 0 
            ? "Keep it up! Log today's meals to unlock personalized insights"
            : "Great work! Your personalized plan is ready"}
        </Text>
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
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  badge: {
    backgroundColor: Colors.vividTeal,
    width:48,
    height:48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.sm,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.lightCream,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.steelBlue,
    lineHeight: 18,
  },
});
