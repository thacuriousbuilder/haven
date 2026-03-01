
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { ProgressBar } from '@/components/onboarding/progressBar';
import { useTrainerOnboarding } from '@/contexts/trainerOnboardingContext';
import { BackButton } from '@/components/backButton';

const CLIENT_COUNTS = [
  { id: '0-2', label: '0-2 clients', description: 'Just getting started' },
  { id: '6-15', label: '6-15 clients', description: 'Growing practice' },
  { id: '16-30', label: '16-30 clients', description: 'Established coach' },
  { id: '30+', label: '30+ clients', description: 'High volume' },
];

export default function ClientCount() {
  const [selected, setSelected] = useState<string>('');
  const { setClientCountRange } = useTrainerOnboarding();

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ProgressBar currentStep={2} />

      <View style={styles.content}>
        <Text style={styles.title}>How many clients do you coach?</Text>

        <View style={styles.list}>
          {CLIENT_COUNTS.map((item) => {
            const isSelected = selected === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => setSelected(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.rowDescription, isSelected && styles.rowDescriptionSelected]}>
                    {item.description}
                  </Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, !selected && styles.buttonDisabled]}
          disabled={!selected}
          onPress={() => {
            setClientCountRange(selected);
            router.push('/(onboarding)/specialties');
          }}
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
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 32 },
  list: { gap: 12 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowSelected: {
    borderColor: '#206E6B',
    backgroundColor: '#EBF4F4',
  },
  rowLeft: { gap: 4 },
  rowLabel: { fontSize: 16, fontWeight: '700', color: '#131311' },
  rowLabelSelected: { color: '#206E6B' },
  rowDescription: { fontSize: 13, color: '#888' },
  rowDescriptionSelected: { color: '#206E6B' },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#206E6B' },
  radioDot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: '#206E6B',
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