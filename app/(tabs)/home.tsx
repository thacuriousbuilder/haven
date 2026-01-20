

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
import { getLocalDateString } from '@/utils/timezone';
import { BaselineProgressCard } from '@/components/homebaseline/cards/baselineProgressCard';
import { SummaryStatsCard } from '@/components/homebaseline/cards/summaryStatsCard';
import { QuickLogCard } from '@/components/homebaseline/cards/quickLogCard';
import { TodayMealsCard } from '@/components/homebaseline/cards/todayMealsCard';
import * as ImagePicker from 'expo-image-picker';

// Type imports
import type { MealLogItem, MacroData } from '@/types/home';
import { Colors } from '@/constants/colors';

interface ProfileData {
  full_name: string | null;
  current_streak: number;
  baseline_start_date: string | null;
  baseline_complete: boolean;
  weekly_calorie_bank: number;
  user_type: 'client' | 'trainer';
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
  balance_score: number;
  consistency_score: number;
  drift_score: number;
  total_consumed: number;
  total_remaining: number;
  calories_reserved: number;
  weekly_budget: number;
}

interface ClientStatus {
  id: string;
  full_name: string | null;
  last_log_time: string | null;
  meals_today: number;
  current_streak: number;
  balance_score: number | null;
  status: 'needs_attention' | 'on_track' | 'baseline';
  baseline_day: number | null;
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
  
  // Trainer-specific state
  const [clients, setClients] = useState<ClientStatus[]>([]);
  const [clientStats, setClientStats] = useState({
    total: 0,
    needsAttention: 0,
    onTrack: 0,
    baseline: 0,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      if (profile.user_type === 'trainer') {
        fetchTrainerDashboard();
      } else {
        fetchRecentLogs();
        if (daysLogged >= 7) {
          checkBaselineCompletion();
        }
      }
    }
  }, [profile, daysLogged]);

  // Find your existing baseline debug useEffect and add this
// useEffect(() => {
//   if (profile?.user_type !== 'trainer' && profile?.baseline_start_date && !profile?.baseline_complete && recentLogs.length > 0) {
//     console.log('=== BASELINE DEBUG ===');
//     console.log('Baseline start date:', profile?.baseline_start_date);
//     console.log('Current day:', currentDay);
//     console.log('Days logged:', daysLogged);
//     console.log('Recent logs count:', recentLogs.length);
    
//     // ADD THIS - Show ALL food logs
//     console.log('\n=== ALL FOOD LOGS ===');
//     recentLogs.forEach((log, index) => {
//       console.log(`${index + 1}. ${log.food_name}:`, {
//         log_date: log.log_date,
//         created_at: log.created_at,
//         calories: log.calories,
//       });
//     });
    
//     // Show which dates have logs
//     const startDate = new Date(profile.baseline_start_date + 'T00:00:00');
//     console.log('\n=== DAYS BREAKDOWN ===');
//     for (let i = 0; i < 7; i++) {
//       const checkDate = new Date(startDate);
//       checkDate.setDate(startDate.getDate() + i);
//       const dateStr = checkDate.toISOString().split('T')[0];
//       const logsForDay = recentLogs.filter(log => log.log_date === dateStr);
//       console.log(`Day ${i + 1} (${dateStr}):`, logsForDay.length, 'logs');
//       logsForDay.forEach(log => {
//         console.log(`  - ${log.food_name} (${log.calories} cal)`);
//       });
//     }
//   }
// }, [profile, recentLogs, currentDay, daysLogged]);

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

  // Calculate today's macros
  const calculateTodayMacros = (): MacroData => {
    const today = getLocalDateString();
    const todayLogs = recentLogs.filter(log => log.log_date === today);
    return calculateTotalMacros(todayLogs);
  };

  // Calculate today's total calories
  const calculateTodayCalories = (): number => {
    const today = getLocalDateString();
    const todayLogs = recentLogs.filter(log => log.log_date === today);
    return todayLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  };

  // Get baseline logs (all logs from baseline start date)
  const getBaselineLogs = (): FoodLog[] => {
    if (!profile?.baseline_start_date) return [];
    return recentLogs.filter(log => log.log_date >= profile.baseline_start_date!);
  };

  const getCompletedBaselineDays = (): boolean[] => {
    if (!profile?.baseline_start_date) {
      return [false, false, false, false, false, false, false];
    }
  
    const startDate = new Date(profile.baseline_start_date + 'T00:00:00');
    const completedDays = [false, false, false, false, false, false, false];
  
    // Check each day from baseline start
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  
      // Check if this date has logs
      const hasLogs = recentLogs.some(log => log.log_date === dateStr);
      completedDays[i] = hasLogs;
    }
  
    return completedDays;
  };

  // ============= DATA FETCHING FUNCTIONS =============

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
          const today = new Date();
          const monday = getMonday(today);
          const year = monday.getFullYear();
          const month = String(monday.getMonth() + 1).padStart(2, '0');
          const day = String(monday.getDate()).padStart(2, '0');
          const weekStartDate = `${year}-${month}-${day}`;

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
          const sundayYear = sunday.getFullYear();
          const sundayMonth = String(sunday.getMonth() + 1).padStart(2, '0');
          const sundayDay = String(sunday.getDate()).padStart(2, '0');
          const sundayDateStr = `${sundayYear}-${sundayMonth}-${sundayDay}`; 
          
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

  const fetchTrainerDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientProfiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, current_streak, baseline_start_date, baseline_complete')
        .eq('trainer_id', user.id);

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      if (!clientProfiles || clientProfiles.length === 0) {
        setClients([]);
        setClientStats({ total: 0, needsAttention: 0, onTrack: 0, baseline: 0 });
        return;
      }

      const today = getLocalDateString();
      const clientStatuses: ClientStatus[] = [];

      for (const client of clientProfiles) {
        const { data: todayLogs } = await supabase
          .from('food_logs')
          .select('created_at')
          .eq('user_id', client.id)
          .eq('log_date', today)
          .order('created_at', { ascending: false });

        const mealsToday = todayLogs?.length || 0;
        const lastLogTime = todayLogs?.[0]?.created_at || null;

        let status: 'needs_attention' | 'on_track' | 'baseline' = 'on_track';
        let baselineDay = null;

        if (!client.baseline_complete && client.baseline_start_date) {
          status = 'baseline';
          const startDate = new Date(client.baseline_start_date);
          const todayDate = new Date();
          const diffDays = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          baselineDay = Math.min(diffDays, 7);
        } else if (mealsToday === 0) {
          status = 'needs_attention';
        } else if (mealsToday < 2) {
          status = 'needs_attention';
        }

        clientStatuses.push({
          id: client.id,
          full_name: client.full_name,
          last_log_time: lastLogTime,
          meals_today: mealsToday,
          current_streak: client.current_streak || 0,
          balance_score: null,
          status,
          baseline_day: baselineDay,
        });
      }

      setClients(clientStatuses);

      const stats = {
        total: clientStatuses.length,
        needsAttention: clientStatuses.filter(c => c.status === 'needs_attention').length,
        onTrack: clientStatuses.filter(c => c.status === 'on_track').length,
        baseline: clientStatuses.filter(c => c.status === 'baseline').length,
      };
      setClientStats(stats);

    } catch (error) {
      console.error('Error in fetchTrainerDashboard:', error);
    }
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

    //    // ADD THIS DEBUG
    // console.log('=== ALL FOOD LOGS ===');
    // console.log('Total logs fetched:', data?.length || 0);
    // data?.forEach((log, index) => {
    //   console.log(`Log ${index + 1}:`, {
    //     food_name: log.food_name,
    //     log_date: log.log_date,
    //     created_at: log.created_at,
    //     calories: log.calories,
    //   });
    // });

      setRecentLogs(data || []);
    } catch (error) {
      console.error('Error in fetchRecentLogs:', error);
    }
  };

  const checkBaselineCompletion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      if (!profile?.baseline_start_date || profile?.baseline_complete) {
        return;
      }
  
      if (daysLogged >= 7) {
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
      // Navigate to log screen with camera method and image
      router.push({
        pathname: '/log',
        params: { method: 'camera', imageBase64: result.assets[0].base64 }
      });
    }
  };

  const handleSearch = () => {
    // Navigate to log screen with search method pre-selected
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
      // Navigate to log screen with photo method and image
      router.push({
        pathname: '/log',
        params: { method: 'photo', imageBase64: result.assets[0].base64 }
      });
    }
  };

  const handleRecipe = () => {
    // Navigate to log screen with manual method (or create recipe-specific flow)
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

  // ============= FORMATTING FUNCTIONS =============

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getTimeSinceLog = (timestamp: string | null) => {
    if (!timestamp) return 'No logs today';
    
    const now = new Date();
    const logTime = new Date(timestamp);
    const diffMs = now.getTime() - logTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return 'Yesterday';
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'sunny-outline';
      case 'lunch': return 'partly-sunny-outline';
      case 'dinner': return 'moon-outline';
      case 'snack': return 'fast-food-outline';
      default: return 'restaurant-outline';
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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle} />
            <Text style={styles.logo}>HAVEN</Text>
          </View>
        </View>

          <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}  // Add this
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              bounces={true}                    // Add this for iOS bounce
              overScrollMode="always"           // Add this for Android
            >
          <View style={styles.content}>
            <View style={styles.greetingSection}>
              <Text style={styles.greeting}>Coach Dashboard</Text>
              <Text style={styles.subGreeting}>
                {clientStats.total === 0 
                  ? 'No clients yet. Share your invite code to get started!' 
                  : `Managing ${clientStats.total} client${clientStats.total !== 1 ? 's' : ''}`}
              </Text>
            </View>

            {clientStats.total > 0 && (
              <>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{clientStats.total}</Text>
                    <Text style={styles.statLabel}>Total Clients</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{clientStats.onTrack}</Text>
                    <Text style={styles.statLabel}>On Track</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#EF4444' }]}>{clientStats.needsAttention}</Text>
                    <Text style={styles.statLabel}>Need Follow-up</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{clientStats.baseline}</Text>
                    <Text style={styles.statLabel}>In Baseline</Text>
                  </View>
                </View>

                {needsAttentionClients.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="alert-circle" size={24} color="#EF4444" />
                      <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>
                        Needs Attention ({needsAttentionClients.length})
                      </Text>
                    </View>

                    {needsAttentionClients.map((client) => (
                      <View key={client.id} style={styles.clientCard}>
                        <View style={styles.clientHeader}>
                          <Text style={styles.clientName}>
                            {client.full_name || 'Client'}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={[styles.statusText, { color: '#EF4444' }]}>
                              {client.meals_today === 0 ? 'No logs' : `${client.meals_today} meal${client.meals_today !== 1 ? 's' : ''}`}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.clientTime}>
                          Last: {getTimeSinceLog(client.last_log_time)}
                        </Text>
                        <View style={styles.clientActions}>
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => router.push(`/messageThread/${client.id}`)}
                          >
                            <Ionicons name="chatbubble-outline" size={16} color="#3D5A5C" />
                            <Text style={styles.actionText}>Message</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => router.push(`/clientDetail/${client.id}`)}
                          >
                            <Ionicons name="eye-outline" size={16} color="#3D5A5C" />
                            <Text style={styles.actionText}>View Progress</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {baselineClients.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="time-outline" size={24} color="#F59E0B" />
                      <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>
                        In Baseline ({baselineClients.length})
                      </Text>
                    </View>

                    {baselineClients.map((client) => (
                      <View key={client.id} style={styles.clientCard}>
                        <View style={styles.clientHeader}>
                          <Text style={styles.clientName}>
                            {client.full_name || 'Client'}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                            <Text style={[styles.statusText, { color: '#F59E0B' }]}>
                              Day {client.baseline_day} of 7
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.clientTime}>
                          {client.meals_today} meals logged today
                        </Text>
                        <View style={styles.clientActions}>
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => router.push(`/clientDetail/${client.id}`)}
                          >
                            <Ionicons name="eye-outline" size={16} color="#3D5A5C" />
                            <Text style={styles.actionText}>View Progress</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {onTrackClients.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      <Text style={[styles.sectionTitle, { color: '#10B981' }]}>
                        On Track ({onTrackClients.length})
                      </Text>
                    </View>

                    {onTrackClients.slice(0, 3).map((client) => (
                      <View key={client.id} style={styles.clientCard}>
                        <View style={styles.clientHeader}>
                          <Text style={styles.clientName}>
                            {client.full_name || 'Client'}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                            <Text style={[styles.statusText, { color: '#10B981' }]}>
                              {client.meals_today} meals
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.clientTime}>
                          Last: {getTimeSinceLog(client.last_log_time)}
                        </Text>
                      </View>
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
                <Ionicons name="people-outline" size={64} color="#D1D5DB" />
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
  const nextCheatDay = getNextCheatDay();

  const baselineLogs = getBaselineLogs();
  const baselineTotalCalories = baselineLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const baselineAvgCalories = daysLogged > 0 ? Math.round(baselineTotalCalories / daysLogged) : 0;
  const baselineMacros = calculateTotalMacros(baselineLogs);

  const todayCalories = calculateTodayCalories();
  const todayMacros = calculateTodayMacros();
  const todayGoal = 2000; // TODO: Calculate from profile or weekly budget
  const todayRemaining = todayGoal - todayCalories;

  const todayLogs = recentLogs.filter(log => log.log_date === getLocalDateString());


  return (
    <SafeAreaView style={styles.container}>
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
          contentContainerStyle={styles.scrollContent}  // Add this
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          bounces={true}                    // Add this for iOS bounce
          overScrollMode="always"           // Add this for Android
        >
        <View style={styles.content}>
          {isBaselineActive ? (
            <>
              {/* NEW BASELINE UI */}
              <View style={styles.greetingSection}>
                <Text style={styles.greeting}>
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}
                </Text>
                <Text style={styles.subGreeting}>
                  Let's keep building your baseline
                </Text>
              </View>

              {/* Baseline Progress Card */}
              <View style={styles.cardSpacing}>
                  <BaselineProgressCard
                    progress={{
                      currentDay: currentDay,
                      daysLogged: daysLogged,
                      totalDays: 7,
                      isComplete: false,
                    }}
                    completedDays={getCompletedBaselineDays()}
                    currentDayIndex={daysLogged}
                  />
                </View>

              {/* Summary Stats Card */}
              {daysLogged > 0 && (
                <View style={styles.cardSpacing}>
                  <SummaryStatsCard
                    totalCalories={baselineTotalCalories}
                    daysLogged={daysLogged}
                    avgPerDay={baselineAvgCalories}
                    macros={baselineMacros}
                  />
                </View>
              )}

              {/* Today's Meals Card */}
              <View style={styles.cardSpacing}>
                <TodayMealsCard
                  meals={transformMealsData(todayLogs)}
                  onAddMeal={handleLogFood}
                  onMealPress={(meal) => {
                    console.log('Meal pressed:', meal.name);
                  }}
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
          ) : (
            <>
              {/* Active UI - Keep existing for now */}
              <View style={styles.greetingSection}>
                <Text style={styles.greeting}>Welcome, {firstName}</Text>
                <Text style={styles.subGreeting}>You're doing great today!</Text>
              </View>

              <View style={styles.section}>
                <WeeklyCalendar currentDate={new Date()} cheatDates={cheatDates} />
              </View>

              {metrics ? (
                <View style={styles.metricsContainer}>
                  <CircularMetric score={metrics.balance_score} label="Balance" />
                  <CircularMetric score={metrics.consistency_score} label="Consistency" />
                  <CircularMetric score={metrics.drift_score} label="Drift" />
                </View>
              ) : (
                <View style={styles.metricsContainer}>
                  <ActivityIndicator size="small" color={Colors.vividTeal} />
                </View>
              )}

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

      <BaselineCompleteModal
        visible={showBaselineComplete}
        baselineAverage={baselineAverage}
        onComplete={() => {
          setShowBaselineComplete(false);
          onRefresh();
        }}
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

  // Keep existing styles for active UI
  dayCard: {
    backgroundColor: Colors.white,
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
    color: Colors.white,
  },
  dayLabel: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 4,
  },
  dayDescription: {
    fontSize: 14,
    color: Colors.steelBlue,
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
    backgroundColor: Colors.vividTeal,
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
    color: Colors.white,
  },
  checkInButton: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.vividTeal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkInText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.vividTeal,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 16,
  },
  logCard: {
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
    color: Colors.graphite,
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
    color: Colors.steelBlue,
    backgroundColor: Colors.lightCream,
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
    color: Colors.graphite,
  },
  caloriesLabel: {
    fontSize: 12,
    color: Colors.steelBlue,
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
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.steelBlue,
    lineHeight: 22,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.white,
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