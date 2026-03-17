
import React, { useState } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { usePlanData } from '@/hooks/usePlanData';
import BudgetView from './budgetView';
import TreatDaysView from './treatDaysView';

type PlanToggle = 'budget' | 'treatdays';

export default function PlanTab() {
  const [activeToggle, setActiveToggle] = useState<PlanToggle>('budget');
  const { planData, loading, error, refetch } = usePlanData();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.vividTeal} />
      </View>
    );
  }

  if (error || !planData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load plan data.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Budget / Treat Days toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeToggle === 'budget' && styles.toggleBtnActive]}
          onPress={() => setActiveToggle('budget')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.toggleText,
            activeToggle === 'budget' && styles.toggleTextActive,
          ]}>
            Budget
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, activeToggle === 'treatdays' && styles.toggleBtnActive]}
          onPress={() => setActiveToggle('treatdays')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.toggleText,
            activeToggle === 'treatdays' && styles.toggleTextActive,
          ]}>
            Treat Days
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeToggle === 'budget' && (
        <BudgetView planData={planData} refetch={refetch} />
      )}

    {activeToggle === 'treatdays' && <TreatDaysView />} 
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightCream,
  },
  toggleContainer: {
    flexDirection: 'row',
    margin: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xs,
    ...Shadows.small,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.vividTeal,
    ...Shadows.small,
  },
  toggleText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.steelBlue,
  },
  toggleTextActive: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  placeholder: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
});