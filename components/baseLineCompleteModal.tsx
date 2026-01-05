import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface BaselineCompleteModalProps {
  visible: boolean;
  baselineAverage: number;
  onComplete: () => void;
}

export function BaselineCompleteModal({ 
  visible, 
  baselineAverage,
  onComplete 
}: BaselineCompleteModalProps) {
  const [transitioning, setTransitioning] = useState(false);

  const handleTransition = async () => {
    setTransitioning(true);

    try {
      const { data, error } = await supabase.functions.invoke('transitionToActiveWeek');

      if (error) {
        console.error('Transition error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to transition to active week');
      }

      console.log('✅ Transition successful:', data.data);

      Alert.alert(
        '🎉 Welcome to Active Tracking!',
        `Your weekly budget: ${data.data.weekly_budget.toLocaleString()} calories\n\nBased on your baseline average of ${data.data.baseline_average_daily} cal/day`,
        [
          {
            text: 'Start Tracking',
            onPress: onComplete,
          }
        ]
      );

    } catch (error) {
      console.error('Transition error:', error);
      Alert.alert(
        'Transition Failed',
        'Could not complete baseline. Please try again or contact support.'
      );
      setTransitioning(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Prevent dismissal
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>

          <Text style={styles.title}>Baseline Week Complete!</Text>
          
          <Text style={styles.description}>
            You've successfully tracked 7 days of your natural eating habits.
          </Text>

          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Your Daily Average</Text>
            <Text style={styles.statsValue}>{baselineAverage.toLocaleString()}</Text>
            <Text style={styles.statsUnit}>calories/day</Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#3D5A5C" />
            <Text style={styles.infoText}>
              We'll use this as your weekly budget to track Balance, Consistency, and Drift.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, transitioning && styles.buttonDisabled]}
            onPress={handleTransition}
            disabled={transitioning}
          >
            {transitioning ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.buttonText}>Setting up...</Text>
              </>
            ) : (
              <Text style={styles.buttonText}>Start Weekly Tracking</Text>
            )}
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
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  statsCard: {
    backgroundColor: '#F5F1E8',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  statsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  statsUnit: {
    fontSize: 16,
    color: '#6B7280',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#3D5A5C',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#3D5A5C',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});