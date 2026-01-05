

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
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Client {
  id: string;
  full_name: string | null;
  current_streak: number;
  baseline_start_date: string | null;
  baseline_complete: boolean;
  last_log_time: string | null;
  meals_today: number;
  balance_score: number | null;
  status: 'needs_attention' | 'on_track' | 'baseline';
  baseline_day: number | null;
}

type FilterType = 'all' | 'on_track' | 'baseline' | 'needs_attention';

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

      const { data: clientProfiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, current_streak, baseline_start_date, baseline_complete')
        .eq('trainer_id', user.id)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching clients:', error);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!clientProfiles || clientProfiles.length === 0) {
        setClients([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // For each client, get their today's logs
      const today = new Date().toISOString().split('T')[0];
      const clientStatuses: Client[] = [];

      for (const client of clientProfiles) {
        const { data: todayLogs } = await supabase
          .from('food_logs')
          .select('created_at')
          .eq('user_id', client.id)
          .gte('log_date', today)
          .order('created_at', { ascending: false });

        const mealsToday = todayLogs?.length || 0;
        const lastLogTime = todayLogs?.[0]?.created_at || null;

        // Determine status
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
          current_streak: client.current_streak || 0,
          baseline_start_date: client.baseline_start_date,
          baseline_complete: client.baseline_complete,
          last_log_time: lastLogTime,
          meals_today: mealsToday,
          balance_score: null,
          status,
          baseline_day: baselineDay,
        });
      }

      setClients(clientStatuses);
    } catch (error) {
      console.error('Error in fetchClients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'needs_attention': return '#EF4444';
      case 'baseline': return '#F59E0B';
      case 'on_track': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'needs_attention': return '#FEE2E2';
      case 'baseline': return '#FEF3C7';
      case 'on_track': return '#D1FAE5';
      default: return '#F3F4F6';
    }
  };

  const getStatusText = (client: Client) => {
    if (client.status === 'baseline') {
      return `Day ${client.baseline_day} of 7`;
    }
    if (client.status === 'needs_attention') {
      return client.meals_today === 0 ? 'No logs' : `${client.meals_today} meal${client.meals_today !== 1 ? 's' : ''}`;
    }
    return `${client.meals_today} meals`;
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
      const name = (client.full_name || 'client').toLowerCase();
      return name.includes(query);
    }

    return true;
  });

  const getFilterCount = (filter: FilterType) => {
    if (filter === 'all') return clients.length;
    return clients.filter(c => c.status === filter).length;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3D5A5C" />
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
              style={[styles.filterTab, activeFilter === 'baseline' && styles.filterTabActive]}
              onPress={() => setActiveFilter('baseline')}
            >
              <Text style={[styles.filterText, activeFilter === 'baseline' && styles.filterTextActive]}>
                Baseline ({getFilterCount('baseline')})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'needs_attention' && styles.filterTabActive]}
              onPress={() => setActiveFilter('needs_attention')}
            >
              <Text style={[styles.filterText, activeFilter === 'needs_attention' && styles.filterTextActive]}>
                Needs Attention ({getFilterCount('needs_attention')})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Client List */}
          {filteredClients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
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
              {filteredClients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={styles.clientCard}
                  onPress={() => {
                    router.push(`/clientDetail/${client.id}`);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.clientHeader}>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>
                        {client.full_name || 'Client'}
                      </Text>
                      <Text style={styles.clientTime}>
                        Last: {getTimeSinceLog(client.last_log_time)}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: getStatusBgColor(client.status) }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(client.status) }
                      ]}>
                        {getStatusText(client)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.clientFooter}>
                    <View style={styles.clientMeta}>
                      {client.current_streak > 0 && (
                        <View style={styles.metaBadge}>
                          <Ionicons name="flash" size={14} color="#E09B7B" />
                          <Text style={styles.metaText}>{client.current_streak} day streak</Text>
                        </View>
                      )}
                      {client.status === 'on_track' && (
                        <View style={styles.metaBadge}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                          <Text style={styles.metaText}>On track</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              ))}
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
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
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
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#3D5A5C',
  },
  filterContainer: {
    marginBottom: 24,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: '#3D5A5C',
    borderColor: '#3D5A5C',
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
    gap: 12,
  },
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  clientTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
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
    color: '#3D5A5C',
    marginTop: 12,
  },
});