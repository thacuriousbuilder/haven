
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { PlanData } from '@/hooks/usePlanData';
import { calculateComfortFloor } from '@/utils/cheatDayHelpers';
import { supabase } from '@/lib/supabase';
import ManualDistributeView from '../plan/manualDistributionView';
import BoostDayView from '../plan/boostDayView';

type Props = {
  planData: PlanData;
  refetch: () => void;
};

type ManageMode = 'collapsed' | 'expanded' | 'manual';

export default function ManageCaloriesCard({ planData, refetch }: Props) {
  const { isOverBudget, overageAmount, days, userGoal, userGender } = planData;
  const [manageMode, setManageMode] = useState<ManageMode>('collapsed');
  const [saving, setSaving]         = useState(false);
  const [showBoost, setShowBoost] = useState(false);

  const comfortFloor   = calculateComfortFloor(userGoal, userGender);
  const adjustableDays = days.filter((d) => !d.isPast && !d.isTreatDay);
  const remainingDays  = adjustableDays.length;

  const perDayReduction = remainingDays > 0
    ? Math.round(overageAmount / remainingDays)
    : 0;

  const safeAutoReduction = adjustableDays.reduce((maxSafe, day) => {
    const maxAllowed = day.target - comfortFloor;
    return Math.min(maxSafe, maxAllowed, perDayReduction);
  }, perDayReduction);

  const totalSafeReduction     = safeAutoReduction * remainingDays;
  const unrecoverableOverage   = Math.max(overageAmount - totalSafeReduction, 0);
  const isPartiallyRecoverable = unrecoverableOverage > 0;

  async function handleAutoDistribute() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const upserts = adjustableDays.map((day) => ({
        user_id:           user.id,
        weekly_period_id:  planData.weeklyPeriodId,
        target_date:       day.date,
        adjusted_calories: Math.max(day.target - perDayReduction, comfortFloor),
      }));

      const { error } = await supabase
        .from('daily_target_adjustments')
        .upsert(upserts, { onConflict: 'user_id,target_date' });

      if (error) throw error;

      refetch();
      setManageMode('collapsed');
    } catch (err: any) {
      console.log('Auto distribute error:', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleManualApply(adjustments: Record<string, number>) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const upserts = Object.entries(adjustments).map(([date, calories]) => ({
        user_id:           user.id,
        weekly_period_id:  planData.weeklyPeriodId,
        target_date:       date,
        adjusted_calories: calories,
      }));

      const { error } = await supabase
        .from('daily_target_adjustments')
        .upsert(upserts, { onConflict: 'user_id,target_date' });

      if (error) throw error;

      refetch();
      setManageMode('collapsed');
    } catch (err: any) {
      console.log('Manual apply error:', err.message);
    } finally {
      setSaving(false);
    }
  }

  // --- State 1: Within budget
  if (!isOverBudget) {
    if (showBoost) {
      return (
        <BoostDayView
          planData={planData}
          onClose={() => setShowBoost(false)}
          onSaved={() => {
            setShowBoost(false);
            refetch();
          }}
        />
      );
    }
  
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setShowBoost(true)}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>Save calories for a day</Text>
          <Text style={styles.cardSubtitle}>
            Plan ahead for a dinner out or special occasion
          </Text>
        </View>
        <View style={styles.manageBtnWrapper}>
          <Text style={styles.manageBtnText}>Plan</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // --- State 2: Over budget collapsed
  if (manageMode === 'collapsed') {
    return (
      <TouchableOpacity
        style={styles.cardOverCollapsed}
        onPress={() => setManageMode('expanded')}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.overTitle}>
            Over budget by {overageAmount.toLocaleString()} cal
          </Text>
          <Text style={styles.overSubtitle}>
            {isPartiallyRecoverable
              ? `Recover what you can — progress isn't lost`
              : `Balance your remaining days`}
          </Text>
        </View>
        <View style={styles.manageBtnOrange}>
          <Text style={styles.manageBtnOrangeText}>Manage</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // --- State 3: Manual distribute
  if (manageMode === 'manual') {
    return (
      <ManualDistributeView
        planData={planData}
        onClose={() => setManageMode('collapsed')}
        onApply={handleManualApply}
        saving={saving}
      />
    );
  }

  // --- State 4: Expanded
  return (
    <View style={styles.cardOverExpanded}>
      {/* Header */}
      <View style={styles.expandedHeader}>
        <View style={styles.expandedHeaderLeft}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning-outline" size={16} color={Colors.energyOrange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.overTitle}>
              Over budget by {overageAmount.toLocaleString()} cal
            </Text>
            <Text style={styles.overSubtitle}>
              Distribute across {remainingDays} remaining{' '}
              {remainingDays === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setManageMode('collapsed')}>
          <Ionicons name="close" size={18} color={Colors.steelBlue} />
        </TouchableOpacity>
      </View>

      {/* Auto-distribute */}
      <TouchableOpacity
        style={[styles.optionBtnPrimary, saving && styles.btnDisabled]}
        onPress={handleAutoDistribute}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <>
            <Ionicons name="flash-outline" size={16} color={Colors.white} />
            <View style={styles.optionBtnText}>
              <Text style={styles.optionTitlePrimary}>Auto-distribute evenly</Text>
              <Text style={styles.optionSubtitlePrimary}>
                -{safeAutoReduction.toLocaleString()} cal per day
              </Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* Manual */}
      <TouchableOpacity
        style={styles.optionBtnSecondary}
        onPress={() => setManageMode('manual')}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Ionicons name="hand-left-outline" size={16} color={Colors.graphite} />
        <View style={styles.optionBtnText}>
          <Text style={styles.optionTitleSecondary}>Choose manually</Text>
          <Text style={styles.optionSubtitleSecondary}>
            Select which days to adjust
          </Text>
        </View>
      </TouchableOpacity>

      {/* Mindful note — only shown when overage can't be fully recovered */}
      {isPartiallyRecoverable && (
        <View style={styles.mindfulNote}>
          <Ionicons name="leaf-outline" size={14} color={Colors.vividTeal} />
          <Text style={styles.mindfulText}>
            You can safely recover{' '}
            <Text style={styles.mindfulBold}>
              {totalSafeReduction.toLocaleString()} of {overageAmount.toLocaleString()} cal
            </Text>
            {' '}this week. The rest is just one moment in a long
            journey — consistency over time matters far more than any single week.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Within budget
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.small,
  },
  cardLeft: { flex: 1 },
  cardTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  cardSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },
  manageBtnWrapper: {
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.steelBlue,
  },

  // Over budget collapsed
  cardOverCollapsed: {
    backgroundColor: Colors.orangeOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.small,
  },

  // Over budget expanded
  cardOverExpanded: {
    backgroundColor: Colors.orangeOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.small,
  },

  overTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.energyOrange,
  },
  overSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.graphite,
    marginTop: 2,
  },
  manageBtnOrange: {
    backgroundColor: Colors.energyOrange,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'center',
  },
  manageBtnOrangeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },

  // Expanded header
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  expandedHeaderLeft: {
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

  // Options
  optionBtnPrimary: {
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 56,
  },
  optionBtnSecondary: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionBtnText: { flex: 1 },
  optionTitlePrimary: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  optionSubtitlePrimary: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  optionTitleSecondary: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  optionSubtitleSecondary: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },

  // Mindful note
  mindfulNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.tealOverlay,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  mindfulText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.graphite,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.relaxed,
  },
  mindfulBold: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vividTeal,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});