
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/card';
import { SectionHeader } from './ui/sectionHeader';

interface CoachData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  title?: string; // e.g., "Nutrition Coach"
}

interface MyCoachCardProps {
  coach: CoachData;
  onMessagePress: () => void;
  onCardPress: () => void;
}

export const MyCoachCard: React.FC<MyCoachCardProps> = ({
  coach,
  onMessagePress,
  onCardPress,
}) => {
  // Get initials from coach name
  const getInitials = (name: string): string => {
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <>
      <SectionHeader title="My Coach" />
      <Card style={styles.card}>
        <TouchableOpacity 
          style={styles.coachRow}
          onPress={onCardPress}
          activeOpacity={0.7}
        >
          <View style={styles.leftContent}>
            {coach.avatar_url ? (
              <Image 
                source={{ uri: coach.avatar_url }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.initials}>
                  {getInitials(coach.full_name)}
                </Text>
              </View>
            )}
            
            <View style={styles.coachInfo}>
              <Text style={styles.coachName}>{coach.full_name}</Text>
              <Text style={styles.coachTitle}>
                {coach.title || 'Nutrition Coach'}
              </Text>
            </View>
          </View>

          <View style={styles.rightContent}>
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={onMessagePress}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#206E6B" />
            </TouchableOpacity>
            
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F4F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 18,
    fontWeight: '600',
    color: '#206E6B',
  },
  coachInfo: {
    marginLeft: 12,
    flex: 1,
  },
  coachName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  coachTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
});