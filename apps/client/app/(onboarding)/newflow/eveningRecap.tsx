

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BackButton } from '@/components/onboarding/backButton';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { useOnboarding } from '@/contexts/onboardingContext';
import { Colors } from '@/constants/colors';

const parseTime = (timeStr: string): Date => {
    const date = new Date();
    try {
      if (!timeStr || !timeStr.includes(':')) {
        date.setHours(20, 0, 0, 0);
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
      date.setHours(20, 0, 0, 0); // default 8PM
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

export default function EveningRecapScreen() {
  const { data, updateData } = useOnboarding();
  const [enabled, setEnabled] = useState(true);
  const [recapTime, setRecapTime] = useState(parseTime('8:00 PM'));
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState(recapTime);

  const getNextRoute = () => {
    if (data.planPath === 'baseline') {
      return '/newflow/paywallBaseline';
    }
    return '/newflow/paywallEstimated';
  };

  const handleSetRecap = () => {
    updateData({
      eveningRecapEnabled: enabled,
      eveningRecapTime: formatTime(recapTime),
    });
    router.push(getNextRoute());
  };

  const handleSkip = () => {
    updateData({ eveningRecapEnabled: false });
    router.push(getNextRoute());
  };

  const confirmTime = () => {
    setRecapTime(tempTime);
    setShowPicker(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={15} totalSteps={15} />

      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>Evening recap</Text>
          <Text style={styles.subtitle}>
            A quick nightly check-in to reflect on your day and log any missed meals
          </Text>

          {/* Info card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="moon" size={22} color={Colors.vividTeal} />
              </View>
              <View>
                <Text style={styles.infoTitle}>Evening Recap</Text>
                <Text style={styles.infoMeta}>Takes about 1 minute</Text>
              </View>
            </View>

            <View style={styles.checkList}>
              {[
                'Check for missed meal',
                'Quick reflection on what you ate',
                'See your daily summary',
              ].map((item, i) => (
                <View key={i} style={styles.checkItem}>
                  <Ionicons name="checkmark" size={16} color={Colors.vividTeal} />
                  <Text style={styles.checkText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Time row */}
            <Text style={styles.reminderLabel}>Reminder time</Text>
            <TouchableOpacity
              style={styles.timeRow}
              onPress={() => {
                setTempTime(recapTime);
                setShowPicker(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.timeLeft}>
                <Ionicons name="time-outline" size={18} color="#131311" />
                <Text style={styles.timeText}>{formatTime(recapTime)}</Text>
                <Ionicons name="chevron-down" size={16} color="#999896" />
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: '#E5E3DF', true: Colors.vividTeal }}
                thumbColor="#fff"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            We recommend 8 PM— early enough to remember, late enough that you're done eating.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Skip evening recap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleSetRecap}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Set evening recap</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Reminder Time</Text>
              <TouchableOpacity onPress={confirmTime}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempTime}
              mode="time"
              display="spinner"
              onChange={(_, date) => { if (date) setTempTime(date); }}
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
  topSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999896',
    lineHeight: 20,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F3F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#131311',
    marginBottom: 2,
  },
  infoMeta: {
    fontSize: 12,
    color: '#999896',
  },
  checkList: {
    gap: 8,
    marginBottom: 20,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 14,
    color: '#504D47',
  },
  reminderLabel: {
    fontSize: 13,
    color: '#999896',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F3EF',
    borderRadius: 12,
    padding: 14,
  },
  timeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#131311',
  },
  hint: {
    fontSize: 13,
    color: '#999896',
    lineHeight: 20,
    textAlign: 'center',
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
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
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