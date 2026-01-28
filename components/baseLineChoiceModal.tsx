import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';

interface BaselineChoiceModalProps {
  visible: boolean;
  daysLogged: number;
  alreadyExtended?: boolean
  onCompleteNow: () => void;
  onExtend: () => void;
}

export function BaselineChoiceModal({
  visible,
  daysLogged,
  alreadyExtended = false,
  onCompleteNow,
  onExtend,
}: BaselineChoiceModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="timer-outline" size={48} color={Colors.energyOrange} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Baseline Period Ended</Text>

          {/* Description */}
          <Text style={styles.description}>
            You logged <Text style={styles.highlight}>{daysLogged} of 7 days</Text>. 
            This may result in a less accurate baseline.
          </Text>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={Colors.steelBlue} />
            <Text style={styles.infoText}>
              We recommend logging all 7 days for the most accurate weekly calorie budget.
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, alreadyExtended && styles.disabledButton]}
            onPress={onExtend}
            activeOpacity={0.8}
            disabled={alreadyExtended}
          >
           <Ionicons name="time-outline" size={20} color={Colors.white} />
            <Text style={styles.primaryButtonText}>
              {alreadyExtended ? 'Already Extended' : 'Extend 3 More Days'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onCompleteNow}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              Complete with {daysLogged} days
            </Text>
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
    ...Shadows.large,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: Colors.steelBlue,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  highlight: {
    fontWeight: '700',
    color: Colors.graphite,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.lightCream,
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.steelBlue,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.vividTeal,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  secondaryButton: {
    backgroundColor: Colors.lightCream,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.graphite,
  },
  disabledButton: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
});