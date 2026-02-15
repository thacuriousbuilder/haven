// app/logWeight.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, getLocalDateString } from '@haven/shared-utils';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/colors';

export default function LogWeightScreen() {
  const router = useRouter();
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<'lbs' | 'kgs'>('lbs');

  // Fetch user's preferred unit on mount
  React.useEffect(() => {
    fetchUserUnit();
  }, []);

  const fetchUserUnit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('target_weight_lbs, target_weight_kgs')
        .eq('id', user.id)
        .single();

      if (profile) {
        // Determine unit based on which target weight is set
        if (profile.target_weight_lbs !== null && profile.target_weight_lbs !== undefined) {
          setUnit('lbs');
        } else if (profile.target_weight_kgs !== null && profile.target_weight_kgs !== undefined) {
          setUnit('kgs');
        }
      }
    } catch (error) {
      console.error('Error fetching user unit:', error);
    }
  };

  const handleSave = async () => {
    // Validate input
    const weightValue = parseFloat(weight);
    if (!weight || isNaN(weightValue) || weightValue <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to save weight.');
        return;
      }

      const todayStr = getLocalDateString();

      // Prepare data based on unit
      const weightData: any = {
        user_id: user.id,
        log_date: todayStr,
        notes: notes.trim() || null,
      };

      if (unit === 'lbs') {
        weightData.weight_lbs = weightValue;
      } else {
        weightData.weight_kgs = weightValue;
      }

      // Insert or update (upsert based on unique constraint: user_id, log_date)
      const { error } = await supabase
        .from('weight_logs')
        .upsert(weightData, {
          onConflict: 'user_id,log_date',
        });

      if (error) {
        console.error('Error saving weight:', error);
        Alert.alert('Error', 'Failed to save weight. Please try again.');
        return;
      }

      Alert.alert(
        'Success',
        'Weight logged successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.graphite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Weight</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.label}>Today's Weight</Text>
            
            <View style={styles.weightInputContainer}>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="0.0"
                placeholderTextColor="#D1D5DB"
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={styles.unitText}>{unit}</Text>
            </View>

            <Text style={styles.helperText}>
              Enter your current weight to track progress
            </Text>
          </View>

          {/* Notes Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="How are you feeling today?"
              placeholderTextColor="#D1D5DB"
              multiline
              maxLength={200}
            />
          </View>
        </ScrollView>

        {/* Fixed Save Button - Outside ScrollView, stays above keyboard */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                <Text style={styles.saveButtonText}>Save Weight</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.lightCream,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: Spacing.md,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  weightInput: {
    fontSize: 64,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    textAlign: 'center',
    minWidth: 150,
  },
  unitText: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.steelBlue,
    marginLeft: Spacing.sm,
  },
  helperText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.graphite,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.lg,
  },
  saveButton: {
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.small,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});