

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { PlannedCheatDay } from '@/types/database';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '@/constants/colors';
import { getLocalDateString } from '@/utils/timezone';

export default function ManageCheatDaysScreen() {
  const router = useRouter();
  const [cheatDays, setCheatDays] = useState<PlannedCheatDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalReserved, setTotalReserved] = useState(0);

  useEffect(() => {
    loadCheatDays();
  }, []);

  const loadCheatDays = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      
      const today = getLocalDateString();

      const { data, error } = await supabase
        .from('planned_cheat_days')
        .select('*')
        .eq('user_id', user.id)
        .gte('cheat_date', today)
        .order('cheat_date', { ascending: true });

      if (error) throw error;

      if (data) {
        setCheatDays(data);
        
        // Calculate total reserved
        const reserved = data.reduce(
          (sum, day) => sum + (day.planned_calories || 0),
          0
        );
        setTotalReserved(reserved);
      }
    } catch (error) {
      console.error('Error loading cheat days:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCheatDays();
  };

  const handleEdit = (item: PlannedCheatDay) => {
    router.push({
      pathname: '/editCheatDay',
      params: {
        id: item.id,
        date: item.cheat_date,
        calories: item.planned_calories.toString(),
        notes: item.notes || '',
      },
    });
  };

  const handleDelete = (id: string, date: string) => {
    Alert.alert(
      'Delete Cheat Day',
      `Are you sure you want to delete this cheat day for ${formatDateShort(date)}?`,
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

  
  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  // FIXED: Use local dates for comparison
  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(dateString + 'T00:00:00');
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    return `In ${diffDays} days`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={Colors.vividTeal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.circleBackButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Manage Cheat Days</Text>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/planCheatDay')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={28} color={Colors.graphite} />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>Total Reserved</Text>
          <Text style={styles.summaryValueLarge}>{totalReserved.toLocaleString()} cal</Text>
        </View>
        
        <View style={styles.summaryDivider} />
        
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>Cheat Days</Text>
          <Text style={styles.summaryValue}>{cheatDays.length}</Text>
        </View>
      </View>

      {cheatDays.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color={Colors.steelBlue} />
          <Text style={styles.emptyText}>No upcoming cheat days planned</Text>
          <Text style={styles.emptySubtext}>
            Plan ahead to stay on track with your weekly budget
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={() => router.push('/planCheatDay')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.emptyAddButtonText}>Plan Your First Cheat Day</Text>
          </TouchableOpacity>
        </View>
     ) : (
      <FlatList
        data={cheatDays}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          // FIXED: Parse date in local timezone
          const date = new Date(item.cheat_date + 'T00:00:00');
          const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
          const dayNum = date.getDate();
          const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][date.getMonth()];
          const daysUntil = getDaysUntil(item.cheat_date);

          return (
            <View style={styles.cheatDayCard}>
              <View style={styles.cheatDayContent}>
                {/* Left Side - Date */}
                <View style={styles.dateSection}>
                  <View style={styles.calendarIconCircle}>
                    <Ionicons name="calendar" size={20} color={Colors.vividTeal} />
                  </View>
                  <Text style={styles.dayNumber}>{dayNum}</Text>
                  <Text style={styles.monthText}>{month}</Text>
                </View>

                {/* Right Side - Details */}
                <View style={styles.detailsSection}>
                  <Text style={styles.dayName}>{dayName}</Text>
                  <Text style={styles.daysUntilText}>{daysUntil}</Text>
                  
                  <View style={styles.caloriesRow}>
                    <Ionicons name="flame" size={16} color={Colors.energyOrange} />
                    <Text style={styles.caloriesText}>
                      {item.planned_calories.toLocaleString()} cal
                    </Text>
                  </View>

                  {item.notes && (
                    <Text style={styles.notesText} numberOfLines={2}>
                      {item.notes}
                    </Text>
                  )}
                </View>
              </View>

              {/* Bottom Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEdit(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={18} color={Colors.graphite} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id, item.cheat_date)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={Colors.vividTeal}
          />
        }
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>UPCOMING CHEAT DAYS</Text>
        }
      />
    )}
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
    backgroundColor: Colors.lightCream,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.lightCream,
  },
  circleBackButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.vividTeal,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  addButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius:24,
    backgroundColor: Colors.white, 
    ...Shadows.small,   
  },

  // Summary Card
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    ...Shadows.medium,
  },
  summarySection: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xl,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  summaryValueLarge: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.vividTeal,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    textAlign: 'center',
  },

  // List Container
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  placeholderText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    ...Shadows.small,
  },
  emptyAddButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  // Section Title
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.steelBlue,
    letterSpacing: 0.8,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },

  // List Content
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  // Cheat Day Card
  cheatDayCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  cheatDayContent: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },

  // Date Section (Left)
  dateSection: {
    alignItems: 'center',
    marginRight: Spacing.xl,
    minWidth: 70,
    paddingTop: Spacing.xs,
  },
  calendarIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.tealOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  dayNumber: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.vividTeal,
    lineHeight: 36,
  },
  monthText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vividTeal,
    letterSpacing: 0.5,
  },

  // Details Section (Right)
  detailsSection: {
    flex: 1,
    justifyContent: 'center',
  },
  dayName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: Spacing.xs / 2,
  },
  daysUntilText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    marginBottom: Spacing.sm,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  caloriesText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.graphite,
  },
  notesText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },

  // Actions Row (Bottom)
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    flex: 1,
    marginRight: Spacing.sm,
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.graphite,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
});