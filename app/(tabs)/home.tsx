import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CircularMetric from '@/components/circularMetric';
import WeeklyCalendar from '@/components/weeklyCalendar';
import StatCard from '@/components/statCard';
import { calculateMetrics } from '@/utils/metrics';
import { calculateWeeklyBudget } from '@/utils/weeklyBudget';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

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
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [cheatDates, setCheatDates] = useState<string[]>([]);
  const [userName, setUserName] = useState<string>('there');
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [baselineComplete, setBaselineComplete] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

  const loadData = async () => {
    try {
      // Load user profile
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User auth error:', userError);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, current_streak, baseline_complete')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
      }

      if (profile) {
        setUserName(profile.full_name || 'there');
        setStreak(profile.current_streak || 0);
        setBaselineComplete(profile.baseline_complete || false);
      }

      // Only load metrics if baseline is complete
      if (profile?.baseline_complete) {
        try {
          // Check if weekly period exists for this week
         const today = new Date();
        const monday = getMonday(today);
        const weekStartDate = monday.toISOString().split('T')[0];
        const { data: weeklyPeriod, error: periodError } = await supabase
            .from('weekly_periods')
            .select('*')
            .eq('user_id', user.id)
            .eq('week_start_date', weekStartDate)
            .single();

        
          // If no weekly period exists, create it
          if (!weeklyPeriod) {
            console.log('No weekly period found, creating one...');
            await calculateWeeklyBudget();
          }

          // Now calculate metrics
          const metricsData = await calculateMetrics();
          setMetrics(metricsData);

          // Load cheat days for this week
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
          // Don't fail the whole screen if metrics fail
          Alert.alert(
            'Metrics Error',
            'Unable to load metrics. Please make sure you have completed your baseline week with 7 days of food logs.'
          );
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getNextCheatDay = () => {
    const today = new Date();
    const upcoming = cheatDates.filter(date => new Date(date) > today);
    if (upcoming.length === 0) return null;
    
    const nextDate = new Date(upcoming[0]);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[nextDate.getDay()];
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C4A52" />
      </SafeAreaView>
    );
  }

  // Show message if baseline not complete
  if (!baselineComplete) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.logo}>HAVEN</Text>
        <Text style={styles.placeholderText}>
          Complete your baseline week to unlock weekly tracking
        </Text>
      </SafeAreaView>
    );
  }

  const nextCheatDay = getNextCheatDay();
  const firstName = userName ? userName.split(' ')[0] : 'there';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>HAVEN</Text>
        <View style={styles.streakBadge}>
          <Ionicons name="flash" size={16} color="#FF6B35" />
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      </View>

      {/* Welcome Message */}
      <Text style={styles.welcomeText}>
        Welcome, {firstName}
      </Text>
      <Text style={styles.subtitle}>Enjoy yourself today, you've earned it!</Text>

      <TouchableOpacity
         style={styles.planButton}
         onPress={() => router.push('/planCheatDay')}
        >            
        <Ionicons name="calendar-outline" size={20} color="#2C4A52" />
        <Text style={styles.planButtonText}>Plan Cheat Day</Text>
        </TouchableOpacity>

         <TouchableOpacity
  style={styles.planButton}
  onPress={() => router.push('/manageCheatDay')}
>            
  <Ionicons name="list-outline" size={20} color="#2C4A52" />
  <Text style={styles.planButtonText}>Manage Cheat Days</Text>
</TouchableOpacity>

      {/* Weekly Calendar */}
      <View style={styles.section}>
        <WeeklyCalendar currentDate={new Date()} cheatDates={cheatDates} />
      </View>

      {/* Metrics */}
      {metrics ? (
        <View style={styles.metricsContainer}>
          <CircularMetric
            score={metrics.balance_score}
            label="Balance"
          />
          <CircularMetric
            score={metrics.consistency_score}
            label="Consistency"
          />
          <CircularMetric
            score={metrics.drift_score}
            label="Drift"
          />
        </View>
      ) : (
        <View style={styles.metricsContainer}>
          <ActivityIndicator size="small" color="#2C4A52" />
          <Text style={styles.placeholderText}>Loading metrics...</Text>
        </View>
      )}

      {/* Main Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          value={metrics?.weekly_budget || 0}
          label="Total weekly calories"
        />
        <View style={{ width: 12 }} />
        <StatCard
          value={metrics?.total_consumed || 0}
          label="Used so far"
        />
      </View>

      {/* Secondary Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          value={metrics?.total_remaining || 0}
          label="Remaining"
        />
        <View style={{ width: 12 }} />
        <StatCard
          value={500}
          label="Burned calories"
        />
      </View>

      {/* Bottom Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          value={metrics?.calories_reserved || 0}
          label="Calories reserved"
          size="small"
        />
        <View style={{ width: 12 }} />
        <StatCard
          value={nextCheatDay || '-'}
          label="Upcoming cheat day"
          size="small"
        />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  content: {
    padding: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#2C4A52',
    textAlign: 'center',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C4A52',
    letterSpacing: 1,
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
    color: '#2C4A52',
    marginLeft: 4,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C4A52',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#2C4A52',
    marginBottom: 24,
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
  planButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 14,
  marginBottom: 20,
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#2C4A52',
},
planButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#2C4A52',
  marginLeft: 8,
},
});
