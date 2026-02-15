

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@haven/shared-utils';
import { PlannedCheatDay } from '@haven/shared-types';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '@/constants/colors';
import { getLocalDateString } from '@haven/shared-utils';

export default function PlanScreen() {
  const router = useRouter();
  const [cheatDays, setCheatDays] = useState<PlannedCheatDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalReserved, setTotalReserved] = useState(0);
  const [isInBaseline, setIsInBaseline] = useState(false);
  const [baselineProgress, setBaselineProgress] = useState({ daysLogged: 0, daysNeeded: 7 });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    checkBaselineStatus();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh data whenever screen comes into focus
      loadData();
      checkBaselineStatus();
    }, [])
  );

  const checkBaselineStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('baseline_complete, baseline_start_date')
        .eq('id', user.id)
        .single();

      if (profile && !profile.baseline_complete) {
        setIsInBaseline(true);

        const baselineStartDate = profile.baseline_start_date;
        const { data: dailySummaries } = await supabase
          .from('daily_summaries')
          .select('summary_date')
          .eq('user_id', user.id)
          .gte('summary_date', baselineStartDate)
          .order('summary_date', { ascending: true });

        const daysLogged = dailySummaries?.length || 0;
        setBaselineProgress({ daysLogged, daysNeeded: 7 });
      } else {
        setIsInBaseline(false);
      }
    } catch (error) {
      console.error('Error checking baseline status:', error);
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use local date string consistently
      const today = getLocalDateString();

      const { data: cheatDaysData } = await supabase
        .from('planned_cheat_days')
        .select('*')
        .eq('user_id', user.id)
        .gte('cheat_date', today)
        .order('cheat_date', { ascending: true });

      if (cheatDaysData) {
        setCheatDays(cheatDaysData);
        
        const reserved = cheatDaysData.reduce(
          (sum, day) => sum + (day.planned_calories || 0),
          0
        );
        setTotalReserved(reserved);
      }
    } catch (error) {
      console.error('Error loading plan data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCheatDayDate = (dateString: string) => {
    // CRITICAL: Append T00:00:00 to force local timezone interpretation
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const month = months[date.getMonth()];
    const dayNum = date.getDate();
    
    return {
      dayName,
      dateStr: `${month} ${dayNum}`,
    };
  };

  const handleDeleteCheatDay = async (cheatDayId: string) => {
    Alert.alert(
      'Delete "Cheat" Day',
      'Are you sure you want to delete this planned "cheat" day?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('planned_cheat_days')
                .delete()
                .eq('id', cheatDayId);

              if (error) throw error;

              loadData();
            } catch (error) {
              console.error('Error deleting cheat day:', error);
              Alert.alert('Error', 'Failed to delete "cheat" day. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditCheatDay = (cheatDay: PlannedCheatDay) => {
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.vividTeal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Plan</Text>
          <Text style={styles.subtitle}>Manage your weekly "cheat" days</Text>
        </View>

        {/* Baseline Banner */}
        {isInBaseline && (
          <View style={styles.baselineBanner}>
            <View style={styles.bannerContent}>
              <Ionicons name="lock-closed" size={24} color={Colors.energyOrange} />
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Complete your baseline week first</Text>
                <Text style={styles.bannerSubtitle}>
                  Track {baselineProgress.daysNeeded - baselineProgress.daysLogged} more{' '}
                  {baselineProgress.daysNeeded - baselineProgress.daysLogged === 1 ? 'day' : 'days'} to unlock "cheat" day planning
                </Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(baselineProgress.daysLogged / baselineProgress.daysNeeded) * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Stat Cards Row */}
        <View style={styles.statCardsRow}>
          {/* Planned Days Card */}
          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.tealOverlay }]}>
              <Ionicons name="calendar" size={24} color={Colors.vividTeal} />
            </View>
            <Text style={styles.statNumber}>{cheatDays.length}</Text>
            <Text style={styles.statLabel}>Planned Days</Text>
          </View>

          {/* Reserved Cal Card */}
          <View style={styles.statCard}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.orangeOverlay }]}>
              <Ionicons name="flame" size={24} color={Colors.energyOrange} />
            </View>
            <Text style={styles.statNumber}>{totalReserved.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Reserved Cal</Text>
          </View>
        </View>

        {/* Empty State or Cheat Days List */}
        {cheatDays.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar" size={40} color={Colors.steelBlue} />
            </View>
            <Text style={styles.emptyStateText}>No "cheat" days planned yet</Text>
          </View>
        ) : (
          <View style={styles.cheatDaysList}>
            {cheatDays.map((cheatDay) => {
              const { dayName, dateStr } = formatCheatDayDate(cheatDay.cheat_date);
              
              return (
                <View key={cheatDay.id} style={styles.cheatDayCard}>
                  <View style={styles.cheatDayLeft}>
                    <View style={styles.partyIconCircle}>
                      <Ionicons name="pizza" size={24} color={Colors.energyOrange} />
                    </View>
                    <View style={styles.cheatDayInfo}>
                      <Text style={styles.cheatDayName}>{dayName}</Text>
                      <Text style={styles.cheatDayDetails}>
                        {dateStr} • {cheatDay.planned_calories.toLocaleString()} cal budget
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.cheatDayActions}>
                    <TouchableOpacity
                      onPress={() => handleEditCheatDay(cheatDay)}
                      style={styles.actionButton}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="pencil" size={20} color={Colors.steelBlue} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCheatDay(cheatDay.id)}
                      style={styles.actionButton}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="trash" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.primaryButton, isInBaseline && styles.primaryButtonDisabled]}
          onPress={() => {
            if (isInBaseline) {
              Alert.alert(
                'Complete Baseline First',
                'Finish tracking your baseline week to unlock "cheat" day planning.'
              );
            } else {
              router.push('/planCheatDay');
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
          <Text style={styles.primaryButtonText}>Plan "Cheat" Day</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, isInBaseline && styles.secondaryButtonDisabled]}
          onPress={() => {
            if (isInBaseline) {
              Alert.alert(
                'Complete Baseline First',
                'Finish tracking your baseline week to unlock "cheat" day planning.'
              );
            } else {
              router.push('/manageCheatDay');
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="list" size={20} color={Colors.vividTeal} />
          <Text style={styles.secondaryButtonText}>Manage All ({cheatDays.length})</Text>
        </TouchableOpacity>

        {/* Planning Tips Card */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={Colors.energyOrange} />
            <Text style={styles.tipsTitle}>Planning Tips</Text>
          </View>
          <View style={styles.tipsList}>
            <Text style={styles.tipText}>
              • Plan "cheat" days in advance to help HAVEN adjust your weekly budget
            </Text>
            <Text style={styles.tipText}>
              • Don't feel guilty - "cheat" days are part of the plan!
            </Text>
          </View>
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  
  // Header
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.steelBlue,
  },

  // Baseline Banner
  baselineBanner: {
    backgroundColor: Colors.orangeOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.energyOrange + '40',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  bannerText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  bannerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: Spacing.xs / 2,
  },
  bannerSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.white,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.energyOrange,
    borderRadius: 3,
  },

  // Stat Cards
  statCardsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.small,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  statNumber: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
  },

  // Empty State
  emptyStateCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxxl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightCream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    color: Colors.steelBlue,
    textAlign: 'center',
  },

  // Cheat Day Cards
  cheatDaysList: {
    marginBottom: Spacing.lg,
  },
  cheatDayCard: {
    backgroundColor: Colors.orangeOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.energyOrange + '20',
  },
  cheatDayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  partyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cheatDayInfo: {
    flex: 1,
  },
  cheatDayName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: Spacing.xs / 2,
  },
  cheatDayDetails: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
  },
  cheatDayActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
  },

  // Buttons
  primaryButton: {
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.steelBlue,
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginLeft: Spacing.sm,
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  secondaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    color: Colors.vividTeal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.sm,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: Colors.orangeOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.energyOrange + '20',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginLeft: Spacing.sm,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.graphite,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
  },
});