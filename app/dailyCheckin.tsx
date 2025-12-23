import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context'
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type DayType = 'normal' | 'special_occasion' | 'off_day';

export default function DailyCheckInScreen() {
  const [selectedDayType, setSelectedDayType] = useState<DayType | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  useEffect(() => {
    checkIfAlreadyCheckedIn();
  }, []);

  const checkIfAlreadyCheckedIn = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_in_date', yesterdayDate)
        .maybeSingle();

      if (error) {
        console.error('Error checking check-in status:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setHasCheckedIn(true);
        setSelectedDayType(data.day_type as DayType);
        setNotes(data.notes || '');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in checkIfAlreadyCheckedIn:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDayType) {
      Alert.alert('Please select an option', 'Let us know how yesterday went');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        setSaving(false);
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      const { error } = await supabase
        .from('check_ins')
        .upsert({
          user_id: user.id,
          check_in_date: yesterdayDate,
          day_type: selectedDayType,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,check_in_date'
        });

      if (error) {
        console.error('Error saving check-in:', error);
        Alert.alert('Error', 'Failed to save check-in');
        setSaving(false);
        return;
      }

      setSaving(false);
      Alert.alert('Success', 'Check-in saved!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        }
      ]);
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Something went wrong');
      setSaving(false);
    }
  };

  const dayOptions = [
    {
      type: 'normal' as DayType,
      icon: 'happy-outline',
      title: 'Normal eating day',
      description: 'Ate like I usually do',
      color: '#4CAF50',
    },
    {
      type: 'special_occasion' as DayType,
      icon: 'restaurant-outline',
      title: 'Special occasion',
      description: 'Ate more than usual',
      color: '#FF9800',
    },
    {
      type: 'off_day' as DayType,
      icon: 'medical-outline',
      title: 'Off day',
      description: 'Sick, traveling, or busy',
      color: '#9E9E9E',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3D5A5C" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#3D5A5C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Check-in</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.question}>How did yesterday go?</Text>
            <Text style={styles.subtitle}>
              {hasCheckedIn ? 'You can update your response' : 'This helps us understand your patterns'}
            </Text>

            <View style={styles.optionsContainer}>
              {dayOptions.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.optionCard,
                    selectedDayType === option.type && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedDayType(option.type)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconCircle, { backgroundColor: option.color + '20' }]}>
                    <Ionicons name={option.icon as any} size={28} color={option.color} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  {selectedDayType === option.type && (
                    <Ionicons name="checkmark-circle" size={24} color="#3D5A5C" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Optional Notes */}
            {selectedDayType && selectedDayType !== 'normal' && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>
                  Add a note (optional)
                </Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g., Birthday dinner, vacation, felt sick..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Extra padding for keyboard */}
            <View style={styles.bottomPadding} />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, (!selectedDayType || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!selectedDayType || saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : hasCheckedIn ? 'Update Check-in' : 'Save Check-in'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  question: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D5A5C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#3D5A5C',
    backgroundColor: '#F5F7F7',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  notesSection: {
    marginTop: 16,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D5A5C',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#3D5A5C',
    minHeight: 100,
  },
  bottomPadding: {
    height: 300,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: '#F5F1E8',
  },
  saveButton: {
    backgroundColor: '#3D5A5C',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});