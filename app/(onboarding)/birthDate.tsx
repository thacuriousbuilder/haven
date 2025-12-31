import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export default function BirthdateScreen() {
  const { data, updateData } = useOnboarding();
  
  // Initialize with existing birthdate or default to 25 years ago
  const getInitialDate = () => {
    if (data.birthMonth && data.birthDay && data.birthYear) {
      return new Date(data.birthYear, data.birthMonth - 1, data.birthDay);
    }
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 25);
    return defaultDate;
  };

  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const formatDate = (date: Date) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleContinue = () => {
    updateData({ 
      birthMonth: selectedDate.getMonth() + 1,
      birthDay: selectedDate.getDate(),
      birthYear: selectedDate.getFullYear(),
    });
    router.push('/(onboarding)/heightWeight');
  };

  const age = calculateAge(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={2} totalSteps={15} />
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>We'll use this later —</Text>
        <Text style={styles.subtitle}>after we understand</Text>
        <Text style={styles.subtitle}>how you actually eat.</Text>
        
        <Text style={styles.title}>When were you born?</Text>
        <Text style={styles.description}>
          This will be used to tailor your plan.
        </Text>

          {/* Age Display */}
        <View style={styles.ageCard}>
          <Text style={styles.ageLabel}>Your age</Text>
          <Text style={styles.ageValue}>{age} years old</Text>
        </View>

        {/* Date Display / Picker Trigger (Android) */}
        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
          >
            <View style={styles.dateButtonContent}>
              <Ionicons name="calendar-outline" size={24} color="#3D5A5C" />
              <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* iOS: Always show picker */}
        {/* Android: Show when triggered */}
        {showPicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1924, 0, 1)}
              textColor="#3D5A5C"
              style={styles.picker}
            />
          </View>
        )}
      </View>
      <ContinueButton onPress={handleContinue} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  subtitle: {
    fontSize: 16,
    color: '#3D5A5C',
    fontWeight: '600',
    lineHeight: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3D5A5C',
    marginTop: 32,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D5A5C',
  },
  pickerContainer: {
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 200 : undefined,
  },
  ageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 5,
  },
  ageLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ageValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3D5A5C',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});