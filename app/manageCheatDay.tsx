// app/manage-cheat-days.tsx

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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { PlannedCheatDay } from '@/types/database';

export default function ManageCheatDaysScreen() {
  const router = useRouter();
  const [cheatDays, setCheatDays] = useState<PlannedCheatDay[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Cheat Day',
      'Are you sure you want to remove this planned cheat day?',
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const renderCheatDay = ({ item }: { item: PlannedCheatDay }) => (
    <View style={styles.cheatDayCard}>
      <View style={styles.cheatDayInfo}>
        <Text style={styles.cheatDayDate}>{formatDate(item.cheat_date)}</Text>
        <Text style={styles.cheatDayCalories}>{item.planned_calories} calories</Text>
        {item.notes && (
          <Text style={styles.cheatDayNotes}>{item.notes}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#EF5350" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C4A52" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2C4A52" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Cheat Days</Text>
        <TouchableOpacity onPress={() => router.push('/plan-cheat-day')}>
          <Ionicons name="add-circle-outline" size={24} color="#2C4A52" />
        </TouchableOpacity>
      </View>

      {cheatDays.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No upcoming cheat days planned</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/planCheatDay')}
          >
            <Text style={styles.addButtonText}>Plan Your First Cheat Day</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cheatDays}
          renderItem={renderCheatDay}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#F5F1E8',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C4A52',
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
    alignItems: 'center',
  },
  cheatDayInfo: {
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
    marginBottom: 4,
  },
  cheatDayNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#2C4A52',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
