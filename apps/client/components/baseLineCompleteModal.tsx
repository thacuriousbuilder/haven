
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BaselineCompleteModalProps {
  visible: boolean;
  baselineAverage: number;
  reportedActivityLevel?: string;
  actualActivityLevel?: string;
  daysUsed?: number;
  onComplete: () => void;
}

export function BaselineCompleteModal({ 
  visible, 
  baselineAverage,
  reportedActivityLevel,
  actualActivityLevel,
  daysUsed,
  onComplete 
}: BaselineCompleteModalProps) {
  
  // Calculate weekly budget and mid-week status
  const weeklyBudget = baselineAverage * 7;
  
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const daysRemaining = daysUntilSunday + 1;
  const isMidWeek = daysRemaining < 7;

  // Activity level changed
  const activityChanged = reportedActivityLevel && actualActivityLevel && 
    reportedActivityLevel.toLowerCase() !== actualActivityLevel.toLowerCase();

  // Get activity level labels
  const getActivityLabel = (level?: string) => {
    if (!level) return '';
    const labels: Record<string, string> = {
      'sedentary': 'Sedentary',
      'lightly_active': 'Lightly Active',
      'moderately_active': 'Moderately Active',
      'very_active': 'Very Active',
    };
    return labels[level.toLowerCase()] || level;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} 
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={56} color="#10B981" />
            </View>

            {/* Title */}
            <Text style={styles.title}>Baseline Complete!</Text>
            
            {/* Description */}
            <Text style={styles.description}>
              Your personalized weekly budget is ready
            </Text>

            {/* Stats Cards Row */}
            <View style={styles.statsRow}>
              {/* Daily Average */}
              <View style={[styles.statsCard, styles.statsCardHalf]}>
                <Text style={styles.statsLabel}>DAILY</Text>
                <Text style={styles.statsValue}>{baselineAverage.toLocaleString()}</Text>
                <Text style={styles.statsUnit}>cal</Text>
              </View>

              {/* Weekly Budget */}
              <View style={[styles.statsCard, styles.statsCardHalf]}>
                <Text style={styles.statsLabel}>WEEKLY</Text>
                <Text style={styles.statsValue}>{weeklyBudget.toLocaleString()}</Text>
                <Text style={styles.statsUnit}>cal</Text>
              </View>
            </View>

            {/* Activity Level Comparison (if changed) */}
            {activityChanged && (
              <View style={styles.activityBox}>
                <View style={styles.activityRow}>
                  <View style={styles.activityItem}>
                    <Text style={styles.activityLabel}>Reported</Text>
                    <Text style={styles.activityValue}>
                      {getActivityLabel(reportedActivityLevel)}
                    </Text>
                  </View>
                  
                  <Ionicons name="arrow-forward" size={24} color={Colors.energyOrange} />
                  
                  <View style={styles.activityItem}>
                    <Text style={styles.activityLabel}>Actual</Text>
                    <Text style={[styles.activityValue, styles.actualActivity]}>
                      {getActivityLabel(actualActivityLevel)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.activityNote}>
                  We've adjusted your plan to match your actual activity
                </Text>
              </View>
            )}

            {/* Completion Message Box */}
            {daysUsed && daysUsed < 7 ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={18} color="#D97706" />
                <Text style={styles.warningText}>
                  We calculated your baseline from {daysUsed} day{daysUsed === 1 ? '' : 's'} you logged. For best results, try to log daily going forward.
                </Text>
              </View>
            ) : (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.successText}>
                  Great job completing all 7 days! Your plan is now personalized to your actual habits.
                </Text>
              </View>
            )}

            {/* Mid-Week Message */}
            {isMidWeek && (
              <View style={styles.weekBox}>
                <Ionicons name="calendar-outline" size={16} color={Colors.vividTeal} />
                <Text style={styles.weekText}>
                  {daysRemaining} day{daysRemaining === 1 ? '' : 's'} until Fresh Week
                </Text>
              </View>
            )}

            {/* Start Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={onComplete}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Start Tracking</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Shadows.large,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: Colors.steelBlue,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsCardHalf: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.steelBlue,
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.vividTeal,
    marginBottom: 2,
  },
  statsUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
  activityBox: {
    backgroundColor: '#FFF7ED',
    padding: 14,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    width: '100%',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activityItem: {
    flex: 1,
    alignItems: 'center',
  },
  activityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9A3412',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
  actualActivity: {
    color: Colors.energyOrange,
    fontWeight: '700',
  },
  activityNote: {
    fontSize: 12,
    color: '#9A3412',
    textAlign: 'center',
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    width: '100%',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    width: '100%',
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
    fontWeight: '500',
  },
  weekBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    gap: 8,
    borderWidth: 1,
    borderColor: '#B2DFDB',
    marginBottom: 20,
  },
  weekText: {
    fontSize: 13,
    color: '#00695C',
    fontWeight: '600',
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
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },
});