
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClientCardBase } from './clientCardBase';
import { ClientAvatar } from './clientAvatar';
import { ClientCardActions } from './clientCardActions';
import { Colors } from '@/constants/colors';

interface ClientCardBaselineProps {
  clientId: string;
  fullName: string;
  avatarUrl?: string | null;
  mealsLoggedToday: number;
  baselineDaysCompleted: number; // 0-7
  daysRemaining: number; // 7 down to 0
  avgDailyCalories?: number | null;
  onViewProgressPress: () => void;
}

export function ClientCardBaseline({
  clientId,
  fullName,
  avatarUrl,
  mealsLoggedToday,
  baselineDaysCompleted,
  daysRemaining,
  avgDailyCalories,
  onViewProgressPress,
}: ClientCardBaselineProps) {
  
  const dayLabels = ['1', '2', '3', '4', '5', '6', '7'];

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
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>{baselineDaysCompleted}/7</Text>
        </View>
      </View>

      {/* Day Checkmarks */}
      <View style={styles.daysRow}>
        {dayLabels.map((day, index) => {
          const isCompleted = index < baselineDaysCompleted;
          return (
            <View key={index} style={styles.dayItem}>
              <View
                style={[
                  styles.dayCircle,
                  isCompleted && styles.dayCircleCompleted,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text style={styles.dayLabel}>{day}</Text>
                )}
              </View>
            </View>
          );
        })}
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
          <Text style={styles.metricLabel}>Days Remaining</Text>
          <Text style={styles.metricValue}>
            {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <ClientCardActions
        actions={[
          {
            type: 'view-progress',
            label: 'View Progress',
            icon: 'eye',
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
  dayBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 4,
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: Colors.vividTeal,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
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