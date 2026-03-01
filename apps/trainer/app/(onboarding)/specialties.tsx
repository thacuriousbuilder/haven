
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { useTrainerOnboarding } from '@/contexts/trainerOnboardingContext';
import { BackButton } from '@/components/backButton';


const SPECIALTIES = [
  { id: 'weight_loss', label: 'Weight loss', icon: 'trending-up-outline' },
  { id: 'muscle_gain', label: 'Muscle Gain', icon: 'flash-outline' },
  { id: 'general_fitness', label: 'General Fitness', icon: 'person-outline' },
  { id: 'sports_nutrition', label: 'Sports Nutrition', icon: 'clipboard-outline' },
  { id: 'body_recomp', label: 'Body Recomp', icon: 'trending-up-outline' },
  { id: 'lifestyle_habits', label: 'Lifestyle / Habits', icon: 'notifications-outline' },
];

export default function Specialties() {
  const [selected, setSelected] = useState<string[]>([]);
  const { setSpecialties } = useTrainerOnboarding();

  function toggleSpecialty(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }
  

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={3} />

      <View style={styles.content}>
        <Text style={styles.title}>What do you help clients with?</Text>
        <Text style={styles.subtitle}>Select all that apply</Text>

        <View style={styles.grid}>
          {SPECIALTIES.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.tile, isSelected && styles.tileSelected]}
                onPress={() => toggleSpecialty(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={isSelected ? '#206E6B' : '#555'}
                />
                <Text style={[styles.tileLabel, isSelected && styles.tileLabelSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, selected.length === 0 && styles.buttonDisabled]}
          onPress={() => {
            setSpecialties(selected);
            router.push('/(onboarding)/educationTwo');
          }}
          disabled={selected.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#131311' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 32 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileSelected: {
    borderColor: '#206E6B',
    backgroundColor: '#EBF4F4',
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  tileLabelSelected: {
    color: '#206E6B',
    fontWeight: '700',
  },
  buttonContainer: { paddingHorizontal: 24, paddingBottom: 16 },
  button: {
    backgroundColor: '#206E6B',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});