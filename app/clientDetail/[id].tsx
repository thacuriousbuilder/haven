

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

interface ClientProfile {
  id: string;
  full_name: string | null;
  current_streak: number;
  baseline_start_date: string | null;
  baseline_complete: boolean;
  baseline_avg_daily_calories: number | null;
}

interface FoodLog {
  id: string;
  food_name: string;
  calories: number | null;
  meal_type: string;
  log_date: string;
  created_at: string;
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [todayMealCount, setTodayMealCount] = useState(0);

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    try {
      // Fetch client profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, current_streak, baseline_start_date, baseline_complete, baseline_avg_daily_calories')
        .eq('id', id)
        .single();
        console.log('user',id)
      if (profileError) {
        console.error('Error fetching client profile:', profileError);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setClient(profileData);
      // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Fetch today's logs specifically
    const { data: todayLogs } = await supabase
      .from('food_logs')
      .select('id')
      .eq('user_id', id)
      .eq('log_date', today);

      console.log('Today logs query result:', todayLogs);
      console.log('Today logs count:', todayLogs?.length || 0);
      setTodayMealCount(todayLogs?.length || 0);

      const { data: allLogs, error: allLogsError } = await supabase
      .from('food_logs')
      .select('id, food_name, log_date, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    console.log('=== ALL LOGS DEBUG ===');
    console.log('Total logs found:', allLogs?.length);
    if (allLogs) {
      allLogs.forEach((log, index) => {
        console.log(`Log ${index + 1}:`, {
          food: log.food_name,
          log_date: log.log_date,
          created_at: log.created_at,
        });
      });
    }
    console.log('=== END DEBUG ===');

      // Fetch recent food logs (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data: logsData, error: logsError } = await supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', id)
          .gte('log_date', sevenDaysAgoStr)
          .lte('log_date', new Date().toISOString().split('T')[0])  // Add upper bound
          .order('log_date', { ascending: false })  // Order by log_date first
          .order('created_at', { ascending: false });

      if (logsError) {
        console.error('Error fetching food logs:', logsError);
      } else {
        setFoodLogs(logsData || []);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    if (logDate.getTime() === today.getTime()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (logDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Group logs by date
  const groupedLogs = foodLogs.reduce((acc, log) => {
    const date = log.log_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, FoodLog[]>);

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3D5A5C" />
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#3D5A5C" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{client.full_name || 'Client'}</Text>
          {!client.baseline_complete && client.baseline_start_date && (
            <Text style={styles.headerStatus}>In Baseline Week</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {/* TODO: Open messages */}}
          style={styles.messageButton}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#3D5A5C" />
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
          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="flash" size={24} color="#E09B7B" />
              <Text style={styles.statNumber}>{client.current_streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            <View style={styles.statCard}>
    <Ionicons name="restaurant" size={24} color="#3D5A5C" />
    <Text style={styles.statNumber}>{todayMealCount}</Text>
    <Text style={styles.statLabel}>Today's Meals</Text>
  </View>

            {client.baseline_complete && client.baseline_avg_daily_calories && (
              <View style={styles.statCard}>
                <Ionicons name="analytics" size={24} color="#10B981" />
                <Text style={styles.statNumber}>{client.baseline_avg_daily_calories}</Text>
                <Text style={styles.statLabel}>Baseline Avg</Text>
              </View>
            )}
          </View>

          {/* Food Logs Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Food Logs</Text>
            
            {sortedDates.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No food logs yet</Text>
                <Text style={styles.emptyDescription}>
                  Client hasn't logged meals in the last 7 days
                </Text>
              </View>
            ) : (
              sortedDates.map((date) => (
                <View key={date} style={styles.dateGroup}>
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateText}>{formatDate(date)}</Text>
                    <Text style={styles.dateMealCount}>
                      {groupedLogs[date].length} meal{groupedLogs[date].length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  
                  {groupedLogs[date].map((log) => (
                    <View key={log.id} style={styles.logCard}>
                      <View style={styles.logLeft}>
                        <View style={styles.mealIconContainer}>
                          <Ionicons
                            name={getMealIcon(log.meal_type) as any}
                            size={20}
                            color="#3D5A5C"
                          />
                        </View>
                        <View style={styles.logInfo}>
                          <Text style={styles.logFood}>{log.food_name}</Text>
                          <Text style={styles.logMeta}>
                            {capitalizeFirst(log.meal_type)} • {formatTime(log.created_at)}
                          </Text>
                        </View>
                      </View>
                      {log.calories && (
                        <View style={styles.logCalories}>
                          <Text style={styles.caloriesNumber}>{log.calories}</Text>
                          <Text style={styles.caloriesLabel}>cal</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
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
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  headerStatus: {
    fontSize: 14,
    color: '#F59E0B',
    marginTop: 2,
  },
  messageButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 16,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
  },
  dateMealCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F1E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
  },
  logFood: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  logMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  logCalories: {
    alignItems: 'flex-end',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});