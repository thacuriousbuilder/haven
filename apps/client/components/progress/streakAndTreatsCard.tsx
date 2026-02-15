
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface StreakAndTreatsCardProps {
  currentStreak: number;
  treatDaysUsed: number;
}

export function StreakAndTreatsCard({ 
  currentStreak, 
  treatDaysUsed 
}: StreakAndTreatsCardProps) {
  return (
    <View style={styles.container}>
      {/* Streak Card */}
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="flame" size={48} color={Colors.energyOrange} />
          <View style={styles.streakBadge}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
          </View>
        </View>
        <Text style={styles.label}>Day Streak</Text>
      </View>

      {/* Treat Days Card */}
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <View style={styles.treatBadgeContainer}>
            <View style={styles.treatBadge}>
              <Text style={styles.treatNumber}>{treatDaysUsed}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.label}>Treat Days</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  streakBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: Colors.energyOrange,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.energyOrange,
  },
  treatBadgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F4F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treatBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.vividTeal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.energyOrange,
  },
  treatNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
});