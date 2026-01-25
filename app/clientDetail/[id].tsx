// app/clientDetail/[id].tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getLocalDateString } from '@/utils/timezone';

// Import cards
import { ClientMetricCards } from '@/components/coach/clientMetricCards';
import { TodayCaloriesCard } from '@/components/homebaseline/cards/todayCaloriesCard';
import { NextCheatDayCard } from '@/components/homeactive/cards/nextCheatDayCard';
import { ClientFoodLogs } from '@/components/coach/clientFoodLogs';

interface ClientProfile {
  id: string;
  full_name: string | null;
  current_streak: number;
  baseline_start_date: string | null;
  baseline_complete: boolean;
  baseline_avg_daily_calories: number | null;
  weekly_calorie_bank: number | null;
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

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [todayMealCount, setTodayMealCount] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0);
  const [cheatDates, setCheatDates] = useState<string[]>([]);

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    try {
      // Fetch client profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) {
        console.error('Error fetching client profile:', profileError);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setClient(profileData);

      // Get today's date
      const today = getLocalDateString();

      // Fetch today's logs specifically
      const { data: todayLogs } = await supabase
        .from('food_logs')
        .select('calories')
        .eq('user_id', id)
        .eq('log_date', today);

      setTodayMealCount(todayLogs?.length || 0);
      const todayTotal = todayLogs?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
      setTodayCalories(todayTotal);

      // Fetch recent food logs (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data: logsData, error: logsError } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', id)
        .gte('log_date', sevenDaysAgoStr)
        .lte('log_date', today)
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (logsError) {
        console.error('Error fetching food logs:', logsError);
      } else {
        setFoodLogs(logsData || []);
      }

      // Fetch cheat days if client has completed baseline
      if (profileData.baseline_complete) {
        const { data: cheatDays } = await supabase
          .from('planned_cheat_days')
          .select('cheat_date')
          .eq('user_id', id)
          .gte('cheat_date', today);

        if (cheatDays) {
          setCheatDates(cheatDays.map(cd => cd.cheat_date));
        }
      }

    } catch (error) {
      console.error('Error in fetchClientData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClientData();
  };

  // Get unique dates that have logs
  const getAvailableDates = (): string[] => {
    const uniqueDates = [...new Set(foodLogs.map(log => log.log_date))];
    return uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  };

  // Get next cheat day info
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.vividTeal} />
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Client not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const nextCheatDay = getNextCheatDayInfo();
  const dailyGoal = client.baseline_avg_daily_calories || 2000;
  const todayRemaining = dailyGoal - todayCalories;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.graphite} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{client.full_name || 'Client'}</Text>
          {!client.baseline_complete && client.baseline_start_date && (
            <Text style={styles.headerStatus}>Day {client.current_streak} of 7</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => router.push(`/messageThread/${client.id}`)}
        >
          <Ionicons name="chatbubble-outline" size={24} color={Colors.graphite} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Metric Cards */}
          <ClientMetricCards
            dayStreak={client.current_streak}
            todayMeals={todayMealCount}
          />

          {/* Today's Calories Card */}
          {client.baseline_complete && (
            <View style={styles.cardSpacing}>
              <TodayCaloriesCard
                todayStats={{
                  consumed: todayCalories,
                  remaining: todayRemaining,
                  goal: dailyGoal,
                  macros: { protein: 0, carbs: 0, fat: 0 },
                }}
              />
            </View>
          )}


          {/* Next Cheat Day Card */}
          {nextCheatDay && (
            <View style={styles.cardSpacing}>
              <NextCheatDayCard
                dayName={nextCheatDay.dayName}
                dateString={nextCheatDay.dateString}
                reservedCalories={0}
                onPress={() => {}}
              />
            </View>
          )}

           {/* Food Logs Section */}
            <View style={styles.logsSection}>
              <ClientFoodLogs
                foodLogs={foodLogs}
                availableDates={getAvailableDates()}
              />
            </View>
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.lightCream ,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.graphite,
  },
  headerStatus: {
    fontSize: 14,
    color: '#F59E0B',
    marginTop: 2,
  },
  messageButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  logsSection: {
    marginTop: 8,
  },
});