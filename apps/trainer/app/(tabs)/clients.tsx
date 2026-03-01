

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@haven/shared-utils';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { getLocalDateString } from '@haven/shared-utils/utils/timezone';

// Import new card components
import { ClientCardFollowUp } from '@/components/coach/clientCardFollowUp';
import { ClientCardOnTrack } from '@/components/coach/clientCardOnTrack';
import { ClientCardBaseline } from '@/components/coach/clientCardBaseline';

interface Client {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  status: 'need_followup' | 'on_track' | 'in_baseline';
  baseline_days_completed: number | null;
  baseline_days_remaining: number | null;
  baseline_avg_daily_calories: number | null;
  current_streak: number;
  meals_logged_today: number;
  days_inactive: number;
}

type FilterType = 'all' | 'on_track' | 'in_baseline' | 'need_followup';

export default function ClientsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use RPC function to get clients with status
      const { data: clientsData, error } = await supabase
      .rpc('get_coach_clients_with_status', { 
        coach_id: user.id,
        today_date: getLocalDateString()
      });

      if (error) {
        console.error('Error fetching clients:', error);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setClients(clientsData || []);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error in fetchClients:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  // Helper function to calculate weekly progress
  const calculateWeeklyProgress = (): number => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const daysIntoWeek = monday + 1;
    return Math.round((daysIntoWeek / 7) * 100);
  };

  // Filter and search clients
  const filteredClients = clients.filter(client => {
    // Apply status filter
    if (activeFilter !== 'all' && client.status !== activeFilter) {
      return false;
    }
  
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
      return fullName.includes(query);
    }
  
    return true;
  });

  const getFilterCount = (filter: FilterType) => {
    if (filter === 'all') return clients.length;
    return clients.filter(c => c.status === filter).length;
  };

  // Render appropriate card based on status
  const renderClientCard = (client: Client) => {
    const displayName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client';
    switch (client.status) {
      case 'need_followup':
        return (
          <ClientCardFollowUp
            key={client.id}
            clientId={client.id}
            fullName={displayName}
            avatarUrl={client.avatar_url}
            lastActiveDaysAgo={client.days_inactive}
            avgDailyCalories={client.baseline_avg_daily_calories}
            currentStreak={client.current_streak}
            onViewPress={() => router.push(`/clientDetail/${client.id}`)}
            onMessagePress={() => router.push(`/messageThread/${client.id}`)}
          />
        );

      case 'on_track':
        return (
          <ClientCardOnTrack
            key={client.id}
            clientId={client.id}
            fullName={displayName}
            avatarUrl={client.avatar_url}
            mealsLoggedToday={client.meals_logged_today}
            weeklyProgress={calculateWeeklyProgress()}
            avgDailyCalories={client.baseline_avg_daily_calories}
            currentStreak={client.current_streak}
            onViewProgressPress={() => router.push(`/clientDetail/${client.id}`)}
          />
        );

      case 'in_baseline':
        return (
          <ClientCardBaseline
            key={client.id}
            clientId={client.id}
            fullName={displayName}
            avatarUrl={client.avatar_url}
            mealsLoggedToday={client.meals_logged_today}
            baselineDaysCompleted={client.baseline_days_completed || 0}
            daysRemaining={client.baseline_days_remaining || 7}
            avgDailyCalories={client.baseline_avg_daily_calories}
            onViewProgressPress={() => router.push(`/clientDetail/${client.id}`)}
          />
        );

      default:
        return null;
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>All Clients</Text>
            <Text style={styles.subtitle}>
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContentContainer}
          >
            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
                All ({getFilterCount('all')})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'on_track' && styles.filterTabActive]}
              onPress={() => setActiveFilter('on_track')}
            >
              <Text style={[styles.filterText, activeFilter === 'on_track' && styles.filterTextActive]}>
                On Track ({getFilterCount('on_track')})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'in_baseline' && styles.filterTabActive]}
              onPress={() => setActiveFilter('in_baseline')}
            >
              <Text style={[styles.filterText, activeFilter === 'in_baseline' && styles.filterTextActive]}>
                Baseline ({getFilterCount('in_baseline')})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'need_followup' && styles.filterTabActive]}
              onPress={() => setActiveFilter('need_followup')}
            >
              <Text style={[styles.filterText, activeFilter === 'need_followup' && styles.filterTextActive]}>
                Follow-up ({getFilterCount('need_followup')})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Client List */}
          {filteredClients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {searchQuery.trim() ? 'No matching clients' : 'No clients in this category'}
              </Text>
              {searchQuery.trim() && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.emptyLink}>Clear search</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.clientList}>
              {filteredClients.map(renderClientCard)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.graphite,
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterContentContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: Colors.vividTeal,
    borderColor: Colors.vividTeal,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  clientList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.vividTeal,
    marginTop: 12,
  },
});