import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { BackButton } from '@/components/onboarding/backButton';
import { Colors } from '@/constants/colors';

export default function PlanCheatDayScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [plannedCalories, setPlannedCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [baselineAverage, setBaselineAverage] = useState<number>(0);
  const [recommendedCalories, setRecommendedCalories] = useState<number>(0);
  const [useRecommended, setUseRecommended] = useState<boolean>(true);

// Fetch smart recommended calories based on weekly progress
React.useEffect(() => {
  const fetchSmartRecommendation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      // Get the active weekly period that contains today
      const { data: weeklyPeriod } = await supabase
        .from('weekly_periods')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_type', 'active')
        .eq('status', 'active')
        .lte('week_start_date', today)
        .gte('week_end_date', today)
        .single();

      if (!weeklyPeriod) {
        console.log('No active weekly period found');
        return;
      }

      const weekStartDate = weeklyPeriod.week_start_date;
      const weekEndDate = weeklyPeriod.week_end_date;
      const weeklyBudget = weeklyPeriod.weekly_budget;

      // Get total calories consumed so far this week
      const { data: weekSummaries } = await supabase
        .from('daily_summaries')
        .select('calories_consumed')
        .eq('user_id', user.id)
        .gte('summary_date', weekStartDate)
        .lte('summary_date', today);

      const totalConsumed = weekSummaries?.reduce(
        (sum, day) => sum + (day.calories_consumed || 0),
        0
      ) || 0;

      // Get other planned cheat days for this week (excluding the date we're planning)
      const { data: otherCheatDays } = await supabase
        .from('planned_cheat_days')
        .select('planned_calories, cheat_date')
        .eq('user_id', user.id)
        .gte('cheat_date', today)
        .lte('cheat_date', weekEndDate);

      // Calculate total reserved for other cheat days
      const totalReservedOther = otherCheatDays?.reduce(
        (sum, day) => {
          // Don't include the date we're currently planning (if editing)
          if (selectedDate && day.cheat_date === selectedDate.toISOString().split('T')[0]) {
            return sum;
          }
          return sum + (day.planned_calories || 0);
        },
        0
      ) || 0;

      // Calculate days left in week (including today)
      const todayDate = new Date(today + 'T00:00:00');
      const endDate = new Date(weekEndDate + 'T23:59:59');
      const daysLeft = Math.max(1, Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      // Calculate available calories
      const availableCalories = weeklyBudget - totalConsumed - totalReservedOther;
      
      // Calculate recommended calories per remaining day
      const recommended = Math.round(availableCalories / daysLeft);

      // Set baseline average for display purposes
      setBaselineAverage(weeklyPeriod.baseline_average_daily || 0);
      setRecommendedCalories(recommended > 0 ? recommended : 0);
      
      // Pre-fill with recommended value
      if (recommended > 0) {
        setPlannedCalories(recommended.toString());
        setUseRecommended(true);
      }

    } catch (error) {
      console.error('Error fetching smart recommendation:', error);
    }
  };

  fetchSmartRecommendation();
}, [selectedDate]); // Re-calculate when selected date changes

  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return {
      dayName: days[date.getDay()],
      dayNum: date.getDate(),
      month: months[date.getMonth()],
    };
  };

  const handleSave = async () => {
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    if (!plannedCalories || parseInt(plannedCalories) <= 0) {
      Alert.alert('Error', 'Please enter planned calories');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const cheatDate = selectedDate.toISOString().split('T')[0];
      
      // Use the value from plannedCalories (whether recommended or custom)
      const caloriesToSave = parseInt(plannedCalories);

      const { error } = await supabase
        .from('planned_cheat_days')
        .upsert({
          user_id: user.id,
          cheat_date: cheatDate,
          planned_calories: caloriesToSave,
          notes: notes || null,
        }, {
          onConflict: 'user_id,cheat_date'
        });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Cheat day planned!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving cheat day:', error);
      Alert.alert('Error', 'Failed to save cheat day');
    } finally {
      setLoading(false);
    }
  };

  const days = getNext7Days();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Plan Cheat Day</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle-outline" size={24} color="#206E6B" />
          <View style={styles.instructionsTextContainer}>
            <Text style={styles.instructionsTitle}>How it works</Text>
            <Text style={styles.instructionsText}>
              Select a future date for your cheat day. HAVEN will automatically adjust your weekly budget to accommodate extra calories.
            </Text>
          </View>
        </View>

        {/* Date Selection */}
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
          contentContainerStyle={styles.dateScrollContent}
        >
          {days.map((date, index) => {
            const formatted = formatDate(date);
            const isSelected = selectedDate?.toDateString() === date.toDateString();

            return (
              <TouchableOpacity
                key={index}
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                  {formatted.dayName}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>
                  {formatted.dayNum}
                </Text>
                <Text style={[styles.monthName, isSelected && styles.monthNameSelected]}>
                  {formatted.month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
          {/* Recommended Calories */}
        <Text style={styles.sectionTitle}>Recommended Calories</Text>
        <View style={styles.recommendedCard}>
          <View style={styles.recommendedContent}>
            <View style={styles.recommendedLeft}>
              <View style={styles.sparkleIconCircle}>
                <Ionicons name="sparkles" size={20} color="#EF7828" />
              </View>
              <View style={styles.recommendedInfo}>
                <Text style={styles.recommendedCalories}>
                  {recommendedCalories.toLocaleString()} <Text style={styles.calText}>cal</Text>
                </Text>
                <Text style={styles.recommendedSubtext}>
                  Based on your weekly budget and progress
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.checkmarkCircle,
                useRecommended && styles.checkmarkCircleActive
              ]}
              onPress={() => {
                setPlannedCalories(recommendedCalories.toString());
                setUseRecommended(true);
              }}
              activeOpacity={0.6}
            >
              <Ionicons 
                name={useRecommended ? "checkmark-circle" : "checkmark"} 
                size={24} 
                color="#206E6B" 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.recommendedFooter}>
            <Ionicons name="information-circle-outline" size={16} color="#687C88" />
            <Text style={styles.recommendedFooterText}>
              This recommendation keeps you on track to hit your weekly budget. It accounts for what you've eaten so far and any other planned cheat days this week.
            </Text>
          </View>
        </View>

        {/* Manual Calories Input (Optional Override) */}
       {/* Manual Calories Input (Optional Override) */}
       <Text style={styles.sectionTitle}>Custom Amount (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 2500"
          keyboardType="number-pad"
          value={plannedCalories}
          onChangeText={(text) => {
            setPlannedCalories(text);
            // If user types anything, switch to custom mode
            if (text !== recommendedCalories.toString()) {
              setUseRecommended(false);
            }
          }}
          placeholderTextColor="#999896"
        />

        {/* Notes (Optional) */}
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g., Birthday dinner, holiday meal..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholderTextColor="#999"
        />

       {/* Save Button */}
       <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Cheat Day</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor:Colors.lightCream ,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.graphite,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop:20,
  },
  instructionsTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C4A52',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#504D47',
    marginBottom: 12,
  },
// Date Selection
dateScroll: {
  marginBottom: 24,
},
dateScrollContent: {
  paddingRight: 16,
},
dateCard: {
  width: 80,
  padding: 16,
  marginRight: 12,
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#E5E3DF',
  alignItems: 'center',
},
dateCardSelected: {
  borderColor: '#EF7828',
  backgroundColor: '#FFF5F0',
},
dayName: {
  fontSize: 14,
  color: '#687C88',
  marginBottom: 8,
  fontWeight: '500',
},
dayNameSelected: {
  color: '#EF7828',
  fontWeight: '600',
},
dayNum: {
  fontSize: 24,
  fontWeight: '700',
  color: '#504D47',
  marginBottom: 4,
},
dayNumSelected: {
  color: '#EF7828',
},
monthName: {
  fontSize: 12,
  color: '#999896',
},
monthNameSelected: {
  color: '#EF7828',
},
// Recommended Calories Card
recommendedCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#206E6B',
  padding: 20,
  marginBottom: 24,
},
recommendedContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
},
recommendedLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},
sparkleIconCircle: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#FFF5F0',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},
recommendedInfo: {
  flex: 1,
},
recommendedCalories: {
  fontSize: 28,
  fontWeight: '700',
  color: '#504D47',
  marginBottom: 4,
},
calText: {
  fontSize: 16,
  fontWeight: '400',
  color: '#687C88',
},
recommendedSubtext: {
  fontSize: 12,
  color: '#687C88',
},
checkmarkCircle: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: '#E8F5F4',
  alignItems: 'center',
  justifyContent: 'center',
},
checkmarkCircleActive: {
  backgroundColor: '#D4F4F1',
},
recommendedFooter: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  backgroundColor: '#F5F3EF',
  padding: 12,
  borderRadius: 8,
},
recommendedFooterText: {
  flex: 1,
  fontSize: 12,
  color: '#687C88',
  lineHeight: 16,
  marginLeft: 8,
},
  // Input
 input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E3DF',
    padding: 16,
    fontSize: 16,
    color: '#504D47',
    marginBottom: 24,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
// Save Button
saveButton: {
  backgroundColor: '#206E6B',
  borderRadius: 12,
  padding: 18,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 8,
  marginBottom: 32,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
},
saveButtonDisabled: {
  backgroundColor: '#999896',
  opacity: 0.6,
},
saveButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '600',
},
});
