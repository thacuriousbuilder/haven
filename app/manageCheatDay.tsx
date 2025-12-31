// app/manageCheatDay.tsx (REPLACE entire file)

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { PlannedCheatDay } from '@/types/database';

export default function ManageCheatDaysScreen() {
  const router = useRouter();
  const [cheatDays, setCheatDays] = useState<PlannedCheatDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCheatDays();
  }, []);

  const loadCheatDays = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('planned_cheat_days')
        .select('*')
        .eq('user_id', user.id)
        .gte('cheat_date', today)
        .order('cheat_date', { ascending: true });

      if (error) throw error;

      setCheatDays(data || []);
    } catch (error) {
      console.error('Error loading cheat days:', error);
      Alert.alert('Error', 'Failed to load cheat days');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCheatDays();
  };

  const handleEdit = (cheatDay: PlannedCheatDay) => {
    router.push({
      pathname: '/editCheatDay',
      params: {
        id: cheatDay.id,
        date: cheatDay.cheat_date,
        calories: cheatDay.planned_calories.toString(),
        notes: cheatDay.notes || '',
      },
    });
  };

  const handleDelete = async (id: string, date: string) => {
    Alert.alert(
      'Delete Cheat Day',
      `Remove planned cheat day for ${formatDate(new Date(date))}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('planned_cheat_days')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Success', 'Cheat day removed');
              loadCheatDays();
            } catch (error) {
              console.error('Error deleting cheat day:', error);
              Alert.alert('Error', 'Failed to delete cheat day');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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

  const renderCheatDay = ({ item }: { item: PlannedCheatDay }) => (
    <View style={styles.cheatDayCard}>
      <View style={styles.cheatDayContent}>
        <View style={styles.cheatDayHeader}>
          <Text style={styles.cheatDayDate}>{formatDate(new Date(item.cheat_date))}</Text>
          <Text style={styles.daysUntil}>{getDaysUntil(item.cheat_date)}</Text>
        </View>
        
        <View style={styles.cheatDayDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="flame-outline" size={16} color="#666" />
            <Text style={styles.cheatDayCalories}>{item.planned_calories} calories</Text>
          </View>
          
          {item.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color="#666" />
              <Text style={styles.cheatDayNotes} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil-outline" size={20} color="#2C4A52" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id, item.cheat_date)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF5350" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C4A52" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2C4A52" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Cheat Days</Text>
        <TouchableOpacity onPress={() => router.push('/planCheatDay')}>
          <Ionicons name="add-circle-outline" size={24} color="#2C4A52" />
        </TouchableOpacity>
      </View>

      {cheatDays.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No upcoming cheat days planned</Text>
          <Text style={styles.emptySubtext}>
            Plan ahead to stay on track with your weekly budget
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/planCheatDay')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Plan Your First Cheat Day</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cheatDays}
          renderItem={renderCheatDay}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>
                {cheatDays.length} {cheatDays.length === 1 ? 'cheat day' : 'cheat days'} planned
              </Text>
            </View>
          }
        />
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F1E8',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C4A52',
  },
  listHeader: {
    paddingBottom: 12,
  },
  listHeaderText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
  },
  cheatDayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cheatDayContent: {
    flex: 1,
  },
  cheatDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cheatDayDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C4A52',
  },
  daysUntil: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cheatDayDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cheatDayCalories: {
    fontSize: 14,
    color: '#666',
  },
  cheatDayNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F1E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C4A52',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C4A52',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});