import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';

interface BaselineCompleteModalProps {
  visible: boolean;
  baselineAverage: number;
  message?: string; 
  onComplete: () => void;
}

export function BaselineCompleteModal({ 
  visible, 
  baselineAverage,
  message,
  onComplete 
}: BaselineCompleteModalProps) {
  
  // Calculate weekly budget and mid-week status
  const weeklyBudget = baselineAverage * 7;
  
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const daysRemaining = daysUntilSunday + 1; // Include today
  const isMidWeek = daysRemaining < 7;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} 
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Baseline Week Complete!</Text>
          
          {/* Description */}
          <Text style={styles.description}>
            You've successfully tracked your natural eating habits.
          </Text>

          {/* Stats Cards Row */}
          <View style={styles.statsRow}>
            {/* Daily Average */}
            <View style={[styles.statsCard, styles.statsCardHalf]}>
              <Text style={styles.statsLabel}>Daily Average</Text>
              <Text style={styles.statsValue}>{baselineAverage.toLocaleString()}</Text>
              <Text style={styles.statsUnit}>cal/day</Text>
            </View>

            {/* Weekly Budget */}
            <View style={[styles.statsCard, styles.statsCardHalf]}>
              <Text style={styles.statsLabel}>Weekly Budget</Text>
              <Text style={styles.statsValue}>{weeklyBudget.toLocaleString()}</Text>
              <Text style={styles.statsUnit}>cal/week</Text>
            </View>
          </View>

          {/* Mid-Week Message */}
          {isMidWeek && (
            <View style={styles.infoBox}>
              <Ionicons name="calendar-outline" size={20} color={Colors.vividTeal} />
              <Text style={styles.infoText}>
                You're starting mid-week with {daysRemaining} day{daysRemaining === 1 ? '' : 's'} to track. Fresh start next Monday!
              </Text>
            </View>
          )}

          {/* Optional Message (for activity level adjustments, partial completion, etc.) */}
          {message && (
            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={20} color={Colors.energyOrange} />
              <Text style={styles.warningText}>{message}</Text>
            </View>
          )}

          {/* Start Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={20} color={Colors.white} />
            <Text style={styles.buttonText}>Start Weekly Tracking</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Shadows.large,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.steelBlue,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsCardHalf: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.steelBlue,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.vividTeal,
    marginBottom: 4,
  },
  statsUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E0F2F1',
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#B2DFDB',
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#00695C',
    lineHeight: 20,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3E2',
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    width: '100%',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});