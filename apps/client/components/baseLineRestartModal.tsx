

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BaselineRestartModalProps {
  visible: boolean;
  daysLogged: number;
  onRestart: () => void;
  onUseEstimatedData: () => void;
}

export function BaselineRestartModal({
  visible,
  daysLogged,
  onRestart,
  onUseEstimatedData,
}: BaselineRestartModalProps) {
  const [loading, setLoading] = React.useState(false);

  const handleRestart = async () => {
    setLoading(true);
    await onRestart();
    setLoading(false);
  };

  const handleUseEstimated = async () => {
    setLoading(true);
    await onUseEstimatedData();
    setLoading(false);
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
            {/* Warning Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={56} color="#EF4444" />
            </View>

            {/* Title */}
            <Text style={styles.title}>Insufficient Data</Text>

            {/* Description */}
            <Text style={styles.description}>
              You've only logged {daysLogged} day{daysLogged === 1 ? '' : 's'}. We need at least 3 days for an accurate baseline.
            </Text>

            {/* Warning Box */}
            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={18} color="#DC2626" />
              <Text style={styles.warningText}>
                Your weekly budget will be estimated from your onboarding info, not your actual eating habits.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {/* Restart Button (Primary) */}
              <TouchableOpacity
                style={[styles.button, styles.restartButton]}
                onPress={handleRestart}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={20} color={Colors.white} />
                    <Text style={styles.buttonText}>Restart Baseline</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Use Estimated Data Button (Secondary) */}
              <TouchableOpacity
                style={[styles.button, styles.estimatedButton]}
                onPress={handleUseEstimated}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <>
                    <Ionicons name="calculator-outline" size={20} color="#6B7280" />
                    <Text style={styles.estimatedButtonText}>Use Estimated Data</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: Colors.steelBlue,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    width: '100%',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    fontWeight: '500',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    gap: 8,
  },
  restartButton: {
    backgroundColor: Colors.vividTeal,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  estimatedButton: {
    backgroundColor: Colors.lightCream,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  estimatedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
});