
import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { BackButton } from '@/components/onboarding/backButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export default function BirthdateScreen() {
  const { data, updateData } = useOnboarding();
  
  const getInitialDate = () => {
    if (data.birthMonth && data.birthDay && data.birthYear) {
      return new Date(data.birthYear, data.birthMonth - 1, data.birthDay);
    }
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 25);
    return defaultDate;
  };

  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [showPicker, setShowPicker] = useState(false);

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
    const age = calculateAge(selectedDate);
    
   
    if (age < 13) {
      Alert.alert('Age Requirement', 'You must be at least 13 years old to use HAVEN.');
      return;
    }

   
    if (age > 120) {
      Alert.alert('Invalid Date', 'Please select a valid birth date.');
      return;
    }

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
      <ProgressBar currentStep={4} totalSteps={14} />
      
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>When were you born?</Text>
          <Text style={styles.description}>
            This will be use to tailor your plan.
          </Text>

         
          <View style={styles.ageCard}>
            <Text style={styles.ageLabel}>Your age</Text>
            <Text style={styles.ageValue}>{age} years old</Text>
          </View>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dateButtonContent}>
              <Ionicons name="calendar-outline" size={24} color="#000" />
              <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          
          {showPicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1924, 0, 1)}
              textColor="#000"
            />
          )}
        </View>

      
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 20,
  },
  ageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderColor:"#E5E5E5",
    borderWidth:1,
  },
  ageLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  ageValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  buttonContainer: {
    paddingBottom: 24,
  },
  continueButton: {
    backgroundColor: '#206E6B',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});