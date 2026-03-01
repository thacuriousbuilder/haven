
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getLocalDateString, supabase } from '@haven/shared-utils';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';


import { CoachDashboardHeader } from '@/components/coach/coachDashboardHeader';
import { ClientOverview } from '@/components/coach/clientOverview';
import { ClientCardFollowUp } from '@/components/coach/clientCardFollowUp';
import { ClientCardBaseline } from '@/components/coach/clientCardBaseline';
import { ClientCardOnTrack } from '@/components/coach/clientCardOnTrack';

interface ClientStatus {
  id: string;
  first_name: string | null;
  last_name: string | null;
  last_log_time: string | null;
  meals_today: number;
  current_streak: number;
  balance_score: number | null;
  status: 'needs_attention' | 'on_track' | 'baseline';
  baseline_day: number | null;
  days_inactive?: number;
  baseline_days_completed?: number;
  baseline_days_remaining?: number;
  baseline_avg_daily_calories?: number;
}

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  user_type: 'client' | 'trainer';
}

interface DashboardStats {
  unreadMessagesCount: number;
  clientsNeedingAttention: number;
}

export default function TrainerHome() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<ClientStatus[]>([]);
  const [clientStats, setClientStats] = useState({
    total: 0,
    needsAttention: 0,
    onTrack: 0,
    baseline: 0,
  });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    unreadMessagesCount: 0,
    clientsNeedingAttention: 0,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchTrainerDashboard();
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/(auth)/welcome');
        return;
      }

      const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, user_type')
      .eq('id', user.id)
      .single();
      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      setProfile(data);
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

      const todayDateStr = getLocalDateString();

      // Use the RPC function to get client data
      const { data: clientsData, error: clientsError } = await supabase
        .rpc('get_coach_clients_with_status', { 
          coach_id: user.id, 
          today_date: todayDateStr 
        });

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

      // Transform client data
      const clientStatuses: ClientStatus[] = clientsData.map((client: any) => ({
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
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
      }));

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

  const calculateWeeklyProgress = (): number => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const monday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0
    const daysIntoWeek = monday + 1;
    return Math.round((daysIntoWeek / 7) * 100);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchTrainerDashboard();
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

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  const needsAttentionClients = clients.filter(c => c.status === 'needs_attention');
  const baselineClients = clients.filter(c => c.status === 'baseline');
  const onTrackClients = clients.filter(c => c.status === 'on_track');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CoachDashboardHeader
        coachName={profile.first_name || 'Coach'}
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
          {clientStats.total > 0 ? (
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
                      fullName={client.first_name || 'Client'}
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
                      fullName={client.first_name || 'Client'}
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
                      fullName={client.first_name || 'Client'}
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
                      onPress={() => router.push('/(tabs)/clients')}
                    >
                      <Text style={styles.showMoreText}>
                        Show all {onTrackClients.length} →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          ) : (
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 100,
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
});
