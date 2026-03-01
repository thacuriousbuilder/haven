
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
import { supabase } from '@haven/shared-utils';
import { BackButton } from '@/components/onboarding/backButton';
import { Colors } from '@/constants/colors';
import { getLocalDateString } from '@haven/shared-utils';
import { calculateComfortFloor } from '@/utils/cheatDayHelpers';

export default function PlanCheatDayScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [plannedCalories, setPlannedCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [baselineAverage, setBaselineAverage] = useState<number>(0);
  const [lightOption, setLightOption] = useState<number>(0);
  const [moderateOption, setModerateOption] = useState<number>(0);
  const [celebrationOption, setCelebrationOption] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<'light' | 'moderate' | 'celebration' | 'custom'>('moderate');
  const [otherDaysImpact, setOtherDaysImpact] = useState<number>(0);
  const [validationStatus, setValidationStatus] = useState<'safe' | 'challenging' | 'unsafe'>('safe');
  const [userGoal, setUserGoal] = useState<string>('maintain');
  const [userGender, setUserGender] = useState<string>('male');
  const [comfortFloor, setComfortFloor] = useState<number>(1400);
  const [alreadyPlannedDates, setAlreadyPlannedDates] = useState<string[]>([]);
  const [treatDayCountForSelectedWeek, setTreatDayCountForSelectedWeek] = useState(0);

  // Fetch already planned dates for the visible 7-day range
  React.useEffect(() => {
    const fetchPlannedDates = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date();
        const future = new Date(today);
        future.setDate(today.getDate() + 7);

        const todayStr = today.toISOString().split('T')[0];
        const futureStr = future.toISOString().split('T')[0];

        const { data } = await supabase
          .from('planned_cheat_days')
          .select('cheat_date')
          .eq('user_id', user.id)
          .gte('cheat_date', todayStr)
          .lte('cheat_date', futureStr);

        if (data) {
          setAlreadyPlannedDates(data.map(d => d.cheat_date));
        }
      } catch (error) {
        console.error('Error fetching planned dates:', error);
      }
    };

    fetchPlannedDates();
  }, []);

  // Fetch recommendations when selected date changes
  React.useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('goal, gender')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        const goal = profile.goal || 'maintain';
        const gender = profile.gender || 'male';
        const personalizedFloor = calculateComfortFloor(goal, gender);

        setUserGoal(goal);
        setUserGender(gender);
        setComfortFloor(personalizedFloor);

        // Use selected date to find correct weekly period
        const selectedDateStr = selectedDate
          ? selectedDate.toISOString().split('T')[0]
          : getLocalDateString();

        const { data: weeklyPeriod } = await supabase
          .from('weekly_periods')
          .select('*')
          .eq('user_id', user.id)
          .lte('week_start_date', selectedDateStr)
          .gte('week_end_date', selectedDateStr)
          .single();

        if (!weeklyPeriod) return;

        const weeklyBudget = weeklyPeriod.weekly_budget;
        const weekStartDate = weeklyPeriod.week_start_date;
        const weekEndDate = weeklyPeriod.week_end_date;

        const { data: existingCheatDays } = await supabase
          .from('planned_cheat_days')
          .select('*')
          .eq('user_id', user.id)
          .gte('cheat_date', weekStartDate)
          .lte('cheat_date', weekEndDate);

        const otherCheatDays = existingCheatDays?.filter(day =>
          !selectedDate || day.cheat_date !== selectedDate.toISOString().split('T')[0]
        ) || [];

        const totalTreatDaysThisWeek = existingCheatDays?.length || 0;
        setTreatDayCountForSelectedWeek(totalTreatDaysThisWeek);

        // Hard block at 3
        if (totalTreatDaysThisWeek >= 3) {
          Alert.alert(
            'Maximum Reached',
            "You already have 3 treat days planned this week. That's the maximum HAVEN allows to keep your weekly budget on track.",
            [{ text: 'OK', onPress: () => setSelectedDate(null) }]
          );
          return;
        }

        // Soft warning at 2
        if (totalTreatDaysThisWeek === 2) {
          Alert.alert(
            'Heads Up',
            'You already have 2 treat days this week. HAVEN recommends a maximum of 2 for best results — but you can still add one more.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setSelectedDate(null) },
              { text: 'Add Anyway', style: 'default' },
            ]
          );
        }

        const dailyBase = weeklyBudget / 7;
        const totalReserved = otherCheatDays.reduce((sum, day) => sum + day.planned_calories, 0);
        const remainingBudget = weeklyBudget - totalReserved;
        const regularDaysCount = 7 - otherCheatDays.length - 1;

        const maxSafeCheat = remainingBudget - (regularDaysCount * personalizedFloor);

        if (maxSafeCheat < dailyBase) {
          Alert.alert(
            'Too Many Treat Days',
            `You already have ${otherCheatDays.length} treat day${otherCheatDays.length > 1 ? 's' : ''} planned this week.\n\nAdding another would make your regular days drop below ${personalizedFloor} cal.\n\nConsider adjusting existing treat days first.`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }

        let light = Math.round(dailyBase * 1.3);
        let moderate = Math.round(dailyBase * 1.5);
        let celebration = Math.round(dailyBase * 1.75);

        light = Math.min(light, maxSafeCheat);
        moderate = Math.min(moderate, maxSafeCheat);
        celebration = Math.min(celebration, maxSafeCheat);

        if (celebration >= maxSafeCheat) {
          celebration = maxSafeCheat;
          moderate = Math.round(maxSafeCheat * 0.85);
          light = Math.round(maxSafeCheat * 0.70);
        }

        if (moderate - light < 200) {
          light = Math.max(dailyBase, moderate - 200);
        }
        if (celebration - moderate < 200) {
          moderate = Math.max(light + 200, celebration - 200);
        }

        setBaselineAverage(dailyBase);
        setLightOption(light);
        setModerateOption(moderate);
        setCelebrationOption(celebration);
        setPlannedCalories(moderate.toString());
        setSelectedOption('moderate');

        const impact = Math.round((remainingBudget - moderate) / regularDaysCount);
        setOtherDaysImpact(impact);

        if (impact < personalizedFloor - 200) {
          setValidationStatus('unsafe');
        } else if (impact < personalizedFloor) {
          setValidationStatus('challenging');
        } else {
          setValidationStatus('safe');
        }

      } catch (error) {
        console.error('Error fetching recommendations:', error);
      }
    };

    fetchRecommendations();
  }, [selectedDate]);

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

    const caloriesToSave = parseInt(plannedCalories);

    // Safety floor check
    const weeklyBudgetTotal = baselineAverage * 7;
    const impact = Math.round((weeklyBudgetTotal - caloriesToSave) / 6);
    if (impact < comfortFloor - 200) {
      Alert.alert(
        'Unsafe Amount',
        `This would leave your other days at only ${impact} cal each, which is below your safe minimum of ${comfortFloor} cal.\n\nPlease choose a lower amount.`
      );
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const cheatDate = selectedDate.toISOString().split('T')[0];

      // Weekly budget check against weekly_periods
      const { data: weeklyPeriod } = await supabase
        .from('weekly_periods')
        .select('weekly_budget, week_start_date, week_end_date')
        .eq('user_id', user.id)
        .lte('week_start_date', cheatDate)
        .gte('week_end_date', cheatDate)
        .maybeSingle();

      if (weeklyPeriod) {
        const { data: existingReserved } = await supabase
          .from('planned_cheat_days')
          .select('planned_calories, cheat_date')
          .eq('user_id', user.id)
          .gte('cheat_date', weeklyPeriod.week_start_date)
          .lte('cheat_date', weeklyPeriod.week_end_date);

        // Exclude current date in case it's an edit
        const otherReserved = existingReserved
          ?.filter(d => d.cheat_date !== cheatDate)
          ?.reduce((sum, d) => sum + (d.planned_calories || 0), 0) || 0;

        const newTotal = otherReserved + caloriesToSave;

        if (newTotal > weeklyPeriod.weekly_budget) {
          const available = weeklyPeriod.weekly_budget - otherReserved;
          Alert.alert(
            'Exceeds Weekly Budget',
            `You only have ${available.toLocaleString()} cal available to reserve this week.\n\nYour weekly budget is ${weeklyPeriod.weekly_budget.toLocaleString()} cal and you've already reserved ${otherReserved.toLocaleString()} cal in other treat days.`
          );
          setLoading(false);
          return;
        }
      }

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

      Alert.alert('Success', 'Treat day planned!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving cheat day:', error);
      Alert.alert('Error', 'Failed to save treat day');
    } finally {
      setLoading(false);
    }
  };

  const days = getNext7Days();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Plan Treat Day</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={24} color={Colors.vividTeal} />
          <View style={styles.instructionsTextContainer}>
            <Text style={styles.instructionsTitle}>How it works</Text>
            <Text style={styles.instructionsText}>
              Select a future date for your treat day. HAVEN will automatically adjust your weekly budget to accommodate extra calories.
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
            const dateStr = date.toISOString().split('T')[0];
            const isAlreadyPlanned = alreadyPlannedDates.includes(dateStr);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateCard,
                  isSelected && styles.dateCardSelected,
                  isAlreadyPlanned && styles.dateCardDisabled,
                ]}
                onPress={() => {
                  if (isAlreadyPlanned) return;
                  setSelectedDate(date);
                }}
                activeOpacity={isAlreadyPlanned ? 1 : 0.7}
              >
                <Text style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                  isAlreadyPlanned && styles.textDisabled,
                ]}>
                  {formatted.dayName}
                </Text>
                <Text style={[
                  styles.dayNum,
                  isSelected && styles.dayNumSelected,
                  isAlreadyPlanned && styles.textDisabled,
                ]}>
                  {formatted.dayNum}
                </Text>
                <Text style={[
                  styles.monthName,
                  isSelected && styles.monthNameSelected,
                  isAlreadyPlanned && styles.textDisabled,
                ]}>
                  {formatted.month}
                </Text>
                {isAlreadyPlanned && (
                  <View style={styles.plannedDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Options — only show once a date is selected */}
        {selectedDate && (
          <>
            <Text style={styles.sectionTitle}>Choose Your Amount</Text>

            {/* Light Option */}
            <TouchableOpacity
              style={[styles.optionCard, selectedOption === 'light' && styles.optionCardSelected]}
              onPress={() => {
                setSelectedOption('light');
                setPlannedCalories(lightOption.toString());
                const weeklyBudget = baselineAverage * 7;
                const impact = Math.round((weeklyBudget - lightOption) / 6);
                setOtherDaysImpact(impact);
                setValidationStatus(
                  impact >= comfortFloor ? 'safe' :
                  impact >= comfortFloor - 200 ? 'challenging' : 'unsafe'
                );
              }}
              activeOpacity={0.7}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionLeft}>
                  <Text style={styles.optionLabel}>Light Indulgence</Text>
                  <Text style={styles.optionCalories}>
                    {lightOption.toLocaleString()} <Text style={styles.calText}>cal</Text>
                  </Text>
                  <Text style={styles.optionBoost}>
                    +{Math.round(lightOption - baselineAverage)} over your typical day
                  </Text>
                </View>
                <View style={[styles.radioCircle, selectedOption === 'light' && styles.radioCircleSelected]}>
                  {selectedOption === 'light' && <View style={styles.radioInner} />}
                </View>
              </View>
            </TouchableOpacity>

            {/* Moderate Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedOption === 'moderate' && styles.optionCardSelected,
                styles.recommendedOption,
              ]}
              onPress={() => {
                setSelectedOption('moderate');
                setPlannedCalories(moderateOption.toString());
                const weeklyBudget = baselineAverage * 7;
                const impact = Math.round((weeklyBudget - moderateOption) / 6);
                setOtherDaysImpact(impact);
                setValidationStatus(
                  impact >= comfortFloor ? 'safe' :
                  impact >= comfortFloor - 200 ? 'challenging' : 'unsafe'
                );
              }}
              activeOpacity={0.7}
            >
              <View style={styles.recommendedBadge}>
                <Ionicons name="sparkles" size={14} color={Colors.energyOrange} />
                <Text style={styles.recommendedBadgeText}>Recommended</Text>
              </View>
              <View style={styles.optionHeader}>
                <View style={styles.optionLeft}>
                  <Text style={styles.optionLabel}>Moderate Treat</Text>
                  <Text style={styles.optionCalories}>
                    {moderateOption.toLocaleString()} <Text style={styles.calText}>cal</Text>
                  </Text>
                  <Text style={styles.optionBoost}>
                    +{Math.round(moderateOption - baselineAverage)} over your typical day
                  </Text>
                </View>
                <View style={[styles.radioCircle, selectedOption === 'moderate' && styles.radioCircleSelected]}>
                  {selectedOption === 'moderate' && <View style={styles.radioInner} />}
                </View>
              </View>
            </TouchableOpacity>

            {/* Celebration Option */}
            <TouchableOpacity
              style={[styles.optionCard, selectedOption === 'celebration' && styles.optionCardSelected]}
              onPress={() => {
                setSelectedOption('celebration');
                setPlannedCalories(celebrationOption.toString());
                const weeklyBudget = baselineAverage * 7;
                const impact = Math.round((weeklyBudget - celebrationOption) / 6);
                setOtherDaysImpact(impact);
                setValidationStatus(
                  impact >= comfortFloor ? 'safe' :
                  impact >= comfortFloor - 200 ? 'challenging' : 'unsafe'
                );
              }}
              activeOpacity={0.7}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionLeft}>
                  <Text style={styles.optionLabel}>Big Celebration</Text>
                  <Text style={styles.optionCalories}>
                    {celebrationOption.toLocaleString()} <Text style={styles.calText}>cal</Text>
                  </Text>
                  <Text style={styles.optionBoost}>
                    +{Math.round(celebrationOption - baselineAverage)} over your typical day
                  </Text>
                </View>
                <View style={[styles.radioCircle, selectedOption === 'celebration' && styles.radioCircleSelected]}>
                  {selectedOption === 'celebration' && <View style={styles.radioInner} />}
                </View>
              </View>
            </TouchableOpacity>

            {/* Impact Display */}
            <View style={[
              styles.impactCard,
              validationStatus === 'safe' && styles.impactCardSafe,
              validationStatus === 'challenging' && styles.impactCardChallenging,
              validationStatus === 'unsafe' && styles.impactCardUnsafe,
            ]}>
              <Ionicons
                name={
                  validationStatus === 'safe' ? 'checkmark-circle' :
                  validationStatus === 'challenging' ? 'alert-circle' : 'warning'
                }
                size={20}
                color={
                  validationStatus === 'safe' ? Colors.vividTeal :
                  validationStatus === 'challenging' ? Colors.energyOrange : Colors.error
                }
              />
              <View style={styles.impactTextContainer}>
                <Text style={styles.impactText}>
                  Other days: <Text style={styles.impactCalories}>{otherDaysImpact.toLocaleString()} cal each</Text>
                </Text>
                <Text style={[
                  styles.impactStatus,
                  validationStatus === 'safe' && styles.impactStatusSafe,
                  validationStatus === 'challenging' && styles.impactStatusChallenging,
                  validationStatus === 'unsafe' && styles.impactStatusUnsafe,
                ]}>
                  {validationStatus === 'safe' && '✓ Comfortable and sustainable'}
                  {validationStatus === 'challenging' && '⚠ Challenging but doable'}
                  {validationStatus === 'unsafe' && '⚠ Below safe minimum - please adjust'}
                </Text>
              </View>
            </View>

            {/* Custom Amount */}
            <Text style={styles.sectionTitle}>Custom Amount (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2500"
              keyboardType="number-pad"
              value={plannedCalories}
              onChangeText={(text) => {
                setPlannedCalories(text);
                setSelectedOption('custom');
                const customAmount = parseInt(text) || 0;
                const weeklyBudget = baselineAverage * 7;
                const impact = Math.round((weeklyBudget - customAmount) / 6);
                setOtherDaysImpact(impact);
                setValidationStatus(
                  impact >= comfortFloor ? 'safe' :
                  impact >= comfortFloor - 200 ? 'challenging' : 'unsafe'
                );
              }}
              placeholderTextColor="#999896"
            />

            {/* Notes */}
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
                <Text style={styles.saveButtonText}>Save Treat Day</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
    backgroundColor: Colors.lightCream,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.graphite,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionsTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.steelBlue,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 12,
  },
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
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  dateCardSelected: {
    borderColor: Colors.energyOrange,
    backgroundColor: '#FFF5F0',
  },
  dateCardDisabled: {
    backgroundColor: Colors.lightCream,
    borderColor: Colors.border,
    opacity: 0.5,
  },
  dayName: {
    fontSize: 14,
    color: Colors.steelBlue,
    marginBottom: 8,
    fontWeight: '500',
  },
  dayNameSelected: {
    color: Colors.energyOrange,
    fontWeight: '600',
  },
  dayNum: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 4,
  },
  dayNumSelected: {
    color: Colors.energyOrange,
  },
  monthName: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  monthNameSelected: {
    color: Colors.energyOrange,
  },
  textDisabled: {
    color: Colors.textMuted,
  },
  plannedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.vividTeal,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    fontSize: 16,
    color: Colors.graphite,
    marginBottom: 24,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  saveButton: {
    backgroundColor: Colors.vividTeal,
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
    backgroundColor: Colors.steelBlue,
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  optionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: Colors.vividTeal,
    backgroundColor: '#F0F9F8',
  },
  recommendedOption: {
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.energyOrange,
    zIndex: 1,
  },
  recommendedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.energyOrange,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLeft: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 6,
  },
  optionCalories: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 4,
  },
  calText: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.steelBlue,
  },
  optionBoost: {
    fontSize: 12,
    color: Colors.steelBlue,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: Colors.vividTeal,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.vividTeal,
  },
  impactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.lightCream,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  impactCardSafe: {
    backgroundColor: '#E8F5F4',
    borderColor: Colors.vividTeal,
  },
  impactCardChallenging: {
    backgroundColor: '#FFF5F0',
    borderColor: Colors.energyOrange,
  },
  impactCardUnsafe: {
    backgroundColor: '#FFEBEE',
    borderColor: Colors.error,
  },
  impactTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  impactText: {
    fontSize: 14,
    color: Colors.graphite,
    marginBottom: 4,
  },
  impactCalories: {
    fontWeight: '600',
    color: Colors.vividTeal,
  },
  impactStatus: {
    fontSize: 12,
    lineHeight: 16,
  },
  impactStatusSafe: {
    color: Colors.vividTeal,
  },
  impactStatusChallenging: {
    color: Colors.energyOrange,
  },
  impactStatusUnsafe: {
    color: Colors.error,
  },
});