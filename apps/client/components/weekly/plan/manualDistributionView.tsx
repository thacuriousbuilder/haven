
import React, { useState } from 'react';
import {
  View, Text, ScrollView,
  TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { PlanData } from '@/hooks/usePlanData';
import { calculateComfortFloor } from '@/utils/cheatDayHelpers';

type Props = {
  planData: PlanData;
  onClose: () => void;
  onApply: (adjustments: Record<string, number>) => Promise<void>;
  saving: boolean;
};

type DayAdjustment = {
  selected: boolean;
  reduction: number;
};

export default function ManualDistributeView({ planData, onClose, onApply, saving }: Props) {
  const { overageAmount, days, userGoal, userGender } = planData;

  const comfortFloor      = calculateComfortFloor(userGoal, userGender);
  const adjustableDays    = days.filter((d) => !d.isPast && !d.isTreatDay);
  const treatDaysThisWeek = days.filter((d) => !d.isPast && d.isTreatDay);

  const initialState = Object.fromEntries(
    adjustableDays.map((d) => [d.date, { selected: true, reduction: 0 } as DayAdjustment])
  );

  const [adjustments, setAdjustments] = useState<Record<string, DayAdjustment>>(initialState);

  const STEP = 50;

  const totalDistributed = Object.values(adjustments).reduce(
    (sum, a) => sum + (a.selected ? a.reduction : 0), 0
  );

  function toggleDay(date: string) {
    setAdjustments((prev) => ({
      ...prev,
      [date]: { ...prev[date], selected: !prev[date].selected, reduction: 0 },
    }));
  }

  // Takes AWAY from the day — increases reduction
  function reduceDay(date: string, currentTarget: number) {
    setAdjustments((prev) => {
      const current      = prev[date].reduction;
      const maxReduction = currentTarget - comfortFloor;
      const next         = Math.min(current + STEP, maxReduction);
      return { ...prev, [date]: { ...prev[date], reduction: next } };
    });
  }

  // Gives BACK to the day — decreases reduction
  function restoreDay(date: string) {
    setAdjustments((prev) => {
      const next = Math.max(prev[date].reduction - STEP, 0);
      return { ...prev, [date]: { ...prev[date], reduction: next } };
    });
  }

  function handleReset() {
    setAdjustments(initialState);
  }

  async function handleApply() {
    const result: Record<string, number> = {};
    for (const day of adjustableDays) {
      const adj = adjustments[day.date];
      if (adj.selected && adj.reduction > 0) {
        result[day.date] = Math.max(day.target - adj.reduction, comfortFloor);
      }
    }
    await onApply(result);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning-outline" size={16} color={Colors.energyOrange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              Over budget by {overageAmount.toLocaleString()} cal
            </Text>
            <Text style={styles.headerSubtitle}>
              Distribute across {adjustableDays.length} remaining days
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={18} color={Colors.steelBlue} />
        </TouchableOpacity>
      </View>

      {/* Distributed tracker */}
      <View style={styles.trackerRow}>
        <Text style={styles.trackerLabel}>Distributed</Text>
        <Text style={[
          styles.trackerValue,
          totalDistributed >= overageAmount && styles.trackerValueDone,
        ]}>
          {totalDistributed.toLocaleString()} / {overageAmount.toLocaleString()} cal
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Days list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.dayList}
        contentContainerStyle={{ gap: Spacing.sm }}
      >
        {adjustableDays.map((day) => {
          const adj        = adjustments[day.date];
          const newTarget  = Math.max(day.target - adj.reduction, comfortFloor);
          const isSelected = adj.selected;
          const atFloor    = newTarget <= comfortFloor;

          return (
            <View
              key={day.date}
              style={[styles.dayRow, !isSelected && styles.dayRowDisabled]}
            >
              {/* Checkbox */}
              <TouchableOpacity
                style={[styles.checkbox, isSelected && styles.checkboxActive]}
                onPress={() => toggleDay(day.date)}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={12} color={Colors.white} />
                )}
              </TouchableOpacity>

              {/* Day info */}
              <View style={styles.dayInfo}>
                <Text style={[styles.dayLabel, !isSelected && styles.textMuted]}>
                  {day.dayLabel}
                </Text>
                <Text style={[styles.dayDate, !isSelected && styles.textMuted]}>
                  {day.shortDate}
                </Text>
              </View>

              {/* Stepper — minus takes away, plus gives back */}
              {isSelected && (
                <View style={styles.stepper}>
                  {/* MINUS — takes away calories (reduces target) */}
                  <TouchableOpacity
                    style={[
                      styles.stepperBtn,
                      atFloor && styles.stepperBtnDisabled,
                    ]}
                    onPress={() => reduceDay(day.date, day.target)}
                    disabled={atFloor}
                  >
                    <Ionicons
                      name="remove"
                      size={16}
                      color={atFloor ? Colors.border : Colors.white}
                    />
                  </TouchableOpacity>

                  {/* PLUS — gives back calories (restores target) */}
                  <TouchableOpacity
                    style={[
                      styles.stepperBtn,
                      adj.reduction === 0 && styles.stepperBtnDisabled,
                    ]}
                    onPress={() => restoreDay(day.date)}
                    disabled={adj.reduction === 0}
                  >
                    <Ionicons
                      name="add"
                      size={16}
                      color={adj.reduction === 0 ? Colors.border : Colors.white}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* New target */}
              <Text style={[styles.targetCal, !isSelected && styles.textMuted]}>
                {newTarget.toLocaleString()}
              </Text>
            </View>
          );
        })}

        {/* Treat days — not adjustable */}
        {treatDaysThisWeek.map((day) => (
          <View key={day.date} style={[styles.dayRow, styles.dayRowDisabled]}>
            <View style={styles.checkboxDisabled} />
            <View style={styles.dayInfo}>
              <Text style={styles.textMuted}>{day.dayLabel}</Text>
              <Text style={[styles.dayDate, styles.textMuted]}>{day.shortDate}</Text>
              <Text style={styles.treatLabel}>Treat day</Text>
            </View>
            <Text style={styles.textMuted}>{day.target.toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleReset}
          disabled={saving}
        >
          <Text style={styles.resetBtnText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.applyBtn,
            (totalDistributed === 0 || saving) && styles.applyBtnDisabled,
          ]}
          onPress={handleApply}
          disabled={saving || totalDistributed === 0}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.applyBtnText}>Apply Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.orangeOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  warningIcon: {
    width: 32, height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.energyOrange,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.graphite,
    marginTop: 2,
  },
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackerLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    fontWeight: Typography.fontWeight.medium,
  },
  trackerValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.energyOrange,
  },
  trackerValueDone: {
    color: Colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  dayList: {
    maxHeight: 280,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  dayRowDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 22, height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.vividTeal,
    borderColor: Colors.vividTeal,
  },
  checkboxDisabled: {
    width: 22, height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  dayInfo:  { flex: 1 },
  dayLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  dayDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 1,
  },
  treatLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.energyOrange,
    marginTop: 1,
  },
  stepper: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  stepperBtn: {
    width: 28, height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.vividTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: Colors.lightCream,
  },
  targetCal: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    minWidth: 48,
    textAlign: 'right',
  },
  textMuted: { color: Colors.textMuted },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.graphite,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.vividTeal,
    alignItems: 'center',
  },
  applyBtnDisabled: { opacity: 0.5 },
  applyBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
});