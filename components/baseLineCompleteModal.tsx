import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
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
  
  const handleStartTracking = () => {
    // Calculate days remaining in this week for the message
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const daysRemaining = daysUntilSunday + 1; // Include today

    const weeklyBudget = baselineAverage * 7;
    
    const midWeekMessage = daysRemaining < 7 
      ? `\n\nYou're starting mid-week with ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} to track. Fresh start next Monday!`
      : '';

    Alert.alert(
      '🎉 Welcome to Active Tracking!',
      `Your weekly budget: ${weeklyBudget.toLocaleString()} calories\n\nBased on your baseline average of ${baselineAverage} cal/day${midWeekMessage}`,
      [
        {
          text: 'Start Tracking',
          onPress: onComplete,
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} // Prevent dismissal
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

          {/* Stats Card - Baseline Average */}
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Your Daily Average</Text>
            <Text style={styles.statsValue}>{baselineAverage.toLocaleString()}</Text>
            <Text style={styles.statsUnit}>calories/day</Text>
          </View>

          {/* Optional Warning Message (for partial completion) */}
          {message && (
            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={20} color={Colors.energyOrange} />
              <Text style={styles.warningText}>{message}</Text>
            </View>
          )}

          {/* Start Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleStartTracking}
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
  statsCard: {
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.lg,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.steelBlue,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.vividTeal,
    marginBottom: 4,
  },
  statsUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.steelBlue,
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