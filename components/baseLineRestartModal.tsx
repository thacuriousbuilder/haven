import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';

interface BaselineRestartModalProps {
  visible: boolean;
  daysLogged: number;
  onRestart: () => void;
  onCompleteAnyway: () => void;
}

export function BaselineRestartModal({
  visible,
  daysLogged,
  onRestart,
  onCompleteAnyway,
}: BaselineRestartModalProps) {
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
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Baseline Incomplete</Text>

          {/* Description */}
          <Text style={styles.description}>
            You only logged <Text style={styles.highlight}>{daysLogged} of 7 days</Text>. 
            Your baseline will be highly inaccurate with this little data.
          </Text>

          {/* Warning box */}
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#EF4444" />
            <Text style={styles.warningText}>
              We strongly recommend restarting when you're ready to commit to logging daily for a full week.
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onRestart}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={Colors.white} />
            <Text style={styles.primaryButtonText}>Restart Baseline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onCompleteAnyway}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              Complete anyway (not recommended)
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
    color: '#EF4444',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '600',
    color: Colors.steelBlue,
  },
});