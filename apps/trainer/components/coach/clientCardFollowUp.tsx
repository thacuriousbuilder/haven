

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClientCardBase } from './clientCardBase';
import { ClientAvatar } from './clientAvatar';
import { StatusBadge } from './statusBadge';
import { ClientCardActions } from './clientCardActions';
import { Colors } from '@/constants/colors';

interface ClientCardFollowUpProps {
  clientId: string;
  fullName: string;
  avatarUrl?: string | null;
  lastActiveDaysAgo: number;
  avgDailyCalories?: number | null;
  currentStreak?: number;
  onViewPress: () => void;
  onMessagePress: () => void;
}

export function ClientCardFollowUp({
  clientId,
  fullName,
  avatarUrl,
  lastActiveDaysAgo,
  avgDailyCalories,
  currentStreak,
  onViewPress,
  onMessagePress,
}: ClientCardFollowUpProps) {
  
  const getLastActiveText = (days: number): string => {
    if (days === 0) return 'Active today';
    if (days === 1) return 'Last active 1 day ago';
    return `Last active ${days} days ago`;
  };

  return (
    <ClientCardBase>
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <ClientAvatar fullName={fullName} avatarUrl={avatarUrl} />
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.lastActive}>
              {getLastActiveText(lastActiveDaysAgo)}
            </Text>
          </View>
        </View>
        <StatusBadge variant="inactive" label="Inactive" />
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
            type: 'view',
            label: 'View',
            icon: 'eye',
            onPress: onViewPress,
          },
          {
            type: 'message',
            label: 'Message',
            icon: 'chatbubble',
            onPress: onMessagePress,
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
  lastActive: {
    fontSize: 13,
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