
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import { PlannedCheatDay } from '@haven/shared-types';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '@/constants/colors';
import { getLocalDateString } from '@haven/shared-utils';

export default function TreatDaysView() {
  const router = useRouter();
  const [cheatDays, setCheatDays]             = useState<PlannedCheatDay[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [totalReserved, setTotalReserved]     = useState(0);
  const [weeklyBudget, setWeeklyBudget]       = useState(0);
  const [isInBaseline, setIsInBaseline]       = useState(false);
  const [baselineProgress, setBaselineProgress] = useState({
    daysLogged: 0,
    daysNeeded: 7,
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
      checkBaselineStatus();
    }, [])
  );

  async function checkBaselineStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('baseline_complete, baseline_start_date')
        .eq('id', user.id)
        .single();

      if (profile && !profile.baseline_complete) {
        setIsInBaseline(true);
        const { data: dailySummaries } = await supabase
          .from('daily_summaries')
          .select('summary_date')
          .eq('user_id', user.id)
          .gte('summary_date', profile.baseline_start_date)
          .order('summary_date', { ascending: true });

        setBaselineProgress({
          daysLogged: dailySummaries?.length ?? 0,
          daysNeeded: 7,
        });
      } else {
        setIsInBaseline(false);
      }
    } catch (error) {
      console.error('Error checking baseline status:', error);
    }
  }

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = getLocalDateString();

      const { data: cheatDaysData } = await supabase
        .from('planned_cheat_days')
        .select('*')
        .eq('user_id', user.id)
        .gte('cheat_date', today)
        .order('cheat_date', { ascending: true });

      if (cheatDaysData) {
        setCheatDays(cheatDaysData);
        setTotalReserved(
          cheatDaysData.reduce((sum, d) => sum + (d.planned_calories ?? 0), 0)
        );
      }

      const { data: weeklyPeriod } = await supabase
        .from('weekly_periods')
        .select('weekly_budget')
        .eq('user_id', user.id)
        .lte('week_start_date', today)
        .gte('week_end_date', today)
        .maybeSingle();

      if (weeklyPeriod) setWeeklyBudget(weeklyPeriod.weekly_budget);
    } catch (error) {
      console.error('Error loading treat days:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert(
      'Delete Treat Day',
      'Are you sure you want to delete this planned treat day?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('planned_cheat_days')
                .delete()
                .eq('id', id);
              if (error) throw error;
              loadData();
            } catch {
              Alert.alert('Error', 'Failed to delete treat day.');
            }
          },
        },
      ]
    );
  }

  function handleEdit(cheatDay: PlannedCheatDay) {
    router.push({
      pathname: '/editCheatDay',
      params: {
        id:       cheatDay.id,
        date:     cheatDay.cheat_date,
        calories: cheatDay.planned_calories.toString(),
        notes:    cheatDay.notes ?? '',
      },
    });
  }

  function handlePlanNew() {
    if (isInBaseline) {
      Alert.alert(
        'Complete Baseline First',
        'Finish tracking your baseline week to unlock treat day planning.'
      );
      return;
    }
    router.push('/planCheatDay');
  }

  function formatDate(dateString: string) {
    const date   = new Date(dateString + 'T00:00:00');
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return {
      dayName: days[date.getDay()],
      dateStr: `${months[date.getMonth()]} ${date.getDate()}`,
    };
  }

  const isOverBudget = totalReserved > weeklyBudget && weeklyBudget > 0;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.vividTeal} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
      }
    >
      {/* Baseline banner */}
      {isInBaseline && (
        <View style={styles.baselineBanner}>
          <View style={styles.bannerContent}>
            <Ionicons name="lock-closed" size={24} color={Colors.energyOrange} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Complete your baseline week first</Text>
              <Text style={styles.bannerSubtitle}>
                Track {baselineProgress.daysNeeded - baselineProgress.daysLogged} more{' '}
                {baselineProgress.daysNeeded - baselineProgress.daysLogged === 1 ? 'day' : 'days'} to unlock treat day planning
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: `${(baselineProgress.daysLogged / baselineProgress.daysNeeded) * 100}%` },
            ]} />
          </View>
        </View>
      )}

      {/* Over budget warning */}
      {isOverBudget && (
        <View style={styles.overBudgetBanner}>
          <Ionicons name="warning" size={20} color={Colors.error} />
          <Text style={styles.overBudgetText}>
            Reserved treat day calories exceed your weekly budget of{' '}
            {weeklyBudget.toLocaleString()} cal. Consider removing or reducing a treat day.
          </Text>
        </View>
      )}

      {/* Stat cards */}
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.tealOverlay }]}>
            <Ionicons name="calendar" size={24} color={Colors.vividTeal} />
          </View>
          <Text style={styles.statNumber}>{cheatDays.length}</Text>
          <Text style={styles.statLabel}>Planned Days</Text>
        </View>

        <View style={[styles.statCard, isOverBudget && styles.statCardWarning]}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.orangeOverlay }]}>
            <Ionicons name="flame" size={24} color={Colors.energyOrange} />
          </View>
          <Text style={styles.statNumber}>{totalReserved.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Reserved Cal</Text>
          {isOverBudget && (
            <Text style={styles.statWarningText}>Exceeds budget</Text>
          )}
        </View>
      </View>

      {/* Treat days list or empty state */}
      {cheatDays.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="calendar" size={40} color={Colors.steelBlue} />
          </View>
          <Text style={styles.emptyText}>No treat days planned yet</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {cheatDays.map((day) => {
            const { dayName, dateStr } = formatDate(day.cheat_date);
            return (
              <View key={day.id} style={styles.treatCard}>
                <View style={styles.treatLeft}>
                  <View style={styles.treatIconCircle}>
                    <Ionicons name="fast-food" size={24} color={Colors.energyOrange} />
                  </View>
                  <View style={styles.treatInfo}>
                    <Text style={styles.treatDayName}>{dayName}</Text>
                    <Text style={styles.treatDetails}>
                      {dateStr} · {day.planned_calories.toLocaleString()} cal
                    </Text>
                  </View>
                </View>
                <View style={styles.treatActions}>
                  <TouchableOpacity
                    onPress={() => handleEdit(day)}
                    style={styles.actionBtn}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="pencil" size={20} color={Colors.steelBlue} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(day.id)}
                    style={styles.actionBtn}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="trash" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Plan treat day button */}
      <TouchableOpacity
        style={[styles.primaryBtn, isInBaseline && styles.primaryBtnDisabled]}
        onPress={handlePlanNew}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={Colors.white} />
        <Text style={styles.primaryBtnText}>Plan Treat Day</Text>
      </TouchableOpacity>

      {/* Tips card */}
      <View style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Ionicons name="bulb" size={20} color={Colors.energyOrange} />
          <Text style={styles.tipsTitle}>Planning Tips</Text>
        </View>
        <View style={styles.tipsList}>
          <Text style={styles.tipText}>
            • Plan treat days in advance to help HAVEN adjust your weekly budget
          </Text>
          <Text style={styles.tipText}>
            • Don't feel guilty — treat days are part of the plan!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.lightCream },
  content:    { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Baseline banner
  baselineBanner: {
    backgroundColor: Colors.orangeOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.energyOrange + '40',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  bannerText:     { flex: 1, marginLeft: Spacing.md },
  bannerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.white,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.energyOrange,
    borderRadius: 3,
  },

  // Over budget
  overBudgetBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  overBudgetText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.sm * 1.5,
  },

  // Stat cards
  statRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.small,
  },
  statCardWarning: {
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: '#FEF2F2',
  },
  iconCircle: {
    width: 56, height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  statNumber: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
  },
  statWarningText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.xs,
  },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxxl,
    alignItems: 'center',
    ...Shadows.small,
  },
  emptyIconCircle: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightCream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.steelBlue,
  },

  // Treat day cards
  list: { gap: Spacing.md },
  treatCard: {
    backgroundColor: Colors.orangeOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.energyOrange + '20',
  },
  treatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  treatIconCircle: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  treatInfo:    { flex: 1 },
  treatDayName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: 2,
  },
  treatDetails: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
  },
  treatActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn:    { padding: Spacing.sm },

  // Primary button
  primaryBtn: {
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.steelBlue,
    opacity: 0.6,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginLeft: Spacing.sm,
  },

  // Tips
  tipsCard: {
    backgroundColor: Colors.orangeOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.energyOrange + '20',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginLeft: Spacing.sm,
  },
  tipsList: { gap: Spacing.sm },
  tipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.graphite,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
  },
});