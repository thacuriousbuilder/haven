

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClientCardBase } from './clientCardBase';
import { ClientAvatar } from './clientAvatar';
import { StatusBadge } from './statusBadge';
import { ClientCardActions } from './clientCardActions';
import { Colors } from '@/constants/colors';

interface ClientCardOnTrackProps {
  clientId: string;
  fullName: string;
  avatarUrl?: string | null;
  mealsLoggedToday: number;
  weeklyProgress: number; // 0-100 percentage
  avgDailyCalories?: number | null;
  currentStreak?: number;
  onViewProgressPress: () => void;
}

export function ClientCardOnTrack({
  clientId,
  fullName,
  avatarUrl,
  mealsLoggedToday,
  weeklyProgress,
  avgDailyCalories,
  currentStreak,
  onViewProgressPress,
}: ClientCardOnTrackProps) {
  
  return (
    <ClientCardBase>
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <ClientAvatar fullName={fullName} avatarUrl={avatarUrl} />
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.mealsToday}>
              {mealsLoggedToday} {mealsLoggedToday === 1 ? 'meal' : 'meals'} logged today
            </Text>
          </View>
        </View>
        <StatusBadge variant="active" label="Active" />
      </View>

      {/* Weekly Progress Label */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>Weekly progress</Text>
        <Text style={styles.progressPercentage}>{weeklyProgress}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${weeklyProgress}%` }]} />
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Avg. Daily</Text>
          <Text style={styles.metricValue}>
            {avgDailyCalories ? `${avgDailyCalories.toLocaleString()} Kcal` : '—'}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Streak</Text>
          <Text style={styles.metricValue}>
            {currentStreak !== undefined ? `${currentStreak} days` : '—'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <ClientCardActions
        actions={[
          {
            type: 'view-progress',
            label: 'View Progress',
            icon: 'eye-outline',
            onPress: onViewProgressPress,
          },
        ]}
      />
    </ClientCardBase>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 4,
  },
  mealsToday: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.vividTeal,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.vividTeal,
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 4,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
  },
});