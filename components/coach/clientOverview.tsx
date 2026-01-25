
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface ClientOverviewProps {
  totalClients: number;
  onTrackCount: number;
  followUpCount: number;
  baselineCount: number;
}

export function ClientOverview({
  totalClients,
  onTrackCount,
  followUpCount,
  baselineCount,
}: ClientOverviewProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Client Overview</Text>
        {/* Total Badge */}
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>{totalClients}</Text>
        </View>
      </View>

      {/* Metrics Circles */}
      <View style={styles.metricsRow}>
        {/* On Track */}
        <View style={styles.metricCircle}>
          <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="trending-up" size={20} color="#10B981" />
          </View>
          <Text style={styles.metricNumber}>{onTrackCount}</Text>
          <Text style={styles.metricLabel}>On Track</Text>
        </View>

        {/* Follow-up */}
        <View style={styles.metricCircle}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
          </View>
          <Text style={styles.metricNumber}>{followUpCount}</Text>
          <Text style={styles.metricLabel}>Follow up</Text>
        </View>

        {/* Baseline */}
        <View style={styles.metricCircle}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time" size={20} color="#F59E0B" />
          </View>
          <Text style={styles.metricNumber}>{baselineCount}</Text>
          <Text style={styles.metricLabel}>Baseline</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.graphite,
  },
  totalBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.vividTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCircle: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.lightCream,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
});