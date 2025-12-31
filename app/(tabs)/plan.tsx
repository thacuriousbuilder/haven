import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { PlannedCheatDay } from '@/types/database';

export default function PlanScreen() {
  const router = useRouter();
  const [cheatDays, setCheatDays] = useState<PlannedCheatDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyBudget, setWeeklyBudget] = useState(0);
  const [totalReserved, setTotalReserved] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load weekly budget
      const { data: profile } = await supabase
        .from('profiles')
        .select('weekly_calorie_bank')
        .eq('id', user.id)
        .single();

      if (profile) {
        setWeeklyBudget(profile.weekly_calorie_bank || 0);
      }

      // Load upcoming cheat days
      const today = new Date().toISOString().split('T')[0];

      const { data: cheatDaysData } = await supabase
        .from('planned_cheat_days')
        .select('*')
        .eq('user_id', user.id)
        .gte('cheat_date', today)
        .order('cheat_date', { ascending: true });

      if (cheatDaysData) {
        setCheatDays(cheatDaysData);
        
        // Calculate total reserved
        const reserved = cheatDaysData.reduce(
          (sum, day) => sum + (day.planned_calories || 0),
          0
        );
        setTotalReserved(reserved);
      }
    } catch (error) {
      console.error('Error loading plan data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getNextCheatDay = () => {
    if (cheatDays.length === 0) return null;
    return cheatDays[0];
  };

  const nextCheatDay = getNextCheatDay();

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C4A52" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Plan</Text>
          <Text style={styles.subtitle}>Manage your weekly cheat days</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={24} color="#FF6B35" />
            <Text style={styles.statValue}>{cheatDays.length}</Text>
            <Text style={styles.statLabel}>Planned Days</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={24} color="#FF6B35" />
            <Text style={styles.statValue}>{totalReserved.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Reserved Cal</Text>
          </View>
        </View>

        {/* Next Cheat Day Card */}
        {nextCheatDay ? (
          <View style={styles.nextCheatCard}>
            <View style={styles.nextCheatHeader}>
              <Text style={styles.nextCheatTitle}>Next Cheat Day</Text>
              <Text style={styles.nextCheatBadge}>{getDaysUntil(nextCheatDay.cheat_date)}</Text>
            </View>
            
            <Text style={styles.nextCheatDate}>{formatDate(nextCheatDay.cheat_date)}</Text>
            
            <View style={styles.nextCheatDetails}>
              <View style={styles.nextCheatDetailRow}>
                <Ionicons name="flame" size={16} color="#666" />
                <Text style={styles.nextCheatDetailText}>
                  {nextCheatDay.planned_calories} calories
                </Text>
              </View>
              
              {nextCheatDay.notes && (
                <View style={styles.nextCheatDetailRow}>
                  <Ionicons name="document-text" size={16} color="#666" />
                  <Text style={styles.nextCheatDetailText} numberOfLines={2}>
                    {nextCheatDay.notes}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noCheatCard}>
            <Ionicons name="calendar-outline" size={48} color="#CCC" />
            <Text style={styles.noCheatText}>No cheat days planned yet</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/planCheatDay')}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Plan Cheat Day</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/manageCheatDay')}
          >
            <Ionicons name="list" size={20} color="#2C4A52" />
            <Text style={styles.secondaryButtonText}>Manage All ({cheatDays.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Cheat Days List */}
        {cheatDays.length > 1 && (
          <View style={styles.upcomingSection}>
            <Text style={styles.sectionTitle}>All Upcoming</Text>
            {cheatDays.map((cheatDay, index) => (
              <TouchableOpacity
                key={cheatDay.id}
                style={styles.cheatDayItem}
                onPress={() => router.push({
                  pathname: '/editCheatDay',
                  params: {
                    id: cheatDay.id,
                    date: cheatDay.cheat_date,
                    calories: cheatDay.planned_calories.toString(),
                    notes: cheatDay.notes || '',
                  },
                })}
              >
                <View style={styles.cheatDayLeft}>
                  <Text style={styles.cheatDayDate}>{formatDate(cheatDay.cheat_date)}</Text>
                  <Text style={styles.cheatDayCalories}>
                    {cheatDay.planned_calories} cal
                  </Text>
                </View>
                
                <View style={styles.cheatDayRight}>
                  <Text style={styles.cheatDayBadge}>{getDaysUntil(cheatDay.cheat_date)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color="#FF6B35" />
            <Text style={styles.tipsTitle}>Planning Tips</Text>
          </View>
          <Text style={styles.tipsText}>
            • Plan cheat days in advance to help HAVEN adjust your weekly budget{'\n'}
            • Be realistic with calorie estimates{'\n'}
            • Don't feel guilty - cheat days are part of the plan!
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2C4A52',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C4A52',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  nextCheatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  nextCheatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextCheatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextCheatBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nextCheatDate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C4A52',
    marginBottom: 12,
  },
  nextCheatDetails: {
    gap: 8,
  },
  nextCheatDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextCheatDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  noCheatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
  },
  noCheatText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C4A52',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2C4A52',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C4A52',
  },
  upcomingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C4A52',
    marginBottom: 12,
  },
  cheatDayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  cheatDayLeft: {
    flex: 1,
  },
  cheatDayDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C4A52',
    marginBottom: 4,
  },
  cheatDayCalories: {
    fontSize: 14,
    color: '#666',
  },
  cheatDayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cheatDayBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  tipsCard: {
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C4A52',
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});