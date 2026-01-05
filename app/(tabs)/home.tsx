import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import CircularMetric from '@/components/circularMetric';
import WeeklyCalendar from '@/components/weeklyCalendar';
import StatCard from '@/components/statCard';
import { calculateMetrics } from '@/utils/metrics';
import { calculateWeeklyBudget } from '@/utils/weeklyBudget';
import { BaselineCompleteModal } from '@/components/baseLineCompleteModal';

interface ProfileData {
  full_name: string | null;
  current_streak: number;
  baseline_start_date: string | null;
  baseline_complete: boolean;
  weekly_calorie_bank: number;
}

interface FoodLog {
  id: string;
  food_name: string;
  calories: number | null;
  meal_type: string;
  log_date: string;
  created_at: string;
}

interface MetricsData {
  balance_score: number;
  consistency_score: number;
  drift_score: number;
  total_consumed: number;
  total_remaining: number;
  calories_reserved: number;
  weekly_budget: number;
}

export default function HomeScreen() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [recentLogs, setRecentLogs] = useState<FoodLog[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [daysLogged, setDaysLogged] = useState(0);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [cheatDates, setCheatDates] = useState<string[]>([]);
  const [showBaselineComplete, setShowBaselineComplete] = useState(false);
  const [baselineAverage, setBaselineAverage] = useState<number>(0);

  useEffect(() => {
    fetchProfile();
    fetchRecentLogs();
  }, []);

  useEffect(() => {
    if (profile && daysLogged >= 7) {
      checkBaselineCompletion();
    }
  }, [profile, daysLogged]);

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/(auth)/welcome');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      setProfile(data);
      
      // Calculate baseline progress
      if (data.baseline_start_date && !data.baseline_complete) {
        const { count } = await supabase
          .from('daily_summaries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('summary_date', data.baseline_start_date);

        setDaysLogged(count || 0);

        const startDate = new Date(data.baseline_start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setCurrentDay(Math.max(1, Math.min(diffDays, 7)));
      }

      // Load metrics if baseline complete
      if (data.baseline_complete) {
        try {
          const today = new Date();
          const monday = getMonday(today);
          const weekStartDate = monday.toISOString().split('T')[0];

          const { data: weeklyPeriod } = await supabase
            .from('weekly_periods')
            .select('*')
            .eq('user_id', user.id)
            .eq('week_start_date', weekStartDate)
            .single();

          if (!weeklyPeriod) {
            await calculateWeeklyBudget();
          }

          const metricsData = await calculateMetrics();
          setMetrics(metricsData);

          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);

          const { data: cheatDays } = await supabase
            .from('planned_cheat_days')
            .select('cheat_date')
            .eq('user_id', user.id)
            .gte('cheat_date', weekStartDate)
            .lte('cheat_date', sunday.toISOString().split('T')[0]);

          if (cheatDays) {
            setCheatDates(cheatDays.map(cd => cd.cheat_date));
          }
        } catch (metricsError) {
          console.error('Metrics error:', metricsError);
        }
      }

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('food_logs')
        .select('id, food_name, calories, meal_type, log_date, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recent logs:', error);
        return;
      }

      setRecentLogs(data || []);
    } catch (error) {
      console.error('Error in fetchRecentLogs:', error);
    }
  };

  const checkBaselineCompletion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      // Only check if we're currently in baseline mode
      if (!profile?.baseline_start_date || profile?.baseline_complete) {
        return;
      }
  
      // Check if user has logged 7 days
      if (daysLogged >= 7) {
        // Calculate baseline average
        const { data: summaries } = await supabase
          .from('daily_summaries')
          .select('calories_consumed')
          .eq('user_id', user.id)
          .gte('summary_date', profile.baseline_start_date)
          .gt('calories_consumed', 0);
  
        if (summaries && summaries.length >= 7) {
          const totalCalories = summaries.reduce((sum, day) => sum + day.calories_consumed, 0);
          const average = Math.round(totalCalories / summaries.length);
          
          setBaselineAverage(average);
          setShowBaselineComplete(true);
        }
      }
    } catch (error) {
      console.error('Error checking baseline completion:', error);
    }
  };

  const handleLogFood = () => {
    router.push('/log');
  };

  const handleCheckIn = () => {
    router.push('/dailyCheckin');
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchRecentLogs();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'sunny-outline';
      case 'lunch':
        return 'partly-sunny-outline';
      case 'dinner':
        return 'moon-outline';
      case 'snack':
        return 'fast-food-outline';
      default:
        return 'restaurant-outline';
    }
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getNextCheatDay = () => {
    const today = new Date();
    const upcoming = cheatDates.filter(date => new Date(date) > today);
    if (upcoming.length === 0) return null;
    
    const nextDate = new Date(upcoming[0]);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[nextDate.getDay()];
  };

  const displayedLogs = showAllLogs ? recentLogs : recentLogs.slice(0, 3);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3D5A5C" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBaselineActive = profile.baseline_start_date && !profile.baseline_complete;
  const firstName = profile.full_name ? profile.full_name.split(' ')[0] : 'there';
  const nextCheatDay = getNextCheatDay();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle} />
          <Text style={styles.logo}>HAVEN</Text>
        </View>
        <View style={styles.streakBadge}>
          <Ionicons name="flash" size={16} color="#E09B7B" />
          <Text style={styles.streakText}>{profile.current_streak}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {isBaselineActive ? (
            <>
              {/* Baseline Learning Phase */}
              <View style={styles.greetingSection}>
                <Text style={styles.greeting}>Building your baseline</Text>
                <Text style={styles.subGreeting}>
                  Just eat normally. We're learning your patterns.
                </Text>
              </View>

              {/* Day Counter */}
              <View style={styles.dayCard}>
                <View style={styles.dayCircle}>
                  <Text style={styles.dayNumber}>{daysLogged}</Text>
                  <Text style={styles.dayLabel}>of 7</Text>
                </View>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayTitle}>
                    {daysLogged === 7 ? 'Baseline Complete!' : `Day ${currentDay}`}
                  </Text>
                  <Text style={styles.dayDescription}>
                    {daysLogged === 7
                      ? 'Great work! Pull to refresh.'
                      : `${daysLogged} days logged, ${7 - daysLogged} to go`}
                  </Text>
                </View>
              </View>

              {/* Progress Dots */}
              <View style={styles.progressContainer}>
                <View style={styles.progressDots}>
                  {Array.from({ length: 7 }).map((_, index) => (
                    <View key={index} style={styles.dotWrapper}>
                      <View
                        style={[
                          styles.progressDot,
                          index < daysLogged && styles.progressDotActive
                        ]}
                      />
                      <Text style={styles.dotLabel}>{index + 1}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Main CTA */}
              <TouchableOpacity 
                style={styles.logFoodButton}
                onPress={handleLogFood}
                activeOpacity={0.8}
              >
                <Ionicons name="restaurant" size={28} color="#FFFFFF" />
                <Text style={styles.logFoodText}>Log Today's Food</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.checkInButton}
                onPress={handleCheckIn}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#3D5A5C" />
                <Text style={styles.checkInText}>Daily Check-in</Text>
              </TouchableOpacity>

              {/* Recently Logged Section */}
              {recentLogs.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.recentTitle}>Recently logged</Text>
                  {displayedLogs.map((log) => (
                    <View key={log.id} style={styles.logCard}>
                      <View style={styles.logHeader}>
                        <View style={styles.logHeaderLeft}>
                          <Ionicons 
                            name={getMealIcon(log.meal_type) as any} 
                            size={20} 
                            color="#3D5A5C" 
                          />
                          <Text style={styles.logFood}>{log.food_name}</Text>
                        </View>
                        <Text style={styles.logTime}>{formatTime(log.created_at)}</Text>
                      </View>
                      <View style={styles.logFooter}>
                        <Text style={styles.mealTypeLabel}>{capitalizeFirst(log.meal_type)}</Text>
                        {log.calories && (
                          <View style={styles.logCalories}>
                            <Text style={styles.caloriesNumber}>{log.calories}</Text>
                            <Text style={styles.caloriesLabel}>cal</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}

                  {/* Show More/Less Button */}
                  {recentLogs.length > 3 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => setShowAllLogs(!showAllLogs)}
                    >
                      <Text style={styles.showMoreText}>
                        {showAllLogs ? 'Show less' : `Show more (${recentLogs.length - 3})`}
                      </Text>
                      <Ionicons 
                        name={showAllLogs ? 'chevron-up' : 'chevron-down'} 
                        size={16} 
                        color="#3D5A5C" 
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Info Card */}
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={24} color="#3D5A5C" />
                <Text style={styles.infoText}>
                  No judgment. No restrictions. We're just learning how you normally eat so we can build a realistic plan.
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Post-Baseline: Weekly Tracking */}
              <View style={styles.greetingSection}>
                <Text style={styles.greeting}>Welcome, {firstName}</Text>
                <Text style={styles.subGreeting}>You're doing great today!</Text>
              </View>

              {/* Weekly Calendar */}
              <View style={styles.section}>
                <WeeklyCalendar currentDate={new Date()} cheatDates={cheatDates} />
              </View>

              {/* Metrics */}
              {metrics ? (
                <View style={styles.metricsContainer}>
                  <CircularMetric score={metrics.balance_score} label="Balance" />
                  <CircularMetric score={metrics.consistency_score} label="Consistency" />
                  <CircularMetric score={metrics.drift_score} label="Drift" />
                </View>
              ) : (
                <View style={styles.metricsContainer}>
                  <ActivityIndicator size="small" color="#3D5A5C" />
                </View>
              )}

              {/* Stats Rows */}
              <View style={styles.statsRow}>
                <StatCard value={metrics?.weekly_budget || 0} label="Total weekly calories" />
                <View style={{ width: 12 }} />
                <StatCard value={metrics?.total_consumed || 0} label="Used so far" />
              </View>

              <View style={styles.statsRow}>
                <StatCard value={metrics?.total_remaining || 0} label="Remaining" />
                <View style={{ width: 12 }} />
                <StatCard value={500} label="Burned calories" />
              </View>

              <View style={styles.statsRow}>
                <StatCard value={metrics?.calories_reserved || 0} label="Calories reserved" size="small" />
                <View style={{ width: 12 }} />
                <StatCard value={nextCheatDay || '-'} label="Upcoming cheat day" size="small" />
              </View>

              {/* Recently Logged Section */}
              {recentLogs.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.recentTitle}>Recently logged</Text>
                  {displayedLogs.map((log) => (
                    <View key={log.id} style={styles.logCard}>
                      <View style={styles.logHeader}>
                        <View style={styles.logHeaderLeft}>
                          <Ionicons 
                            name={getMealIcon(log.meal_type) as any} 
                            size={20} 
                            color="#3D5A5C" 
                          />
                          <Text style={styles.logFood}>{log.food_name}</Text>
                        </View>
                        <Text style={styles.logTime}>{formatTime(log.created_at)}</Text>
                      </View>
                      <View style={styles.logFooter}>
                        <Text style={styles.mealTypeLabel}>{capitalizeFirst(log.meal_type)}</Text>
                        {log.calories && (
                          <View style={styles.logCalories}>
                            <Text style={styles.caloriesNumber}>{log.calories}</Text>
                            <Text style={styles.caloriesLabel}>cal</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}

                  {recentLogs.length > 3 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => setShowAllLogs(!showAllLogs)}
                    >
                      <Text style={styles.showMoreText}>
                        {showAllLogs ? 'Show less' : `Show more (${recentLogs.length - 3})`}
                      </Text>
                      <Ionicons 
                        name={showAllLogs ? 'chevron-up' : 'chevron-down'} 
                        size={16} 
                        color="#3D5A5C" 
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
       {/* Baseline Complete Modal */}
       <BaselineCompleteModal
        visible={showBaselineComplete}
        baselineAverage={baselineAverage}
        onComplete={() => {
          setShowBaselineComplete(false);
          onRefresh(); // Reload everything to show active week
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#3D5A5C',
    backgroundColor: 'transparent',
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginLeft: 4,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  greetingSection: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E09B7B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dayLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  dayDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dotWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#E09B7B',
  },
  dotLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  logFoodButton: {
    backgroundColor: '#3D5A5C',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logFoodText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkInButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#3D5A5C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkInText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  recentSection: {
    marginBottom: 24,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 16,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  logFood: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    flex: 1,
  },
  logTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTypeLabel: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F5F1E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logCalories: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  caloriesNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  caloriesLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5A5C',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  section: {
    marginBottom: 20,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
});