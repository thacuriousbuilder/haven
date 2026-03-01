import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@haven/shared-utils';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '@/constants/colors';
import { getLocalDateString } from '@haven/shared-utils';

export default function EditCheatDayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // FIXED: Parse date in local timezone
  const [selectedDate, setSelectedDate] = useState(new Date(params.date as string + 'T00:00:00'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [plannedCalories, setPlannedCalories] = useState(params.calories as string || '');
  const [notes, setNotes] = useState(params.notes as string || '');
  const [loading, setLoading] = useState(false);
  const [baselineAverage, setBaselineAverage] = useState<number>(0);
  const [recommendedCalories, setRecommendedCalories] = useState<number>(0);
  const [useRecommended, setUseRecommended] = useState<boolean>(false);

  // Fetch smart recommended calories based on weekly progress
  React.useEffect(() => {
    const fetchSmartRecommendation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // FIXED: Use local date strings
        const today = getLocalDateString();
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const editingDate = `${year}-${month}-${day}`;

        // Get the active weekly period that contains the editing date
        const { data: weeklyPeriod } = await supabase
          .from('weekly_periods')
          .select('*')
          .eq('user_id', user.id)
          .eq('period_type', 'active')
          .eq('status', 'active')
          .lte('week_start_date', editingDate)
          .gte('week_end_date', editingDate)
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

        // Get other planned cheat days for this week (excluding current one being edited)
        const { data: otherCheatDays } = await supabase
          .from('planned_cheat_days')
          .select('planned_calories, cheat_date')
          .eq('user_id', user.id)
          .gte('cheat_date', today)
          .lte('cheat_date', weekEndDate)
          .neq('id', params.id as string); // Exclude current cheat day

        // Calculate total reserved for other cheat days
        const totalReservedOther = otherCheatDays?.reduce(
          (sum, day) => sum + (day.planned_calories || 0),
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

      } catch (error) {
        console.error('Error fetching smart recommendation:', error);
      }
    };

    fetchSmartRecommendation();
  }, [selectedDate, params.id]);
    
  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatDateShort = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      // Don't allow past dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        Alert.alert('Invalid Date', 'Please select a future date');
        return;
      }
      
      setSelectedDate(date);
    }
  };

  const handleSave = async () => {
    if (!plannedCalories || parseInt(plannedCalories) <= 0) {
      Alert.alert('Error', 'Please enter valid planned calories');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // FIXED: Convert date to local date string
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const newCheatDate = `${year}-${month}-${day}`;
      const oldCheatDate = params.date as string;

      // Check if date changed and if new date already has a cheat day
      if (newCheatDate !== oldCheatDate) {
        const { data: existing } = await supabase
          .from('planned_cheat_days')
          .select('id')
          .eq('user_id', user.id)
          .eq('cheat_date', newCheatDate)
          .neq('id', params.id as string)
          .single();

        if (existing) {
          Alert.alert(
            'Date Conflict',
            'You already have a treat day planned for this date. Please choose a different date.'
          );
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('planned_cheat_days')
        .update({
          cheat_date: newCheatDate,
          planned_calories: parseInt(plannedCalories),
          notes: notes || null,
        })
        .eq('id', params.id as string);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Treat day updated!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating cheat day:', error);
      Alert.alert('Error', 'Failed to update treat day');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Cheat Day',
      'Are you sure you want to delete this treat day?',
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
              setLoading(true);
              
              const { error } = await supabase
                .from('planned_cheat_days')
                .delete()
                .eq('id', params.id as string);

              if (error) throw error;

              Alert.alert(
                'Deleted',
                'Treat day deleted successfully',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error) {
              console.error('Error deleting cheat day:', error);
              Alert.alert('Error', 'Failed to delete treat day');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

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
        
        <Text style={styles.headerTitle}>Edit Treat Day</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Date Section */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.dateCard}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.dateCardLeft}>
            <Ionicons name="calendar" size={24} color={Colors.energyOrange} />
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.steelBlue} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
            textColor={Colors.graphite}
          />
        )}

        {Platform.OS === 'ios' && showDatePicker && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setShowDatePicker(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        )}

        {/* Recommended Calories */}
        {recommendedCalories > 0 && (
          <>
            <Text style={styles.label}>Calories for this day</Text>
            <TouchableOpacity
              style={[
                styles.recommendedCard,
                useRecommended && styles.recommendedCardSelected
              ]}
              onPress={() => {
                setPlannedCalories(recommendedCalories.toString());
                setUseRecommended(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.recommendedContent}>
                <View style={styles.recommendedLeft}>
                  <View style={styles.sparkleIconCircle}>
                    <Ionicons name="sparkles" size={20} color={Colors.energyOrange} />
                  </View>
                  <View style={styles.recommendedInfo}>
                    <Text style={styles.recommendedLabel}>Recommended</Text>
                    <Text style={styles.recommendedCalories}>
                      {recommendedCalories.toLocaleString()} cal
                    </Text>
                    <Text style={styles.recommendedSubtext}>
                      Based on your weekly budget and progress
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.checkmarkCircle,
                  useRecommended && styles.checkmarkCircleActive
                ]}>
                  <Ionicons 
                    name={useRecommended ? "checkmark-circle" : "checkmark"} 
                    size={24} 
                    color={Colors.vividTeal} 
                  />
                </View>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Custom Amount */}
        <TouchableOpacity
          style={[
            styles.customCard,
            !useRecommended && plannedCalories && styles.customCardSelected
          ]}
          onPress={() => setUseRecommended(false)}
          activeOpacity={0.7}
        >
          <View style={styles.customContent}>
            <View style={[
              styles.radioCircle,
              !useRecommended && plannedCalories && styles.radioCircleActive
            ]}>
              {!useRecommended && plannedCalories && (
                <View style={styles.radioCircleInner} />
              )}
            </View>
            <Text style={styles.customLabel}>Custom Amount</Text>
          </View>
        </TouchableOpacity>

        {/* Custom Input - Always visible */}
        <TextInput
          style={styles.input}
          placeholder="e.g., 2500"
          keyboardType="number-pad"
          value={plannedCalories}
          onChangeText={(text) => {
            setPlannedCalories(text);
            if (text && text !== recommendedCalories.toString()) {
              setUseRecommended(false);
            }
          }}
          placeholderTextColor={Colors.textMuted}
        />

        {/* Notes Section */}
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g., Birthday dinner, holiday meal..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholderTextColor={Colors.textMuted}
        />

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{formatDateShort(selectedDate)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Calories</Text>
            <View style={styles.summaryValueWithIcon}>
              <Ionicons name="flame" size={16} color={Colors.energyOrange} />
              <Text style={styles.summaryValue}>
                {plannedCalories ? `${parseInt(plannedCalories).toLocaleString()} cal` : '0 cal'}
              </Text>
            </View>
          </View>

          {baselineAverage > 0 && plannedCalories && parseInt(plannedCalories) > baselineAverage && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Extra from goal</Text>
              <Text style={styles.summaryValueExtra}>
                +{(parseInt(plannedCalories) - baselineAverage).toLocaleString()} cal
              </Text>
            </View>
          )}
          
          {notes && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Note</Text>
              <Text style={[styles.summaryValue, styles.summaryValueNote]} numberOfLines={2}>
                {notes}
              </Text>
            </View>
          )}
        </View>

        {/* Info Text */}
        <View style={styles.infoRow}>
          <Ionicons name="information-circle" size={16} color={Colors.steelBlue} />
          <Text style={styles.infoText}>
            Changes will be reflected in your weekly calorie budget immediately.
          </Text>
        </View>

        {/* Save Changes Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteButtonText}>Delete Treat Day</Text>
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

  // Content
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: Spacing.sm,
  },

  // Date Card
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  dateCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  dateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.graphite,
    flex: 1,
  },
  doneButton: {
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },

  // Input
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: Colors.graphite,
    marginBottom: Spacing.lg,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.lg,
  },
  // Recommended Card
  recommendedCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  recommendedCardSelected: {
    borderColor: Colors.vividTeal,
    backgroundColor: Colors.tealOverlay,
  },
  recommendedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: Colors.orangeOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  recommendedInfo: {
    flex: 1,
  },
  recommendedLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.steelBlue,
    marginBottom: 2,
  },
  recommendedCalories: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginBottom: 2,
  },
  recommendedSubtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },
  checkmarkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lightCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkCircleActive: {
    backgroundColor: Colors.tealOverlay,
  },

  // Custom Card
  customCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  customCardSelected: {
    borderColor: Colors.vividTeal,
    backgroundColor: Colors.tealOverlay,
  },
  customContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Summary Card
  summaryCard: {
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  summaryTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
  },
  summaryValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.graphite,
    textAlign: 'right',
  },
  summaryValueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  summaryValueExtra: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.energyOrange,
    textAlign: 'right',
  },
  summaryValueNote: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.relaxed,
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.small,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },

  // Delete Button
  deleteButton: {
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  deleteButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.error,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  radioCircleActive: {
    borderColor: Colors.vividTeal,
  },
  radioCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.vividTeal,
  },
  customLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.graphite,
  },

  // Placeholder
  placeholderText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});