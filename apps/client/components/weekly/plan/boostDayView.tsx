import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
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
  { label: 'Light boost',    description: 'A little extra room',   amount: 200, icon: 'leaf-outline' },
  { label: 'Moderate boost', description: 'Dinner out or a treat', amount: 400, icon: 'restaurant-outline' },
  { label: 'Big night',      description: 'Celebration or event',  amount: 600, icon: 'star-outline' },
];

export default function BoostDayView({ planData, onClose, onSaved }: Props) {
  const { days, userGoal, userGender, weeklyPeriodId } = planData;

  const todayPlan = days.find(d => d.isToday) ?? null

  // Detect active boost — any non-treat day with adjustedCalories above baseTarget
  const hasActiveBoost = days.some(d =>
    !d.isTreatDay &&
    d.adjustedCalories != null &&
    d.adjustedCalories > d.baseTarget
  )

  const boostedDay = days.find(d =>
    !d.isTreatDay &&
    d.adjustedCalories != null &&
    d.adjustedCalories > d.baseTarget
  ) ?? null

  const boostAmount = boostedDay
    ? boostedDay.adjustedCalories! - boostedDay.baseTarget
    : 0

  const [selectedDay]               = useState<DayPlan | null>(todayPlan)
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null)
  const [saving, setSaving]             = useState(false)
  const [removing, setRemoving]         = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const comfortFloor = calculateComfortFloor(userGoal, userGender)
  const pickableDays = days.filter(d => !d.isPast && !d.isTreatDay)

  function isTierSafe(tier: Tier, boostDay: DayPlan): boolean {
    const otherDays       = pickableDays.filter(d => d.date !== boostDay.date)
    if (otherDays.length === 0) return false
    const reductionPerDay = tier.amount / otherDays.length
    return otherDays.every(d => d.target - reductionPerDay >= comfortFloor)
  }

  function getNewTargets(tier: Tier, boostDay: DayPlan): Record<string, number> {
    const otherDays       = pickableDays.filter(d => d.date !== boostDay.date)
    const reductionPerDay = tier.amount / otherDays.length
    const result: Record<string, number> = {
      [boostDay.date]: boostDay.target + tier.amount,
    }
    for (const day of otherDays) {
      result[day.date] = Math.max(
        Math.round(day.target - reductionPerDay),
        comfortFloor
      )
    }
    return result
  }

  async function handleConfirm() {
    if (!selectedDay || !selectedTier) return
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const newTargets = getNewTargets(selectedTier, selectedDay)

      const upserts = Object.entries(newTargets).map(([date, calories]) => ({
        user_id:           user.id,
        weekly_period_id:  weeklyPeriodId,
        target_date:       date,
        adjusted_calories: calories,
      }))

      const { error: upsertError } = await supabase
        .from('daily_target_adjustments')
        .upsert(upserts, { onConflict: 'user_id,target_date' })

      if (upsertError) throw upsertError

      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveBoost() {
    Alert.alert(
      'Reset week targets?',
      'This will remove your boost and reset all days to even distribution.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true)
            setError(null)

            try {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) throw new Error('Not authenticated')

              const { error: deleteError } = await supabase
                .from('daily_target_adjustments')
                .delete()
                .eq('user_id', user.id)
                .eq('weekly_period_id', weeklyPeriodId)

              if (deleteError) throw deleteError

              onSaved()
            } catch (err: any) {
              setError(err.message)
            } finally {
              setRemoving(false)
            }
          },
        },
      ]
    )
  }

  // ── Active boost view ───────────────────────────────────────────────────────
  if (hasActiveBoost && boostedDay) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sunny-outline" size={16} color={Colors.vividTeal} />
            <Text style={styles.headerTitle}>Boost active this week</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={18} color={Colors.steelBlue} />
          </TouchableOpacity>
        </View>

        {/* Boost summary */}
        <View style={styles.boostSummaryCard}>
          <View style={styles.boostSummaryLeft}>
            <View style={styles.boostIconWrap}>
              <Ionicons name="arrow-up-circle" size={20} color={Colors.vividTeal} />
            </View>
            <View>
              <Text style={styles.boostSummaryLabel}>
                {boostedDay.isToday
                  ? 'Boosted today'
                  : `Boosted on ${boostedDay.dayLabel}`}
              </Text>
              <Text style={styles.boostSummaryAmount}>
                +{boostAmount} cal added
              </Text>
            </View>
          </View>
          <View style={styles.boostBadge}>
            <Text style={styles.boostBadgeText}>Active</Text>
          </View>
        </View>

        {/* Info note */}
        <View style={styles.redistributeNote}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.steelBlue} />
          <Text style={styles.redistributeText}>
            Your other days have been slightly reduced to keep your weekly budget balanced.
          </Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Remove boost */}
        <TouchableOpacity
          style={[styles.removeBtn, removing && styles.confirmBtnDisabled]}
          onPress={handleRemoveBoost}
          disabled={removing}
          activeOpacity={0.8}
        >
          {removing ? (
            <ActivityIndicator color={Colors.error} size="small" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={16} color={Colors.error} />
              <Text style={styles.removeBtnText}>Reset week to even distribution</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  // ── New boost view ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sunny-outline" size={16} color={Colors.vividTeal} />
          <Text style={styles.headerTitle}>It all balances out over the week.</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={18} color={Colors.steelBlue} />
        </TouchableOpacity>
      </View>

      {!selectedDay ? (
        <Text style={styles.noTodayText}>
          No target set for today yet.
        </Text>
      ) : (
        <>
          {/* Today's current target */}
          <View style={styles.todayRow}>
            <View style={styles.todayBadge}>
              <Ionicons name="today-outline" size={16} color={Colors.white} />
            </View>
            <View style={styles.todayInfo}>
              <Text style={styles.todayLabel}>Today's target</Text>
              <Text style={styles.todayTarget}>
                {selectedDay.target.toLocaleString()} cal
              </Text>
            </View>
          </View>

          {/* Tier selection */}
          <View style={styles.tierList}>
            {TIERS.map((tier) => {
              const safe      = isTierSafe(tier, selectedDay)
              const selected  = selectedTier?.label === tier.label
              const newTarget = selectedDay.target + tier.amount

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
                      !safe    ? Colors.border :
                      selected ? Colors.white  :
                      Colors.vividTeal
                    }
                  />
                  <View style={styles.tierInfo}>
                    <Text style={[
                      styles.tierLabel,
                      selected && styles.tierLabelSelected,
                      !safe    && styles.tierLabelDisabled,
                    ]}>
                      {tier.label}
                    </Text>
                    <Text style={[
                      styles.tierDescription,
                      selected && styles.tierDescriptionSelected,
                      !safe    && styles.tierDescriptionDisabled,
                    ]}>
                      {safe ? tier.description : 'Not enough buffer remaining'}
                    </Text>
                  </View>
                  <View style={styles.tierRight}>
                    <Text style={[
                      styles.tierAmount,
                      selected && styles.tierAmountSelected,
                      !safe    && styles.tierAmountDisabled,
                    ]}>
                      +{tier.amount}
                    </Text>
                    <Text style={[
                      styles.tierNewTarget,
                      selected && styles.tierNewTargetSelected,
                      !safe    && styles.tierAmountDisabled,
                    ]}>
                      {newTarget.toLocaleString()} cal
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Redistribute note */}
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

          {error && <Text style={styles.errorText}>{error}</Text>}

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
                Add calories to today
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  )
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
    flex: 1,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vividTeal,
    flexShrink: 1,
  },
  noTodayText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  // Today row
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.small,
  },
  todayBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.vividTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayInfo:  { flex: 1 },
  todayLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginBottom: 2,
  },
  todayTarget: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },

  // Boost summary
  boostSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.small,
  },
  boostSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  boostIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.tealOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostSummaryLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  boostSummaryAmount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },
  boostBadge: {
    backgroundColor: Colors.tealOverlay,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  boostBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vividTeal,
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
  tierCardDisabled: { opacity: 0.5 },
  tierInfo:  { flex: 1 },
  tierLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  tierLabelSelected:  { color: Colors.white },
  tierLabelDisabled:  { color: Colors.textMuted },
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

  // Remove boost
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  removeBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.error,
  },
})