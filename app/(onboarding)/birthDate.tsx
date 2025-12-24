import React, { useState } from 'react';
import { View, Text, StyleSheet,TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useOnboarding } from '@/contexts/onboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { ContinueButton } from '@/components/onboarding/continueButton';
import { BackButton } from '@/components/onboarding/backButton';
import { Picker } from '@react-native-picker/picker';

export default function BirthdateScreen() {
  const { data, updateData } = useOnboarding();
  
  const [month, setMonth] = useState(data.birthMonth || 1);
  const [day, setDay] = useState(data.birthDay || 1);
  const [year, setYear] = useState(data.birthYear || 2000);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleContinue = () => {
    updateData({ birthMonth: month, birthDay: day, birthYear: year });
    router.push('/(onboarding)/heightWeight');
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={2} totalSteps={15} />
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>We'll use this later —</Text>
        <Text style={styles.subtitle}>after we understand</Text>
        <Text style={styles.subtitle}>how you actually eat.</Text>
        
        <Text style={styles.title}>When were you born?</Text>
        <Text style={styles.description}>This will be use to tailor your plan.</Text>

        <View style={styles.pickerContainer}>
          <View style={styles.monthColumn}>
            <Picker
              selectedValue={month}
              onValueChange={setMonth}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {months.map((m, i) => (
                <Picker.Item key={i} label={m} value={i + 1} />
              ))}
            </Picker>
          </View>

          <View style={styles.dayColumn}>
            <Picker
              selectedValue={day}
              onValueChange={setDay}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <Picker.Item key={d} label={d.toString()} value={d} />
              ))}
            </Picker>
          </View>

          <View style={styles.yearColumn}>
            <Picker
              selectedValue={year}
              onValueChange={setYear}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {Array.from({ length: 100 }, (_, i) => 2024 - i).map((y) => (
                <Picker.Item key={y} label={y.toString()} value={y} />
              ))}
            </Picker>
          </View>
        </View>
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
  pickerContainer: {
    flexDirection: 'row',
    marginTop: 40,
    height: 200,
    gap: 8,
  },
  monthColumn: {
    flex: 1,  // Give month more space for "September", "December", etc.
  },
  dayColumn: {
    flex: 1,  // Day needs less space (just 1-31)
  },
  yearColumn: {
    flex: 1,  // Year needs moderate space (4 digits)
  },
  picker: {
    height: 200,
    width: '120%',
  },
  pickerItem: {
    fontSize: 13,  // Slightly smaller to fit better
    height: 200,
    color: '#3D5A5C',
  },
});