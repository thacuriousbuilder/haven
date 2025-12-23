// app/(tabs)/home.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/bottomSheet';
import { FoodLogSheet } from '@/components/foodLogSheet';
import { checkBaselineProgress, completeBaseline, BaselineProgress } from '@/utils/baselineProgress';

interface ProfileData {
  baseline_start_date: string | null;
  baseline_complete: boolean;
}

interface FoodLog {
  id: string;
  food_name: string;
  calories: number | null;
  meal_type: string;
  log_date: string;
  created_at: string;
}

export default function HomeScreen() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState(0);
  const [showFoodLogSheet, setShowFoodLogSheet] = useState(false);
  const [recentLogs, setRecentLogs] = useState<FoodLog[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [baselineProgress, setBaselineProgress] = useState<BaselineProgress | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchRecentLogs();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/(auth)/welcome');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('baseline_start_date, baseline_complete')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      setProfile(data);
      
      // Check baseline progress
      const progress = await checkBaselineProgress(user.id);
      setBaselineProgress(progress);

      // Auto-complete baseline if ready
      if (progress.isComplete && !data.baseline_complete && progress.averageCalories) {
        const success = await completeBaseline(user.id, progress.averageCalories);
        if (success) {
          // Refresh profile data
          const { data: updatedData } = await supabase
            .from('profiles')
            .select('baseline_start_date, baseline_complete')
            .eq('id', user.id)
            .single();
          
          if (updatedData) {
            setProfile(updatedData);
          }
        }
      }
      
      // Calculate current baseline day
      if (data.baseline_start_date && !data.baseline_complete) {
        const startDate = new Date(data.baseline_start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setCurrentDay(Math.max(1, Math.min(diffDays, 7)));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setLoading(false);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('food_logs')
        .select('id, food_name, calories, meal_type, log_date, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recent logs:', error);
        return;
      }

      setRecentLogs(data || []);
    } catch (error) {
      console.error('Error in fetchRecentLogs:', error);
    }
  };

  const handleLogFood = () => {
    setShowFoodLogSheet(true);
  };

  const handleFoodLogSuccess = () => {
    setShowFoodLogSheet(false);
    fetchRecentLogs();
    fetchProfile(); // Refresh to check baseline progress
  };

  const handleCheckIn = () => {
    router.push('/dailyCheckin');
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
      case 'breakfast':
        return 'sunny-outline';
      case 'lunch':
        return 'partly-sunny-outline';
      case 'dinner':
        return 'moon-outline';
      case 'snack':
        return 'fast-food-outline';
      default:
        return 'restaurant-outline';
    }
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const displayedLogs = showAllLogs ? recentLogs : recentLogs.slice(0, 3);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3D5A5C" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBaselineActive = profile.baseline_start_date && !profile.baseline_complete;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle} />
          <Text style={styles.logo}>HAVEN</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {isBaselineActive ? (
            <>
              {/* Baseline Learning Phase */}
              <View style={styles.greetingSection}>
                <Text style={styles.greeting}>Building your baseline</Text>
                <Text style={styles.subGreeting}>
                  Just eat normally. We're learning your patterns.
                </Text>
              </View>

              {/* Day Counter - Updated with actual progress */}
              <View style={styles.dayCard}>
                <View style={styles.dayCircle}>
                  <Text style={styles.dayNumber}>{baselineProgress?.daysLogged || 0}</Text>
                  <Text style={styles.dayLabel}>of 7</Text>
                </View>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayTitle}>
                    {baselineProgress?.daysLogged === 7 
                      ? 'Baseline Complete!' 
                      : `Day ${currentDay}`}
                  </Text>
                  <Text style={styles.dayDescription}>
                    {baselineProgress?.daysLogged === 7
                      ? 'Great work! Building your plan...'
                      : `${baselineProgress?.daysLogged || 0} days logged, ${7 - (baselineProgress?.daysLogged || 0)} to go`}
                  </Text>
                </View>
              </View>

              {/* Progress Dots - Updated with actual progress */}
              <View style={styles.progressContainer}>
                <View style={styles.progressDots}>
                  {Array.from({ length: 7 }).map((_, index) => (
                    <View key={index} style={styles.dotWrapper}>
                      <View
                        style={[
                          styles.progressDot,
                          index < (baselineProgress?.daysLogged || 0) && styles.progressDotActive
                        ]}
                      />
                      <Text style={styles.dotLabel}>{index + 1}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Main CTA */}
              <TouchableOpacity 
                style={styles.logFoodButton}
                onPress={handleLogFood}
                activeOpacity={0.8}
              >
                <Ionicons name="restaurant" size={28} color="#FFFFFF" />
                <Text style={styles.logFoodText}>Log Today's Food</Text>
              </TouchableOpacity>

              {/* Daily Check-in Button */}
              <TouchableOpacity 
                style={styles.checkInButton}
                onPress={handleCheckIn}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#3D5A5C" />
                <Text style={styles.checkInText}>Daily Check-in</Text>
              </TouchableOpacity>

              {/* Recently Logged Section */}
              {recentLogs.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.recentTitle}>Recently logged</Text>
                  {displayedLogs.map((log) => (
                    <View key={log.id} style={styles.logCard}>
                      <View style={styles.logHeader}>
                        <View style={styles.logHeaderLeft}>
                          <Ionicons 
                            name={getMealIcon(log.meal_type) as any} 
                            size={20} 
                            color="#3D5A5C" 
                          />
                          <Text style={styles.logFood}>{log.food_name}</Text>
                        </View>
                        <Text style={styles.logTime}>{formatTime(log.created_at)}</Text>
                      </View>
                      <View style={styles.logFooter}>
                        <Text style={styles.mealTypeLabel}>{capitalizeFirst(log.meal_type)}</Text>
                        {log.calories && (
                          <View style={styles.logCalories}>
                            <Text style={styles.caloriesNumber}>{log.calories}</Text>
                            <Text style={styles.caloriesLabel}>cal</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}

                  {/* Show More/Less Button */}
                  {recentLogs.length > 3 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => setShowAllLogs(!showAllLogs)}
                    >
                      <Text style={styles.showMoreText}>
                        {showAllLogs ? 'Show less' : `Show more (${recentLogs.length - 3})`}
                      </Text>
                      <Ionicons 
                        name={showAllLogs ? 'chevron-up' : 'chevron-down'} 
                        size={16} 
                        color="#3D5A5C" 
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Info Card */}
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={24} color="#3D5A5C" />
                <Text style={styles.infoText}>
                  No judgment. No restrictions. We're just learning how you normally eat so we can build a realistic plan.
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Post-Baseline: Show placeholder for future dashboard */}
              <View style={styles.greetingSection}>
                <Text style={styles.greeting}>Baseline Complete! 🎉</Text>
                <Text style={styles.subGreeting}>
                  {baselineProgress?.averageCalories 
                    ? `Your average: ${baselineProgress.averageCalories} calories/day`
                    : 'Building your personalized plan...'}
                </Text>
              </View>

              <View style={styles.comingSoonCard}>
                <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
                <Text style={styles.comingSoonTitle}>Your Plan is Ready</Text>
                <Text style={styles.comingSoonText}>
                  Weekly calorie bank, balance metrics, and planning tools coming soon!
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.logFoodButton}
                onPress={handleLogFood}
                activeOpacity={0.8}
              >
                <Ionicons name="restaurant" size={28} color="#FFFFFF" />
                <Text style={styles.logFoodText}>Log Food</Text>
              </TouchableOpacity>

              {/* Recently Logged Section (post-baseline) */}
              {recentLogs.length > 0 && (
                <View style={styles.recentSection}>
                  <Text style={styles.recentTitle}>Recently logged</Text>
                  {displayedLogs.map((log) => (
                    <View key={log.id} style={styles.logCard}>
                      <View style={styles.logHeader}>
                        <View style={styles.logHeaderLeft}>
                          <Ionicons 
                            name={getMealIcon(log.meal_type) as any} 
                            size={20} 
                            color="#3D5A5C" 
                          />
                          <Text style={styles.logFood}>{log.food_name}</Text>
                        </View>
                        <Text style={styles.logTime}>{formatTime(log.created_at)}</Text>
                      </View>
                      <View style={styles.logFooter}>
                        <Text style={styles.mealTypeLabel}>{capitalizeFirst(log.meal_type)}</Text>
                        {log.calories && (
                          <View style={styles.logCalories}>
                            <Text style={styles.caloriesNumber}>{log.calories}</Text>
                            <Text style={styles.caloriesLabel}>cal</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}

                  {/* Show More/Less Button */}
                  {recentLogs.length > 3 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => setShowAllLogs(!showAllLogs)}
                    >
                      <Text style={styles.showMoreText}>
                        {showAllLogs ? 'Show less' : `Show more (${recentLogs.length - 3})`}
                      </Text>
                      <Ionicons 
                        name={showAllLogs ? 'chevron-up' : 'chevron-down'} 
                        size={16} 
                        color="#3D5A5C" 
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Food Log Bottom Sheet */}
      <BottomSheet
        visible={showFoodLogSheet}
        onClose={() => setShowFoodLogSheet(false)}
        title="Log Food"
        height={0.75}
      >
        <FoodLogSheet onSuccess={handleFoodLogSuccess} />
      </BottomSheet>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#3D5A5C',
    backgroundColor: 'transparent',
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  greetingSection: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E09B7B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dayLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  dayDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dotWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#E09B7B',
  },
  dotLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  logFoodButton: {
    backgroundColor: '#3D5A5C',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logFoodText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkInButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#3D5A5C',
  },
  checkInText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  recentSection: {
    marginBottom: 24,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 16,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  logFood: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    flex: 1,
  },
  logTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTypeLabel: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F5F1E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logCalories: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  caloriesNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  caloriesLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D5A5C',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  comingSoonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3D5A5C',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});