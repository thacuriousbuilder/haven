import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import WeeklyCalendar from '@/components/weeklyCalendar';
import { BaselineCompleteModal } from '@/components/baseLineCompleteModal';
import { 
  getLocalDateString, 
  getCurrentWeekDates,
  formatLocalDate,
  getSunday,
  getDaysDifference
} from '@/utils/timezone';
import { BaselineProgressCard } from '@/components/homebaseline/cards/baselineProgressCard';
import { SummaryStatsCard } from '@/components/homebaseline/cards/summaryStatsCard';
import { QuickLogCard } from '@/components/homebaseline/cards/quickLogCard';
import { TodayMealsCard } from '@/components/homebaseline/cards/todayMealsCard';
import { WeeklyBudgetCard } from '@/components/homeactive/cards/weeklyBudget';
import { NextCheatDayCard } from '@/components/homeactive/cards/nextCheatDayCard';
import { TodayCaloriesCard } from '@/components/homebaseline/cards/todayCaloriesCard';
import { ClientCardFollowUp } from '@/components/coach/clientCardFollowUp';
import { ClientCardOnTrack } from '@/components/coach/clientCardOnTrack';
import { ClientCardBaseline } from '@/components/coach/clientCardBaseline';
import { BaselineChoiceModal } from '@/components/baseLineChoiceModal';
import { BaselineRestartModal } from '@/components/baseLineRestartModal';
import * as ImagePicker from 'expo-image-picker';
import { completeBaseline, completeBaselineWithEstimatedData } from '@/lib/baselineCompletion';
import { useOverageCalculation } from '@/hooks/useOverageCalculation';

// Type imports
import type { MealLogItem, MacroData } from '@/types/home';
import { Colors } from '@/constants/colors';
import { CoachDashboardHeader } from '@/components/coach/coachDashboardHeader';
import { ClientOverview } from '@/components/coach/clientOverview';
import { analyzeWeekPeriod, WeekInfo } from '@/utils/weekHelpers';

interface ProfileData {
  full_name: string | null;
  current_streak: number;
  baseline_start_date: string | null;
  baseline_complete: boolean;
  baseline_extended: boolean;
  weekly_calorie_bank: number;
  user_type: 'client' | 'trainer';
  activity_level: string | null;
  baseline_avg_daily_calories: number | null;
  weekly_budget: number | null;
  weekly_period_id: string | null;
  days_used: number | null;
  is_manual: boolean | null;
  baseline_total_exercise: number | null;
  actual_activity_level: string | null;
  tdee: number | null;
  daily_target: number | null;
  baseline_completion_at: string | null;
  updated_at: string | null;
}

interface FoodLog {
  id: string;
  food_name: string;
  calories: number | null;
  meal_type: string;
  log_date: string;
  created_at: string;
  protein_grams?: number | null;
  carbs_grams?: number | null;
  fat_grams?: number | null;
}

interface MetricsData {
  weekly_budget: number;
  total_consumed: number;
  total_remaining: number;
  calories_reserved: number;
  projected_end: number;
  on_track: boolean;
}

// interface ClientStatus {
//   id: string;
//   full_name: string | null;
//   last_log_time: string | null;
//   meals_today: number;
//   current_streak: number;
//   balance_score: number | null;
//   status: 'needs_attention' | 'on_track' | 'baseline';
//   baseline_day: number | null;
//   // Add these new fields from RPC
//   days_inactive?: number;
//   baseline_days_completed?: number;
//   baseline_days_remaining?: number;
//   baseline_avg_daily_calories?: number;
// }

interface DashboardStats {
  unreadMessagesCount: number;
  clientsNeedingAttention: number;
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
  const [todayBurned, setTodayBurned] = useState<number>(0);
  const [baselineAverage, setBaselineAverage] = useState<number>(0);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    unreadMessagesCount: 0,
    clientsNeedingAttention: 0,
  });
  const [baselineModalType, setBaselineModalType] = useState<string | null>(null);
  const [baselineCompletionMessage, setBaselineCompletionMessage] = useState<string>();
  const [baselineDaysLogged, setBaselineDaysLogged] = useState(0);
  const [completedBaselineDays, setCompletedBaselineDays] = useState<boolean[]>([
    false, false, false, false, false, false, false
  ]);
  const [baselineStats, setBaselineStats] = useState({
    totalCalories: 0,
    avgCalories: 0,
    macros: { protein: 0, carbs: 0, fat: 0 },
    totalBurned:0,
  });
  const [showCheckInReminder, setShowCheckInReminder] = useState(false);
  const [showDay7Banner, setShowDay7Banner] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  
  
  // Trainer-specific state
  const [clients, setClients] = useState<ClientStatus[]>([]);
  const [clientStats, setClientStats] = useState({
    total: 0,
    needsAttention: 0,
    onTrack: 0,
    baseline: 0,
  });

  const {
    baseBudget,
    adjustment,
    adjustedBudget,
    isCheatDay,
    cheatDayCalories,
    cumulativeOverage,
    isLoading: overageLoading,
  } = useOverageCalculation();

  useEffect(() => {
    fetchProfile();
  }, []);
 
  useEffect(() => {
    if (profile) {
      if (profile.user_type === 'trainer') {
        fetchTrainerDashboard();
      } else {
        fetchRecentLogs();
        checkBaselineStatus();
        fetchCompletedBaselineDays()
        fetchBaselineStats()
      }
    }
  }, [profile]);

  useFocusEffect(
    React.useCallback(() => {
      if (profile && profile.user_type !== 'trainer') {
        // Refresh data whenever screen comes into focus
        fetchRecentLogs();
        checkBaselineStatus();
      }
    }, [profile])
  );
  useFocusEffect(
    useCallback(() => {
      checkDailyCheckIn();
    }, [])
  );
  

  // ============= HELPER FUNCTIONS =============

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Transform FoodLog to MealLogItem format
  const transformMealsData = (logs: FoodLog[]): MealLogItem[] => {
    return logs.map(log => ({
      id: log.id,
      name: log.food_name,
      time: formatTime(log.created_at),
      calories: log.calories || 0,
      mealType: log.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      loggedAt: log.created_at,
      macros: log.protein_grams || log.carbs_grams || log.fat_grams ? {
        protein: log.protein_grams || 0,
        carbs: log.carbs_grams || 0,
        fat: log.fat_grams || 0,
      } : undefined,
    }));
  };

  const calculateMetricsClientSide = async (
    userId: string,
    weekStartDate: string,
    profile: any
  ): Promise<MetricsData> => {
    try {
      console.log('📊 Calculating metrics client-side for week:', weekStartDate);
      
      
      const startDate = new Date(weekStartDate + 'T00:00:00');
      const endDate = getSunday(startDate);
      const sundayStr = formatLocalDate(endDate);
      const todayStr = getLocalDateString();
  
      // Get daily summaries for this week (up to today)
      const { data: summaries, error: summariesError } = await supabase
        .from('daily_summaries')
        .select('calories_consumed, summary_date')
        .eq('user_id', userId)
        .gte('summary_date', weekStartDate)
        .lte('summary_date', todayStr);
  
      if (summariesError) {
        console.error('Error loading summaries:', summariesError);
        throw summariesError;
      }
  
      // Calculate total consumed
      const total_consumed = summaries?.reduce((sum, day) => 
        sum + (day.calories_consumed || 0), 0
      ) || 0;
  
      console.log('  - Total consumed:', total_consumed);
  
      // Get upcoming cheat days (after today)
      const { data: cheatDays, error: cheatError } = await supabase
        .from('planned_cheat_days')
        .select('planned_calories, cheat_date')
        .eq('user_id', userId)
        .gte('cheat_date', weekStartDate)
        .lte('cheat_date', sundayStr)
        .gte('cheat_date', todayStr);
  
      if (cheatError) {
        console.error('Error loading cheat days:', cheatError);
      }
  
      const calories_reserved = cheatDays?.reduce((sum, cd) => 
        sum + (cd.planned_calories || 0), 0
      ) || 0;
  
      console.log('  - Calories reserved:', calories_reserved);
  
      const weekly_budget = profile.weekly_budget || 0;
      const total_remaining = weekly_budget - total_consumed;
  
      console.log('  - Weekly budget:', weekly_budget);
      console.log('  - Remaining:', total_remaining);
  
      // Simple projection (can enhance later with trend analysis)
      const projected_end = total_consumed;
      
      // On track if within 10% of budget
      const on_track = total_consumed <= weekly_budget * 1.1;
  
      return {
        weekly_budget,
        total_consumed,
        total_remaining,
        calories_reserved,
        projected_end,
        on_track,
      };
      
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return {
        weekly_budget: profile.weekly_budget || 0,
        total_consumed: 0,
        total_remaining: profile.weekly_budget || 0,
        calories_reserved: 0,
        projected_end: 0,
        on_track: true,
      };
    }
  };

  // Calculate total macros from food logs
  const calculateTotalMacros = (logs: FoodLog[]): MacroData => {
    return logs.reduce(
      (acc, log) => ({
        protein: acc.protein + (log.protein_grams || 0),
        carbs: acc.carbs + (log.carbs_grams || 0),
        fat: acc.fat + (log.fat_grams || 0),
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );
  };

  // Calculate today's total calories
  const calculateTodayCalories = (): number => {
    const today = getLocalDateString();
    const todayLogs = recentLogs.filter(log => log.log_date === today);
    return todayLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  };

  // Add this function for today's macros:
  const calculateTodayMacros = (): MacroData => {
    const today = getLocalDateString();
    const todayLogs = recentLogs.filter(log => log.log_date === today);
    return calculateTotalMacros(todayLogs);
  };



  const fetchCompletedBaselineDays = async () => {
    if (!profile?.baseline_start_date) {
      setCompletedBaselineDays([false, false, false, false, false, false, false]);
      return;
    }
  
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
  
    const startDate = new Date(profile.baseline_start_date + 'T00:00:00');
    const completed = [false, false, false, false, false, false, false];
  
    // Get all daily summaries for this baseline period
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    

    const endDateStr = formatLocalDate(endDate);
  
    const { data: summaries } = await supabase
      .from('daily_summaries')
      .select('summary_date, calories_consumed')
      .eq('user_id', user.id)
      .gte('summary_date', profile.baseline_start_date)
      .lte('summary_date', endDateStr);
  
    if (summaries) {
      summaries.forEach(summary => {
        if (summary.calories_consumed > 0) {
          const summaryDate = new Date(summary.summary_date + 'T00:00:00');
          const dayIndex = Math.floor((summaryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          if (dayIndex >= 0 && dayIndex < 7) {
            completed[dayIndex] = true;
          }
        }
      });
    }
  
    setCompletedBaselineDays(completed);
  };

  // ===== NEW ACTIVE USER HELPERS =====

  // Get logged dates for calendar dots
  const getLoggedDates = (): string[] => {
    const uniqueDates = [...new Set(recentLogs.map(log => log.log_date))];
    return uniqueDates;
  };

  // Calculate days into current week (for avg calculation)
  const getDaysIntoWeek = (): number => {
    // If no period loaded yet, fall back to Monday calculation
    if (!currentPeriod) {
      const today = new Date();
      const monday = getMonday(today);
      const diffTime = today.getTime() - monday.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diffDays);
    }
  
    // Use actual period dates to calculate days
    const weekInfo = analyzeWeekPeriod(
      currentPeriod.week_start_date,
      currentPeriod.week_end_date,
      currentPeriod.created_at
    );
  
    // Calculate which day of tracking we're on
    const todayStr = getLocalDateString();
    const userStartStr = formatLocalDate(weekInfo.userStartDate);
    
    const diffDays = getDaysDifference(userStartStr, todayStr) + 1;
    
    // Return day number, clamped to valid range
    return Math.max(1, Math.min(diffDays, weekInfo.daysTracked));
  };

  const getWeekInfo = (): WeekInfo | null => {
    if (!currentPeriod) return null;
    
    return analyzeWeekPeriod(
      currentPeriod.week_start_date,
      currentPeriod.week_end_date,
      currentPeriod.created_at
    );
  };

  // Get next cheat day info (detailed version for card)
  const getNextCheatDayInfo = () => {
    if (cheatDates.length === 0) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingCheatDays = cheatDates
      .map(dateStr => new Date(dateStr + 'T00:00:00'))
      .filter(date => date >= today)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (upcomingCheatDays.length === 0) return null;
    
    const nextDate = upcomingCheatDays[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return {
      dayName: dayNames[nextDate.getDay()],
      dateString: `${months[nextDate.getMonth()]} ${nextDate.getDate()}`,
      date: nextDate,
    };
  };

  const getSubGreeting = (): string => {
    const weekInfo = getWeekInfo();
    
    if (!weekInfo) {
      return "You're doing great this week!";
    }
    
    if (weekInfo.isPartialWeek) {
      return "Welcome to your first week!";
    }
    
    // Optional: Encourage users based on progress
    if (metrics) {
      const percentUsed = (metrics.total_consumed / metrics.weekly_budget) * 100;
      
      if (percentUsed < 70) {
        return "You're doing great this week!";
      } else if (percentUsed < 90) {
        return "Staying on track nicely!";
      } else if (percentUsed <= 100) {
        return "Almost there for the week!";
      } else {
        return "You went over, but that's okay!";
      }
    }
    
    return "You're doing great this week!";
  };

  const checkBaselineStatus = async () => {
    try {  
      // Only run for clients with active baseline
      if (!profile?.baseline_start_date || profile.baseline_complete || profile.user_type === 'trainer') {
        return;
      }
  
      const startDate = new Date(profile.baseline_start_date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate end date based on whether baseline was extended
      const endDate = new Date(startDate);
      if (profile.baseline_extended) {
        endDate.setDate(startDate.getDate() + 9); // 10 days total (0-indexed = 9)
        console.log('📅 Baseline was extended, checking 10-day period');
      } else {
        endDate.setDate(startDate.getDate() + 6); // 7 days (0-indexed = 6)
      }
      
    
      console.log('📅 Baseline dates:', {
        start: formatLocalDate(startDate),
        end: formatLocalDate(endDate),
        today: getLocalDateString(),
        extended: profile.baseline_extended || false,
      });

      const isDay7 = today.getTime() === endDate.getTime();
      
      // Check if the period has ended
      const baselinePeriodEnded = today > endDate;
      
      if (baselinePeriodEnded) {
        setShowDay7Banner(false)
        await handleBaselineEnded();
      } else if (isDay7) {
        setShowDay7Banner(true)
        console.log('✅ Baseline still active');
      }
    } catch (error) {
      console.error('❌ Error checking baseline status:', error);
    }
  };

const handleBaselineEnded = async () => {
  try {
    console.log('🔍 Handling baseline end...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profile?.baseline_start_date) return;

    // Count actual logged days with calories > 0
    const { data: summaries, error } = await supabase
      .from('daily_summaries')
      .select('calories_consumed, summary_date')
      .eq('user_id', user.id)
      .gte('summary_date', profile.baseline_start_date)
      .gt('calories_consumed', 0);

    if (error) {
      console.error('❌ Error fetching baseline summaries:', error);
      return;
    }

    const daysLogged = summaries?.length || 0;
    setBaselineDaysLogged(daysLogged);

    console.log(`📊 Baseline ended. Days logged: ${daysLogged}/7`);

    // Route to appropriate outcome based on days logged
    if (daysLogged >= 5) {
      console.log('✅ Auto-completing baseline (5+ days logged)');
      await completeBaselineAuto(summaries!, daysLogged);
    } else if (daysLogged >= 3) {
      console.log('⚠️ Showing choice modal (3-4 days logged)');
      setBaselineModalType('choice');
    } else {
      console.log('❌ Showing restart modal (0-2 days logged)');
      setBaselineModalType('restart');
    }
  } catch (error) {
    console.error('❌ Error in handleBaselineEnded:', error);
  }
};

const completeBaselineNow = async () => {
  try {
    console.log('🎯 Completing baseline...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profile?.baseline_start_date) return;
    
    // Calculate end date
    const startDate = new Date(profile.baseline_start_date + 'T00:00:00');
    const endDate = new Date(startDate);
    if (profile.baseline_extended) {
      endDate.setDate(startDate.getDate() + 9); // 10 days
    } else {
      endDate.setDate(startDate.getDate() + 6); // 7 days
    }
    
    const endDateStr = formatLocalDate(endDate);
    
    // Call completion helper
    const result = await completeBaseline(
      user.id,
      profile.baseline_start_date,
      endDateStr
    );
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to complete baseline');
      return;
    }
    
    console.log('✅ Baseline completed:', result.data);
    
    // Set data for completion modal
    setBaselineAverage(result?.data?.dailyTarget || 0);
    
    // Show completion modal
    setBaselineModalType('complete');
    
    // Refresh profile to show updated data
    await fetchProfile();
    
  } catch (error) {
    console.error('❌ Error in completeBaselineNow:', error);
    Alert.alert('Error', 'Something went wrong. Please try again.');
  }
};

const completeBaselineAuto = async (
  summaries: { calories_consumed: number; summary_date: string }[],
  daysLogged: number
) => {
  
  await completeBaselineNow();
};


const completeBaselineWithPartialData = async () => {

  await completeBaselineNow();
};

const useEstimatedData = async () => {
  try {
    console.log('🔮 Using estimated data for baseline...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const result = await completeBaselineWithEstimatedData(user.id);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to complete baseline');
      return;
    }

    console.log('✅ Baseline completed with estimated data:', result.data);

    // Set data for completion modal
    setBaselineAverage(result?.data?.dailyTarget || 0);

    // Show completion modal
    setBaselineModalType('complete');

    // Refresh profile
    await fetchProfile();

  } catch (error) {
    console.error('❌ Error in useEstimatedData:', error);
    Alert.alert('Error', 'Something went wrong. Please try again.');
  }
};




const extendBaseline = async () => {
  try {
    console.log('⏰ Extending baseline by 3 days...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profile?.baseline_start_date) return;

    // Check if already extended
    if (profile.baseline_extended) {
      Alert.alert(
        'Already Extended',
        'You already extended your baseline once. Please complete with current data or restart.',
        [{ text: 'OK', onPress: () => setBaselineModalType(null) }]
      );
      return;
    }

  
    const todayStr = getLocalDateString();

    // Mark as extended in database
    const { error } = await supabase
      .from('profiles')
      .update({ 
        baseline_extended: true,
        baseline_extension_date: todayStr,
      })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Error extending baseline:', error);
      Alert.alert('Error', 'Failed to extend baseline. Please try again.');
      return;
    }

    console.log('✅ Baseline extended');

    Alert.alert(
      'Baseline Extended',
      `You have 3 more days to reach 7 total logged days. Keep logging daily!`,
      [{ 
        text: 'Got it', 
        onPress: () => {
          setBaselineModalType(null);
          fetchProfile();
        }
      }]
    );
  } catch (error) {
    console.error('❌ Error extending baseline:', error);
    Alert.alert('Error', 'Failed to extend baseline. Please try again.');
  }
};


const restartBaseline = async () => {
  try {
    console.log('🔄 Restarting baseline...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const todayStr = getLocalDateString();

    console.log(`📅 Restarting baseline from: ${todayStr}`);

    // Reset baseline start date to today
    const { error } = await supabase
      .from('profiles')
      .update({ 
        baseline_start_date: todayStr,
        baseline_complete: false,
      })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Error restarting baseline:', error);
      Alert.alert('Error', 'Failed to restart baseline. Please try again.');
      return;
    }

    console.log('✅ Baseline restarted');

    Alert.alert(
      'Baseline Restarted',
      'Your 7-day baseline starts today. Log your meals daily for the best results!',
      [{ 
        text: 'Start Logging', 
        onPress: () => {
          setBaselineModalType(null);
          fetchProfile();
        }
      }]
    );
  } catch (error) {
    console.error('❌ Error in restartBaseline:', error);
    Alert.alert('Error', 'Something went wrong. Please try again.');
  }
};

const checkDailyCheckIn = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Check if user is in baseline phase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('baseline_start_date, baseline_completion_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error loading profile:', profileError);
      return;
    }

    // Only show check-in for baseline users
    if (!profile.baseline_start_date || profile.baseline_completion_at) {
      setShowCheckInReminder(false);
      return;
    }

    // 2. Check if it's Day 1 of baseline
    const todayDate = getLocalDateString();
    
    if (profile.baseline_start_date === todayDate) {
      setShowCheckInReminder(false);
      return;
    }

    // 3. Check if user has checked in today
    const { data: checkIn, error: checkInError } = await supabase
      .from('check_ins')
      .select('id')
      .eq('user_id', user.id)
      .eq('check_in_date', todayDate)
      .maybeSingle();

    if (checkInError) {
      console.error('Error checking check-in status:', checkInError);
      return;
    }

    // Show reminder if not checked in
    setShowCheckInReminder(!checkIn);

  } catch (error) {
    console.error('Error in checkDailyCheckIn:', error);
  }
};

const fetchBurnedCalories = async (userId: string, startDate: string, endDate: string) => {
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('workout_calories_burned')
      .eq('user_id', userId)
      .gte('check_in_date', startDate)
      .lte('check_in_date', endDate);

    if (error) {
      console.error('Error fetching burned calories:', error);
      return 0;
    }

    // Sum all burned calories
    const totalBurned = data.reduce((sum, checkIn) => {
      return sum + (checkIn.workout_calories_burned || 0);
    }, 0);

    console.log('🔥 Total burned calories:', totalBurned);
    return totalBurned;
  } catch (error) {
    console.error('Error in fetchBurnedCalories:', error);
    return 0;
  }
};


const fetchBaselineStats = async () => {
  if (!profile?.baseline_start_date) {
    setBaselineStats({
      totalCalories: 0,
      avgCalories: 0,
      macros: { protein: 0, carbs: 0, fat: 0 },
      totalBurned: 0,  // ← NEW
    });
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Calculate end date (Day 7)
  const startDate = new Date(profile.baseline_start_date + 'T00:00:00');
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const year = endDate.getFullYear();
  const month = String(endDate.getMonth() + 1).padStart(2, '0');
  const day = String(endDate.getDate()).padStart(2, '0');
  const endDateStr = `${year}-${month}-${day}`;

  // Get all food logs for baseline period (includes macros!)
  const { data: foodLogs, error } = await supabase
    .from('food_logs')
    .select('calories, protein_grams, carbs_grams, fat_grams, log_date')
    .eq('user_id', user.id)
    .gte('log_date', profile.baseline_start_date)
    .lte('log_date', endDateStr);

  if (error) {
    console.error('Error fetching baseline stats:', error);
    return;
  }

  if (!foodLogs || foodLogs.length === 0) {
    setBaselineStats({
      totalCalories: 0,
      avgCalories: 0,
      macros: { protein: 0, carbs: 0, fat: 0 },
      totalBurned: 0,  // ← NEW
    });
    return;
  }

  // Calculate totals from food_logs
  const totalCalories = foodLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const totalProtein = foodLogs.reduce((sum, log) => sum + (log.protein_grams || 0), 0);
  const totalCarbs = foodLogs.reduce((sum, log) => sum + (log.carbs_grams || 0), 0);
  const totalFat = foodLogs.reduce((sum, log) => sum + (log.fat_grams || 0), 0);

  // Count unique days for average calculation
  const uniqueDays = new Set(foodLogs.map(log => log.log_date)).size;
  const avgCalories = uniqueDays > 0 ? Math.round(totalCalories / uniqueDays) : 0;

  // NEW: Fetch burned calories
  const totalBurned = await fetchBurnedCalories(
    user.id,
    profile.baseline_start_date,
    endDateStr
  );

  setBaselineStats({
    totalCalories,
    avgCalories,
    macros: {
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    },
    totalBurned, 
  });
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
        
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating...');
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating profile:', createError);
            setLoading(false);
            return;
          }
          
          setProfile(newProfile);
          setLoading(false);
          return;
        }
        
        setLoading(false);
        return;
      }

      setProfile(data);
      
      // Only calculate baseline progress for clients
      if (data.user_type !== 'trainer' && data.baseline_start_date && !data.baseline_complete) {
        const { count } = await supabase
          .from('daily_summaries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('summary_date', data.baseline_start_date);
      
        setDaysLogged(count || 0);
      
        // Calculate days using local dates
        const startDate = new Date(data.baseline_start_date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setCurrentDay(Math.max(1, Math.min(diffDays, 7)));
      }

  
   // Load metrics if client and baseline complete
if (data.user_type !== 'trainer' && data.baseline_complete) {
  try {
   
    const { weekStart: weekStartDate } = getCurrentWeekDates();

    const { data: weeklyPeriod } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartDate)
      .single();
    
    setCurrentPeriod(weeklyPeriod);
    // Calculate metrics client-side
    const metricsData = await calculateMetricsClientSide(user.id, weekStartDate, data);
    setMetrics(metricsData);

    // Get cheat days
    const { weekEnd: sundayDateStr } = getCurrentWeekDates();
    
    const { data: cheatDays } = await supabase
      .from('planned_cheat_days')
      .select('cheat_date')
      .eq('user_id', user.id)
      .gte('cheat_date', weekStartDate)
      .lte('cheat_date', sundayDateStr);

    if (cheatDays) {
      setCheatDates(cheatDays.map(cd => cd.cheat_date));
    }
  } catch (metricsError) {
    console.error('Metrics error:', metricsError);
    setMetrics({
      weekly_budget: data.weekly_budget || 0,
      total_consumed: 0,
      total_remaining: data.weekly_budget || 0,
      calories_reserved: 0,
      projected_end: 0,
      on_track: true,
    });
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

  interface ClientStatus {
    id: string;
    full_name: string | null;
    last_log_time: string | null;
    meals_today: number;
    current_streak: number;
    balance_score: number | null;
    status: 'needs_attention' | 'on_track' | 'baseline';
    baseline_day: number | null;
    // Add these new fields from RPC
    days_inactive?: number;
    baseline_days_completed?: number;
    baseline_days_remaining?: number;
    baseline_avg_daily_calories?: number;
  }
  
  // Update fetchTrainerDashboard to include all the RPC data
  const fetchTrainerDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayDateStr = `${year}-${month}-${day}`;
      // Use the new RPC function
      const { data: clientsData, error: clientsError } = await supabase
        .rpc('get_coach_clients_with_status', { coach_id: user.id, today_date: todayDateStr });
  
      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return;
      }
  
      // Get unread messages count
      const { count: unreadCount, error: messagesError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);
  
      if (messagesError) {
        console.error('Error fetching unread messages:', messagesError);
      }
  
      if (!clientsData || clientsData.length === 0) {
        setClients([]);
        setClientStats({ total: 0, needsAttention: 0, onTrack: 0, baseline: 0 });
        setDashboardStats({
          unreadMessagesCount: unreadCount || 0,
          clientsNeedingAttention: 0,
        });
        return;
      }
  
      const clientStatuses: ClientStatus[] = clientsData.map((client: any) => {    
        return{
          id: client.id,
          full_name: client.full_name,
          last_log_time: null,
          meals_today: client.meals_logged_today || 0,
          current_streak: client.current_streak || 0,
          balance_score: null,
          status: client.status === 'need_followup' ? 'needs_attention' 
                 : client.status === 'in_baseline' ? 'baseline' 
                 : 'on_track',
          baseline_day: client.baseline_days_completed || null,
          days_inactive: client.days_inactive || 0,
          baseline_days_completed: client.baseline_days_completed || 0,
          baseline_days_remaining: client.baseline_days_remaining || 0,
          baseline_avg_daily_calories: client.baseline_avg_daily_calories || null,
        }
      } 
    );
    
  
      setClients(clientStatuses);
  
      const stats = {
        total: clientStatuses.length,
        needsAttention: clientStatuses.filter(c => c.status === 'needs_attention').length,
        onTrack: clientStatuses.filter(c => c.status === 'on_track').length,
        baseline: clientStatuses.filter(c => c.status === 'baseline').length,
      };
      setClientStats(stats);
  
      setDashboardStats({
        unreadMessagesCount: unreadCount || 0,
        clientsNeedingAttention: stats.needsAttention,
      });
  
    } catch (error) {
      console.error('Error in fetchTrainerDashboard:', error);
    }
  };
  
  // Helper function to calculate weekly progress
  const calculateWeeklyProgress = (): number => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const monday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0
    const daysIntoWeek = monday + 1;
    return Math.round((daysIntoWeek / 7) * 100);
  };

  const fetchRecentLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('food_logs')
        .select('id, food_name, calories, meal_type, log_date, created_at, protein_grams, carbs_grams, fat_grams')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching recent logs:', error);
        return;
      }

      setRecentLogs(data || []);
    } catch (error) {
      console.error('Error in fetchRecentLogs:', error);
    }
  };


  // ============= EVENT HANDLERS =============

  const handleLogFood = () => {
    router.push('/log');
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan food.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      router.push({
        pathname: '/log',
        params: { method: 'camera', imageBase64: result.assets[0].base64 }
      });
    }
  };

  const handleSearch = () => {
    router.push({
      pathname: '/log',
      params: { method: 'search' }
    });
  };

  const handlePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      router.push({
        pathname: '/log',
        params: { method: 'photo', imageBase64: result.assets[0].base64 }
      });
    }
  };

  const handleRecipe = () => {
    router.push({
      pathname: '/log',
      params: { method: 'manual' }
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    if (profile?.user_type === 'trainer') {
      fetchTrainerDashboard();
    } else {
      fetchRecentLogs();
    }
  };

  const handleMealPress = (meal: MealLogItem) => {
    router.push(`/food/${meal.id}`);
  };
  

  // ============= FORMATTING FUNCTIONS =============

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // ============= LOADING & ERROR STATES =============

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.vividTeal} />
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

  // ============= TRAINER VIEW =============
  
  if (profile.user_type === 'trainer') {
    const needsAttentionClients = clients.filter(c => c.status === 'needs_attention');
    const baselineClients = clients.filter(c => c.status === 'baseline');
    const onTrackClients = clients.filter(c => c.status === 'on_track');

    return (
      <SafeAreaView style={styles.container} edges={['top','bottom']}>
        {/* <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle} />
            <Text style={styles.logo}>HAVEN</Text>
          </View>
        </View> */}
       <CoachDashboardHeader
          coachName={profile.full_name || 'Coach'}
          unreadMessagesCount={dashboardStats.unreadMessagesCount}
          clientsNeedingAttention={dashboardStats.clientsNeedingAttention}
          onNotificationPress={() => {
            router.push('/(tabs)/messages');
          }}
        />

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          bounces={true}
          overScrollMode="always"
          >
          {clientStats.total > 0 && (
                <ClientOverview
                  totalClients={clientStats.total}
                  onTrackCount={clientStats.onTrack}
                  followUpCount={clientStats.needsAttention}
                  baselineCount={clientStats.baseline}
                />
              )}
          <View style={styles.content}>
           
            {clientStats.total > 0 && (
              <>
                    {/* NEEDS ATTENTION SECTION */}
                    {needsAttentionClients.length > 0 && (
                      <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                          <Ionicons name="alert-circle" size={24} color="#EF4444" />
                          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>
                            Need Follow-up ({needsAttentionClients.length})
                          </Text>
                        </View>

                        {needsAttentionClients.map((client) => (
                          <ClientCardFollowUp
                            key={client.id}
                            clientId={client.id}
                            fullName={client.full_name || 'Client'}
                            avatarUrl={null}
                            lastActiveDaysAgo={client.days_inactive || 0}
                            avgDailyCalories={client.baseline_avg_daily_calories}
                            currentStreak={client.current_streak}
                            onViewPress={() => router.push(`/clientDetail/${client.id}`)}
                            onMessagePress={() => router.push(`/messageThread/${client.id}`)}
                          />
                        ))}
                      </View>
                    )}


                  {/* BASELINE SECTION */}
                    {baselineClients.length > 0 && (
                      <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                          <Ionicons name="time" size={24} color="#F59E0B" />
                          <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>
                            Baseline ({baselineClients.length})
                          </Text>
                        </View>

                        {baselineClients.map((client) => (
                          <ClientCardBaseline
                            key={client.id}
                            clientId={client.id}
                            fullName={client.full_name || 'Client'}
                            avatarUrl={null}
                            mealsLoggedToday={client.meals_today}
                            baselineDaysCompleted={client.baseline_days_completed || 0}
                            daysRemaining={client.baseline_days_remaining || 7}
                            avgDailyCalories={client.baseline_avg_daily_calories}
                            onViewProgressPress={() => router.push(`/clientDetail/${client.id}`)}
                          />
                        ))}
                      </View>
                    )}

                    {/* ON TRACK SECTION */}
                      {onTrackClients.length > 0 && (
                        <View style={styles.section}>
                          <View style={styles.sectionHeader}>
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            <Text style={[styles.sectionTitle, { color: '#10B981' }]}>
                              On Track ({onTrackClients.length})
                            </Text>
                          </View>

                          {onTrackClients.slice(0, 3).map((client) => (
                            <ClientCardOnTrack
                              key={client.id}
                              clientId={client.id}
                              fullName={client.full_name || 'Client'}
                              avatarUrl={null}
                              mealsLoggedToday={client.meals_today}
                              weeklyProgress={calculateWeeklyProgress()}
                              avgDailyCalories={client.baseline_avg_daily_calories}
                              currentStreak={client.current_streak}
                              onViewProgressPress={() => router.push(`/clientDetail/${client.id}`)}
                            />
                          ))}

                    {onTrackClients.length > 3 && (
                      <TouchableOpacity 
                        style={styles.showMoreButton}
                        onPress={() => {/* TODO: Go to clients tab */}}
                      >
                        <Text style={styles.showMoreText}>
                          Show all {onTrackClients.length} →
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}

            {clientStats.total === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="people" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No clients yet</Text>
                <Text style={styles.emptyDescription}>
                  Share your invite code from the Quick Actions tab to start coaching clients
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => router.push('/(tabs)/quickAction')}
                >
                  <Text style={styles.emptyButtonText}>Get Invite Code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============= CLIENT VIEW =============
  
  const isBaselineActive = profile.baseline_start_date && !profile.baseline_complete;
  const firstName = profile.full_name ? profile.full_name.split(' ')[0] : 'there';



  const todayCalories = calculateTodayCalories();
  const todayMacros = calculateTodayMacros();
  const todayGoal = profile?.baseline_complete 
  ? (isCheatDay 
      ? (cheatDayCalories || 2000)
      : (adjustedBudget || Math.round((metrics?.weekly_budget || 14000) / 7))) 
  : Math.round((metrics?.weekly_budget || 14000) / 7);
  const todayRemaining = todayGoal - todayCalories;

  const todayLogs = recentLogs.filter(log => log.log_date === getLocalDateString());

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom']}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>HAVEN</Text>
        </View>
        <View style={styles.streakBadge}>
          <Ionicons name="flash" size={16} color={Colors.energyOrange} />
          <Text style={styles.streakText}>{profile.current_streak}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        bounces={true}
        overScrollMode="always"
      >
        <View style={styles.content}>
          {isBaselineActive ? (
            <>
              {/* BASELINE UI */}
              <View style={styles.greetingSection}>
                <Text style={styles.greeting}>
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}
                </Text>
                <Text style={styles.subGreeting}>
                  Let's keep building your baseline
                </Text>
              </View>

              {/* Check-in Reminder Banner */}
              {showCheckInReminder && (
                <TouchableOpacity
                  style={styles.checkInBanner}
                  onPress={() => router.push('/dailyCheckin')}
                  activeOpacity={0.8}
                >
                  <View style={styles.bannerContent}>
                    <Ionicons name="fitness" size={20} color="#EF7828" />
                    <View style={styles.bannerTextContainer}>
                      <Text style={styles.bannerTitle}>Daily check-in</Text>
                      <Text style={styles.bannerSubtext}>
                        Quick update on yesterday's activity
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#EF7828" />
                </TouchableOpacity>
              )}
              { showDay7Banner && !showCheckInReminder && (
                    <TouchableOpacity
                      style={styles.day7Banner}
                      onPress={async () => {
                        setShowDay7Banner(false);
                        await handleBaselineEnded();
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.bannerContent}>
                        <Ionicons name="checkmark-done" size={24} color="#10B981" />
                        <View style={styles.bannerTextContainer}>
                          <Text style={styles.bannerTitleD7}>Finished logging for Day 7?</Text>
                          <Text style={styles.bannerSubtextD7}>
                            Tap to see your baseline results
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#10B981" />
                    </TouchableOpacity>
                  )}

              <View style={styles.cardSpacing}>
                <BaselineProgressCard
                  progress={{
                    currentDay: currentDay,
                    daysLogged: daysLogged,
                    totalDays: 7,
                    isComplete: false,
                  }}
                  completedDays={completedBaselineDays}
                  currentDayIndex={currentDay-1}
                />
              </View>

               {/* Today's Calories Card */}
               <View style={styles.cardSpacing}>
                <TodayCaloriesCard
                  todayStats={{
                    consumed: todayCalories,
                    remaining: todayRemaining,
                    macros: todayMacros,
                    goal: todayGoal,
                  }}
                  isBaseline={profile?.baseline_complete === false} 
                />
              </View>


              {daysLogged > 0 && (
                  <View style={styles.cardSpacing}>
                    <SummaryStatsCard
                      totalCalories={baselineStats.totalCalories}
                      daysLogged={daysLogged}
                      avgPerDay={baselineStats.avgCalories}
                      macros={baselineStats.macros}
                      totalBurned={baselineStats.totalBurned}
                    />
                  </View>
              )}

              <View style={styles.cardSpacing}>
                <TodayMealsCard
                  meals={transformMealsData(todayLogs)}
                  onAddMeal={handleLogFood}
                  onMealPress={handleMealPress}
                />
              </View>

              <View style={styles.cardSpacing}>
                <QuickLogCard
                  onCamera={handleCamera}
                  onSearch={handleSearch}
                  onPhoto={handlePhoto}
                  onRecipe={handleRecipe}
                />
              </View>
            </>
          ) : (
            <>
              {/* ACTIVE USER UI */}
              <View style={styles.greetingSection}>
                <Text style={styles.greeting}>
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}
                </Text>
                <Text style={styles.subGreeting}>
                 {getSubGreeting()}
                </Text>
              </View>

             {/* Budget Adjustment Banner */}
          {!isCheatDay && adjustment < 0 && cumulativeOverage > 0 && (
            <TouchableOpacity
              style={styles.budgetAdjustmentBanner}
              activeOpacity={0.9}
            >
              <View style={styles.bannerContent}>
                <Ionicons name="alert-circle" size={20} color="#EF7828" />
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.budgetBannerTitle}>
                    Budget adjusted for this week
                  </Text>
                  <Text style={styles.budgetBannerSubtext}>
                    You're {cumulativeOverage} cal slightly over. Haven recommends eating: {adjustedBudget.toLocaleString()} cal rather than your normal {baseBudget.toLocaleString()} cal
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            )}
            {/*  Cheat Day Banner */}
            {isCheatDay && cheatDayCalories && (
              <View style={styles.cheatDayBanner}>
                <View style={styles.bannerContent}>
                  <Ionicons name="restaurant" size={24} color="#10B981" />
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.cheatDayBannerTitle}>
                      Today is your "cheat" day!
                    </Text>
                    <Text style={styles.cheatDayBannerSubtext}>
                      You have {cheatDayCalories.toLocaleString()} calories to enjoy
                    </Text>
                  </View>
                </View>
              </View>
            )}

              {/* Weekly Calendar */}
              <View style={styles.cardSpacing}>
                <WeeklyCalendar 
                  currentDate={new Date()} 
                  cheatDates={cheatDates}
                  loggedDates={getLoggedDates()}
                  weekInfo={getWeekInfo()}
                />
              </View>
                 {/* Today's Calories Card */}
                 <View style={styles.cardSpacing}>
                <TodayCaloriesCard
                  todayStats={{
                    consumed: todayCalories,
                    remaining: todayRemaining,
                    macros: todayMacros,
                    goal: todayGoal,
                  }}
                  isBaseline={profile?.baseline_complete === false} 
                />
              </View>

              {/* Weekly Budget Card */}
              {metrics && (
                <View style={styles.cardSpacing}>
                  <WeeklyBudgetCard
                    weeklyBudget={metrics.weekly_budget}
                    totalConsumed={metrics.total_consumed}
                    totalRemaining={metrics.total_remaining}
                    daysIntoWeek={getDaysIntoWeek()}
                    weekInfo={getWeekInfo()}
                  />
                </View>
              )}

              {/* Next Cheat Day Card (conditional) */}
              {getNextCheatDayInfo() && (
                <View style={styles.cardSpacing}>
                  <NextCheatDayCard
                    dayName={getNextCheatDayInfo()!.dayName}
                    dateString={getNextCheatDayInfo()!.dateString}
                    reservedCalories={metrics?.calories_reserved || 0}
                    onPress={() => router.push('/(tabs)/plan')}
                  />
                </View>
              )}

              {/* Today's Meals Card */}
              <View style={styles.cardSpacing}>
                <TodayMealsCard
                  meals={transformMealsData(todayLogs)}
                  onAddMeal={handleLogFood}
                  onMealPress={handleMealPress}
                />
              </View>

              {/* Quick Log Card */}
              <View style={styles.cardSpacing}>
                <QuickLogCard
                  onCamera={handleCamera}
                  onSearch={handleSearch}
                  onPhoto={handlePhoto}
                  onRecipe={handleRecipe}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Baseline Complete Modal */}
      <BaselineCompleteModal
  visible={baselineModalType === 'complete'}
  baselineAverage={baselineAverage}
  reportedActivityLevel={profile?.activity_level || undefined}
  actualActivityLevel={profile?.actual_activity_level || undefined}
  daysUsed={baselineDaysLogged}
  onComplete={() => {
    setBaselineModalType(null);
    setBaselineCompletionMessage(undefined);
    onRefresh();
  }}
/>
    {/* Choice Modal */}
    <BaselineChoiceModal
      visible={baselineModalType === 'choice'}
      
      daysLogged={baselineDaysLogged}
      alreadyExtended={profile?.baseline_extended || false}
      onCompleteNow={completeBaselineWithPartialData}
      onExtend={extendBaseline}
    />

    {/* Restart Modal */}
    <BaselineRestartModal
      visible={baselineModalType === 'restart'}
      daysLogged={baselineDaysLogged}
      onRestart={restartBaseline}
      onUseEstimatedData={useEstimatedData}
    />
    </SafeAreaView>
  );
}

// ============= STYLES =============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.lightCream,
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
    borderColor: Colors.vividTeal,
    backgroundColor: 'transparent',
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.vividTeal,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    marginLeft: 4,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 100,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 16,
    color: Colors.steelBlue,
    lineHeight: 24,
  },
  
  // New card spacing
  cardSpacing: {
    marginBottom: 16,
  },
  
  // Trainer-specific styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.steelBlue,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.graphite,
  },
  clientCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientTime: {
    fontSize: 14,
    color: Colors.steelBlue,
    marginBottom: 12,
  },
  clientActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.lightCream,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.graphite,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.graphite,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.steelBlue,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.vividTeal,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
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
    color: Colors.graphite,
  },
  checkInBanner: {
    backgroundColor: '#FFF7ED',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,         
    marginBottom: 16,           
    borderWidth: 1,              
    borderColor: '#FFEDD5', 
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EA580C',
    marginBottom: 2,
  },
  bannerSubtext: {
    fontSize: 13,
    color: '#9A3412',
  },
  bannerTitleD7: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.vividTeal,
    marginBottom: 2,
  },
  bannerSubtextD7: {
    fontSize: 13,
    color: Colors.vividTeal,
  },
  day7Banner: {
    backgroundColor: Colors.tealOverlay,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  budgetAdjustmentBanner: {
  backgroundColor: '#FFF7ED',
  paddingVertical: 16,
  paddingHorizontal: 20,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderRadius: 12,         
  marginBottom: 16,           
  borderWidth: 1,              
  borderColor: '#FFEDD5',
  shadowColor: '#EF7828',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
},
budgetBannerTitle: {
  fontSize: 15,
  fontWeight: '600',
  color: '#EA580C',
  marginBottom: 4,
},
budgetBannerSubtext: {
  fontSize: 13,
  color: '#9A3412',
  lineHeight: 18,
},
cheatDayBanner: {
  backgroundColor: '#ECFDF5',
  paddingVertical: 16,
  paddingHorizontal: 20,
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 12,
  marginBottom: 16,
  borderWidth: 2,
  borderColor: '#10B981',
  shadowColor: '#10B981',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
},
cheatDayBannerTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#059669',
  marginBottom: 4,
},
cheatDayBannerSubtext: {
  fontSize: 14,
  color: '#047857',
  lineHeight: 20,
},
});