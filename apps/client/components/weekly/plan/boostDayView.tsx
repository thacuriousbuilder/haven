
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { DayPlan, PlanData } from '@/hooks/usePlanData';
import { calculateComfortFloor } from '@/utils/cheatDayHelpers';
import { supabase } from '@/lib/supabase';

type Props = {
  planData: PlanData;
  onClose: () => void;
  onSaved: () => void;
};

type Tier = {
  label: string;
  description: string;
  amount: number;
  icon: string;
};

const TIERS: Tier[] = [
  { label: 'Light boost',    description: 'A little extra room',     amount: 200, icon: 'leaf-outline' },
  { label: 'Moderate boost', description: 'Dinner out or a treat',   amount: 400, icon: 'restaurant-outline' },
  { label: 'Big night',      description: 'Celebration or event',    amount: 600, icon: 'star-outline' },
];

export default function BoostDayView({ planData, onClose, onSaved }: Props) {
  const { days, userGoal, userGender, weeklyPeriodId } = planData;
  const [selectedDay, setSelectedDay]   = useState<DayPlan | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const comfortFloor    = calculateComfortFloor(userGoal, userGender);
  const pickableDays    = days.filter((d) => !d.isPast && !d.isTreatDay);

  function isTierSafe(tier: Tier, boostDay: DayPlan): boolean {
    const otherDays       = pickableDays.filter((d) => d.date !== boostDay.date);
    if (otherDays.length === 0) return false;
    const reductionPerDay = tier.amount / otherDays.length;
    return otherDays.every((d) => d.target - reductionPerDay >= comfortFloor);
  }

  function getNewTargets(tier: Tier, boostDay: DayPlan): Record<string, number> {
    const otherDays       = pickableDays.filter((d) => d.date !== boostDay.date);
    const reductionPerDay = tier.amount / otherDays.length;
    const result: Record<string, number> = {
      [boostDay.date]: boostDay.target + tier.amount,
    };
    for (const day of otherDays) {
      result[day.date] = Math.max(
        Math.round(day.target - reductionPerDay),
        comfortFloor
      );
    }
    return result;
  }

  async function handleConfirm() {
    if (!selectedDay || !selectedTier) return;
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newTargets = getNewTargets(selectedTier, selectedDay);

      const upserts = Object.entries(newTargets).map(([date, calories]) => ({
        user_id:           user.id,
        weekly_period_id:  weeklyPeriodId,
        target_date:       date,
        adjusted_calories: calories,
      }));

      const { error: upsertError } = await supabase
        .from('daily_target_adjustments')
        .upsert(upserts, { onConflict: 'user_id,target_date' });

      if (upsertError) throw upsertError;

      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={16} color={Colors.vividTeal} />
          <Text style={styles.headerTitle}>Save calories for a day</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={18} color={Colors.steelBlue} />
        </TouchableOpacity>
      </View>

      <Text style={styles.stepLabel}>
        {!selectedDay ? 'Which day?' : 'How much extra?'}
      </Text>

      {/* Step 1 — Pick a day */}
      {!selectedDay ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayPicker}
        >
          {pickableDays.map((day) => (
            <TouchableOpacity
              key={day.date}
              style={styles.dayChip}
              onPress={() => setSelectedDay(day)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.dayChipBadge,
                day.isToday && styles.dayChipBadgeToday,
              ]}>
                <Text style={[
                  styles.dayChipNumber,
                  day.isToday && styles.dayChipNumberToday,
                ]}>
                  {day.dayNumber}
                </Text>
              </View>
              <Text style={[
                styles.dayChipLabel,
                day.isToday && styles.dayChipLabelToday,
              ]}>
                {day.isToday ? 'Today' : day.dayLabel}
              </Text>
              <Text style={styles.dayChipTarget}>
                {day.target.toLocaleString()} cal
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <>
          {/* Selected day summary */}
          <TouchableOpacity
            style={styles.selectedDayRow}
            onPress={() => { setSelectedDay(null); setSelectedTier(null); }}
            activeOpacity={0.7}
          >
            <View style={styles.selectedDayBadge}>
              <Text style={styles.selectedDayNumber}>{selectedDay.dayNumber}</Text>
            </View>
            <View style={styles.selectedDayInfo}>
              <Text style={styles.selectedDayLabel}>
                {selectedDay.isToday ? 'Today' : selectedDay.dayLabel}
              </Text>
              <Text style={styles.selectedDayTarget}>
                {selectedDay.target.toLocaleString()} cal target
              </Text>
            </View>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          {/* Step 2 — Pick a tier */}
          <View style={styles.tierList}>
            {TIERS.map((tier) => {
              const safe     = isTierSafe(tier, selectedDay);
              const selected = selectedTier?.label === tier.label;
              const newTarget = selectedDay.target + tier.amount;

              return (
                <TouchableOpacity
                  key={tier.label}
                  style={[
                    styles.tierCard,
                    selected && styles.tierCardSelected,
                    !safe && styles.tierCardDisabled,
                  ]}
                  onPress={() => safe && setSelectedTier(tier)}
                  activeOpacity={safe ? 0.7 : 1}
                >
                  <Ionicons
                    name={tier.icon as any}
                    size={18}
                    color={
                      !safe ? Colors.border :
                      selected ? Colors.white :
                      Colors.vividTeal
                    }
                  />
                  <View style={styles.tierInfo}>
                    <Text style={[
                      styles.tierLabel,
                      selected && styles.tierLabelSelected,
                      !safe && styles.tierLabelDisabled,
                    ]}>
                      {tier.label}
                    </Text>
                    <Text style={[
                      styles.tierDescription,
                      selected && styles.tierDescriptionSelected,
                      !safe && styles.tierDescriptionDisabled,
                    ]}>
                      {safe ? tier.description : 'Not enough buffer remaining'}
                    </Text>
                  </View>
                  <View style={styles.tierRight}>
                    <Text style={[
                      styles.tierAmount,
                      selected && styles.tierAmountSelected,
                      !safe && styles.tierAmountDisabled,
                    ]}>
                      +{tier.amount}
                    </Text>
                    <Text style={[
                      styles.tierNewTarget,
                      selected && styles.tierNewTargetSelected,
                      !safe && styles.tierAmountDisabled,
                    ]}>
                      {newTarget.toLocaleString()} cal
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* What happens to other days */}
          {selectedTier && (
            <View style={styles.redistributeNote}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.steelBlue} />
              <Text style={styles.redistributeText}>
                Other days will each be reduced by{' '}
                <Text style={styles.redistributeBold}>
                  {Math.round(selectedTier.amount / (pickableDays.length - 1))} cal
                </Text>
                {' '}to keep your week balanced.
              </Text>
            </View>
          )}

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Confirm */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!selectedTier || saving) && styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!selectedTier || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.confirmBtnText}>
                Confirm Boost
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.tealOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vividTeal,
  },
  stepLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.steelBlue,
  },

  // Day picker
  dayPicker: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  dayChip: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minWidth: 72,
    gap: Spacing.xs,
    ...Shadows.small,
  },
  dayChipBadge: {
    width: 36, height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipBadgeToday: {
    backgroundColor: Colors.vividTeal,
  },
  dayChipNumber: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  dayChipNumberToday: {
    color: Colors.white,
  },
  dayChipLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.graphite,
  },
  dayChipLabelToday: {
    color: Colors.vividTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  dayChipTarget: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },

  // Selected day
  selectedDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.small,
  },
  selectedDayBadge: {
    width: 36, height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.vividTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDayNumber: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  selectedDayInfo: { flex: 1 },
  selectedDayLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  selectedDayTarget: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },
  changeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.vividTeal,
    fontWeight: Typography.fontWeight.medium,
  },

  // Tier cards
  tierList: { gap: Spacing.sm },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.small,
  },
  tierCardSelected: {
    backgroundColor: Colors.vividTeal,
    borderColor: Colors.vividTeal,
  },
  tierCardDisabled: {
    opacity: 0.5,
  },
  tierInfo:  { flex: 1 },
  tierLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  tierLabelSelected: { color: Colors.white },
  tierLabelDisabled: { color: Colors.textMuted },
  tierDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },
  tierDescriptionSelected: { color: 'rgba(255,255,255,0.75)' },
  tierDescriptionDisabled: { color: Colors.textMuted },
  tierRight:  { alignItems: 'flex-end' },
  tierAmount: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.vividTeal,
  },
  tierAmountSelected: { color: Colors.white },
  tierAmountDisabled: { color: Colors.textMuted },
  tierNewTarget: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },
  tierNewTargetSelected: { color: 'rgba(255,255,255,0.75)' },

  // Redistribute note
  redistributeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  redistributeText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.relaxed,
  },
  redistributeBold: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },
  confirmBtn: {
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
});