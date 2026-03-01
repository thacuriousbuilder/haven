
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase, getLocalDateString, formatLocalDate } from '@haven/shared-utils';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/colors';
import { StreakAndTreatsCard } from '@/components/progress/cards/streakAndTreatsCard';
import { CurrentWeightCard } from '@/components/progress/cards/currentWeightCard';
import { WeeklyBudgetPerformanceCard } from '@/components/progress/cards/weeklyBudgetPerformanceCard';
import { Ionicons } from '@expo/vector-icons';

export default function ProgressScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [treatDaysCount, setTreatDaysCount] = useState(0);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [startWeight, setStartWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [hasWeightLog, setHasWeightLog] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kgs'>('lbs');
  const [weightStartDate, setWeightStartDate] = useState<Date | null>(null);
  const [weeklyWeightGoal, setWeeklyWeightGoal] = useState<number>(1.0);
  const [isInBaseline, setIsInBaseline] = useState(false);
  const [baselineProgress, setBaselineProgress] = useState({ daysLogged: 0, daysNeeded: 7 });
  const [weeklyPerformance, setWeeklyPerformance] = useState<Array<{
    weekLabel: string;
    budgetUsed: number;
    budgetTotal: number;
    percentageUsed: number;
  }>>([]);

  const getUserWeightUnit = (profile: any): 'lbs' | 'kgs' => {
    if (profile.target_weight_lbs !== null && profile.target_weight_lbs !== undefined) {
      return 'lbs';
    }
    if (profile.target_weight_kgs !== null && profile.target_weight_kgs !== undefined) {
      return 'kgs';
    }
    return 'lbs';
  };

  const checkBaselineStatus = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

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

        setBaselineProgress({ daysLogged: dailySummaries?.length || 0, daysNeeded: 7 });
        return true;
      } else {
        setIsInBaseline(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking baseline status:', error);
      return false;
    }
  };

  const loadWeightData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const todayStr = getLocalDateString();
  
      const { data: profile } = await supabase
        .from('profiles')
        .select('target_weight_lbs, target_weight_kg, weekly_weight_goal, weight_lbs, weight_kg, created_at')
        .eq('id', user.id)
        .single();
  
      if (profile) {
        const unit = getUserWeightUnit(profile);
        setWeightUnit(unit);
  
        const goal = unit === 'lbs' ? profile.target_weight_lbs : profile.target_weight_kg;
        if (goal) setGoalWeight(goal);
  
        setWeeklyWeightGoal(profile.weekly_weight_goal || 1.0);
  
        
        const onboardingWeight = unit === 'lbs' ? profile.weight_lbs : profile.weight_kg;

        if (onboardingWeight) {
          setStartWeight(onboardingWeight);
          setWeightStartDate(new Date(profile.created_at));
        }
  
      
        const { data: recentWeight } = await supabase
          .from('weight_logs')
          .select('weight_lbs, weight_kgs, log_date')
          .eq('user_id', user.id)
          .lte('log_date', todayStr)
          .order('log_date', { ascending: false })
          .limit(1)
          .maybeSingle();
  
        setHasWeightLog(!!recentWeight);
  
        const current = recentWeight
          ? (unit === 'lbs' ? recentWeight.weight_lbs : recentWeight.weight_kgs)
          : onboardingWeight;
  
        if (current) setCurrentWeight(current);
      }
    } catch (error) {
      console.error('Error loading weight data:', error);
    }
  };

  const loadWeeklyPerformance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: periods, error: periodsError } = await supabase
        .from('weekly_periods')
        .select('id, week_start_date, week_end_date, weekly_budget')
        .eq('user_id', user.id)
        .order('week_start_date', { ascending: false })
        .limit(4);

      if (periodsError || !periods || periods.length === 0) return;

      const performanceData = await Promise.all(
        periods.map(async (period, index) => {
          const { data: summaries } = await supabase
            .from('daily_summaries')
            .select('calories_consumed')
            .eq('user_id', user.id)
            .gte('summary_date', period.week_start_date)
            .lte('summary_date', period.week_end_date);

          const totalConsumed = summaries?.reduce(
            (sum, day) => sum + (day.calories_consumed || 0), 0
          ) || 0;

          const percentageUsed = period.weekly_budget > 0
            ? Math.round((totalConsumed / period.weekly_budget) * 100)
            : 0;

          return {
            weekLabel: `Week ${periods.length - index}`,
            budgetUsed: totalConsumed,
            budgetTotal: period.weekly_budget || 0,
            percentageUsed,
          };
        })
      );

      setWeeklyPerformance(performanceData.reverse());
    } catch (error) {
      console.error('❌ Error loading weekly performance:', error);
    }
  };

  const loadProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ✅ Use returned value directly — avoids stale state bug
      const inBaseline = await checkBaselineStatus();

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_streak')
        .eq('id', user.id)
        .single();

      if (profile) setCurrentStreak(profile.current_streak || 0);

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfMonthStr = formatLocalDate(startOfMonth);
      const todayStr = getLocalDateString();

      const { data: treatDays } = await supabase
        .from('planned_cheat_days')
        .select('id')
        .eq('user_id', user.id)
        .gte('cheat_date', startOfMonthStr)
        .lte('cheat_date', todayStr);

      setTreatDaysCount(treatDays?.length || 0);

      // ✅ Use local variable, not stale state
      if (!inBaseline) {
        await loadWeightData();
        await loadWeeklyPerformance();
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProgressData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgressData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProgressData();
  };

  const handleLogWeight = () => {
    router.push('/logWeight');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.vividTeal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Your Progress</Text>
          <Text style={styles.subtitle}>Track your journey to better health</Text>
        </View>

        {isInBaseline && (
          <View style={styles.baselineBanner}>
            <View style={styles.bannerContent}>
              <Ionicons name="lock-closed" size={24} color={Colors.energyOrange} />
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Complete your baseline week first</Text>
                <Text style={styles.bannerSubtitle}>
                  Track {baselineProgress.daysNeeded - baselineProgress.daysLogged} more{' '}
                  {baselineProgress.daysNeeded - baselineProgress.daysLogged === 1 ? 'day' : 'days'} to unlock progress tracking
                </Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(baselineProgress.daysLogged / baselineProgress.daysNeeded) * 100}%` }
                ]}
              />
            </View>
          </View>
        )}

        {!isInBaseline ? (
          <>
            <StreakAndTreatsCard
              currentStreak={currentStreak}
              treatDaysUsed={treatDaysCount}
            />

            {currentWeight && startWeight && goalWeight ? (
              <CurrentWeightCard
                currentWeight={currentWeight}
                startWeight={startWeight}
                goalWeight={goalWeight}
                unit={weightUnit}
                startDate={weightStartDate || undefined}
                weeklyGoal={weeklyWeightGoal}
                onLogWeight={handleLogWeight}
                hasLoggedWeight={hasWeightLog}
              />
            ) : null}

            {weeklyPerformance.length > 0 ? (
              <WeeklyBudgetPerformanceCard weeks={weeklyPerformance} />
            ) : null}
          </>
        ) : (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="analytics" size={40} color={Colors.steelBlue} />
            </View>
            <Text style={styles.emptyStateText}>
              Focus on tracking your baseline week
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Once you complete your 7-day baseline, you'll unlock detailed progress tracking including weight trends and budget performance.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.steelBlue,
  },
  baselineBanner: {
    backgroundColor: Colors.orangeOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.energyOrange + '40',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  bannerText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  bannerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: Spacing.xs / 2,
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
  emptyStateCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxxl,
    alignItems: 'center',
    ...Shadows.small,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightCream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    textAlign: 'center',
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
  },
});