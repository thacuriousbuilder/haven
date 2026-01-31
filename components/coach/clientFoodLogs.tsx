

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface FoodLog {
  id: string;
  food_name: string;
  calories: number | null;
  meal_type: string;
  log_date: string;
  created_at: string;
}

interface ClientFoodLogsProps {
  foodLogs: FoodLog[];
  availableDates: string[]; // Array of dates that have logs
  onFoodPress?: (foodId: string) => void; 
}

export function ClientFoodLogs({ foodLogs, availableDates, onFoodPress  }: ClientFoodLogsProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    availableDates.length > 0 ? availableDates[0] : ''
  );

  // Filter logs for selected date
  const logsForDate = foodLogs.filter(log => log.log_date === selectedDate);

  // Calculate total calories for selected date
  const totalCalories = logsForDate.reduce((sum, log) => sum + (log.calories || 0), 0);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
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
      case 'breakfast': return 'sunny';
      case 'lunch': return 'partly-sunny';
      case 'dinner': return 'moon';
      case 'snack': return 'fast-food';
      default: return 'restaurant';
    }
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (availableDates.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Recent Food Logs</Text>
        <View style={styles.emptyState}>
          <Ionicons name="restaurant" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No food logs yet</Text>
          <Text style={styles.emptyDescription}>
            Client hasn't logged any meals recently
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Food Logs</Text>

      {/* Day Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateFilterContainer}
        contentContainerStyle={styles.dateFilterContent}
      >
        {availableDates.map((date) => (
          <TouchableOpacity
            key={date}
            style={[
              styles.dateTab,
              selectedDate === date && styles.dateTabActive
            ]}
            onPress={() => setSelectedDate(date)}
          >
            <Text style={[
              styles.dateTabText,
              selectedDate === date && styles.dateTabTextActive
            ]}>
              {formatDate(date)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Total Calories for Selected Day */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalCalories}>{totalCalories.toLocaleString()} cal</Text>
      </View>

      {/* Food Logs List */}

<View style={styles.logsList}>
  {logsForDate.map((log) => (
    <TouchableOpacity 
      key={log.id} 
      style={styles.logCard}
      onPress={() => onFoodPress?.(log.id)}
      activeOpacity={0.7}
      disabled={!onFoodPress}
    >
      <View style={styles.logLeft}>
        <View style={styles.mealIconContainer}>
          <Ionicons 
            name={getMealIcon(log.meal_type) as any} 
            size={20} 
            color={Colors.vividTeal} 
          />
        </View>
        <View style={styles.logInfo}>
          <Text style={styles.logFood}>{log.food_name}</Text>
          <Text style={styles.logMeta}>
            {capitalizeFirst(log.meal_type)} • {formatTime(log.created_at)}
          </Text>
        </View>
      </View>
      <View style={styles.logRight}>
        <Text style={styles.logCalories}>{log.calories || 0}</Text>
        <Text style={styles.logCaloriesLabel}>cal</Text>
      </View>
    </TouchableOpacity>
  ))}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 16,
  },
  dateFilterContainer: {
    marginBottom: 16,
  },
  dateFilterContent: {
    gap: 8,
  },
  dateTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  dateTabActive: {
    backgroundColor: Colors.vividTeal,
    borderColor: Colors.vividTeal,
  },
  dateTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dateTabTextActive: {
    color: '#FFFFFF',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
  },
  totalCalories: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.vividTeal,
  },
  logsList: {
    gap: 12,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
  },
  logFood: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 4,
  },
  logMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  logRight: {
    alignItems: 'flex-end',
  },
  logCalories: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.graphite,
  },
  logCaloriesLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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