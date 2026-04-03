

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BackButton } from '@/components/onboarding/backButton';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { useOnboarding } from '@/contexts/onboardingContext';
import { getMealIcon } from '@/utils/homeHelpers';
import { Colors } from '@/constants/colors';

const MEAL_TIMES = [
  { key: 'breakfast', label: 'Breakfast', defaultTime: '8:00 AM' },
  { key: 'lunch',     label: 'Lunch',     defaultTime: '12:00 PM' },
  { key: 'dinner',    label: 'Dinner',    defaultTime: '6:00 PM' },
] as const;

type MealKey = typeof MEAL_TIMES[number]['key'];

const parseTime = (timeStr: string): Date => {
    const date = new Date();
    try {
      if (!timeStr || !timeStr.includes(':')) {
        // Fallback defaults
        date.setHours(8, 0, 0, 0);
        return date;
      }
      const parts = timeStr.trim().split(' ');
      const [hours, minutes] = parts[0].split(':').map(Number);
      const period = parts[1];
      let h = hours;
      if (period === 'PM' && hours !== 12) h += 12;
      if (period === 'AM' && hours === 12) h = 0;
      date.setHours(h, minutes || 0, 0, 0);
    } catch {
      date.setHours(8, 0, 0, 0);
    }
    return date;
  };

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default function MealTimesScreen() {
  const { data, updateData } = useOnboarding();

  const [times, setTimes] = useState({
    breakfast: parseTime('8:00 AM'),
    lunch:     parseTime('12:00 PM'),
    dinner:    parseTime('6:00 PM'),
  });

  const [selected, setSelected] = useState<Set<MealKey>>(new Set());
  const [activePicker, setActivePicker] = useState<MealKey | null>(null);
  const [tempTime, setTempTime] = useState<Date>(new Date());

  const toggleMeal = (key: MealKey) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const openPicker = (key: MealKey) => {
    setTempTime(times[key]);
    setActivePicker(key);
    // Auto-select the meal when user taps the time
    setSelected(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleTimeChange = (_: any, date?: Date) => {
    if (date) setTempTime(date);
  };

  const confirmTime = () => {
    if (activePicker) {
      setTimes(prev => ({ ...prev, [activePicker]: tempTime }));
    }
    setActivePicker(null);
  };

  const handleSetMealTimes = () => {
    updateData({
      mealTimesEnabled: true,
      breakfastTime: formatTime(times.breakfast),
      lunchTime: formatTime(times.lunch),
      dinnerTime: formatTime(times.dinner),
    });
    router.push('/newflow/eveningRecap');
  };

  const handleSkip = () => {
    updateData({ mealTimesEnabled: false });
    router.push('/newflow/eveningRecap');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={14} totalSteps={15} />

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>When do you usually eat?</Text>
          <Text style={styles.subtitle}>This will be used to tailor your plan.</Text>

          <View style={styles.mealList}>
            {MEAL_TIMES.map(meal => (
              <View key={meal.key} style={styles.mealRow}>
                {/* Left — icon + label + time picker trigger */}
                <TouchableOpacity
                  style={styles.mealLeft}
                  onPress={() => openPicker(meal.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.mealIconCircle}>
                    <Ionicons
                      name={getMealIcon(meal.key) as any}
                      size={22}
                      color="#fff"
                    />
                  </View>
                  <View>
                    <Text style={styles.mealLabel}>{meal.label}</Text>
                    <View style={styles.timeRow}>
                      <Text style={styles.mealTime}>
                        {formatTime(times[meal.key])}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color="#999896" />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Right — checkbox */}
                <TouchableOpacity
                  onPress={() => toggleMeal(meal.key)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    selected.has(meal.key) && styles.checkboxSelected,
                  ]}>
                    {selected.has(meal.key) && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <Text style={styles.hint}>
            You can always change these later in settings.
          </Text>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Continue without reminders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.continueButton,
              selected.size === 0 && styles.continueButtonDisabled,
            ]}
            onPress={handleSetMealTimes}
            disabled={selected.size === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Set meal times</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Picker Modal */}
      <Modal
        visible={activePicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setActivePicker(null)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {activePicker
                  ? MEAL_TIMES.find(m => m.key === activePicker)?.label
                  : ''}
              </Text>
              <TouchableOpacity onPress={confirmTime}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>

            <DateTimePicker
              value={tempTime}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
              textColor="#131311"
              style={styles.datePicker}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131311',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    justifyContent: 'space-between',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999896',
    marginBottom: 32,
  },
  mealList: {
    gap: 12,
    marginBottom: 24,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mealIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.vividTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#131311',
    marginBottom: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealTime: {
    fontSize: 13,
    color: '#999896',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E3DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.vividTeal,
    borderColor: Colors.vividTeal,
  },
  hint: {
    fontSize: 13,
    color: '#999896',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    paddingBottom: 24,
  },
  skipButton: {
    backgroundColor: '#504D47',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: Colors.vividTeal,
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E3DF',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#131311',
  },
  modalCancel: {
    fontSize: 16,
    color: '#999896',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.vividTeal,
  },
  datePicker: {
    width: '100%',
  },
});