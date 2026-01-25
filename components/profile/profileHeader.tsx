

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileHeaderProps {
  fullName: string;
  email: string;
  currentStreak: number;
  currentWeight: number | null;
  weightUnit: 'lbs' | 'kg';
  goal: 'lose' | 'maintain' | 'gain' | null;
  targetWeight: number | null;
  userType?: 'client' | 'trainer';
  totalClients?: number; 
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  fullName,
  email,
  currentStreak,
  currentWeight,
  weightUnit,
  goal,
  targetWeight,
  userType = 'client',
  totalClients = 0,
}) => {
  // Get initials from full name
  const getInitials = (name: string): string => {
    if (!name || name.trim() === '') return '?';
    
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Format goal for display
  const formatGoal = (goal: 'lose' | 'maintain' | 'gain' | null): string => {
    if (!goal) return '';
    switch (goal) {
      case 'lose':
        return 'Lose Weight';
      case 'maintain':
        return 'Maintain';
      case 'gain':
        return 'Gain Weight';
      default:
        return '';
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initials}>{getInitials(fullName)}</Text>
          </View>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.name}>{fullName || 'User'}</Text>
          <Text style={styles.email}>{email}</Text>
          
          {/* Show different metrics based on user type */}
          {userType === 'trainer' ? (
            // Trainer view - show only total clients
            <View style={styles.metricsContainer}>
              <View style={styles.clientsContainer}>
                <Ionicons name="people" size={16} color="#FFFFFF" />
                <Text style={styles.clientsText}>
                  {totalClients} {totalClients === 1 ? 'client' : 'clients'}
                </Text>
              </View>
            </View>
          ) : (
            // Client view - show weight, goal, streak
            <View style={styles.metricsContainer}>
              {currentWeight !== null && (
                <View style={styles.weightContainer}>
                  <Ionicons name="scale-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.weightText}>
                    {Math.round(currentWeight)} {weightUnit}
                  </Text>
                </View>
              )}
              {goal && (
                <View style={styles.goalContainer}>
                  <Ionicons name="flag-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.goalText}>
                    {formatGoal(goal)}
                    {targetWeight !== null && (
                      <Text style={styles.targetWeightText}>
                        {' '}→ {Math.round(targetWeight)} {weightUnit}
                      </Text>
                    )}
                  </Text>
                </View>
              )}
              <View style={styles.streakContainer}>
                <Ionicons name="flame" size={16} color="#EF7828" />
                <Text style={styles.streakText}>{currentStreak} day streak</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#206E6B',
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  initials: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  // Trainer-specific styles
  clientsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Client-specific styles
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weightText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  goalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  targetWeightText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});