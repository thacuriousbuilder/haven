
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { supabase } from '@haven/shared-utils';
import { useTrainerOnboarding } from '@/contexts/trainerOnboardingContext';
import { ProgressBar } from '@/components/onboarding/progressBar';

export default function Complete() {
  const [loading, setLoading] = useState(false);
  const { data } = useTrainerOnboarding();

  async function handleGetStarted() {
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('trainer_profiles')
        .upsert({
          id: user.id,
          specialties: data.specialties,
          client_count_range: data.clientCountRange,
          onboarding_completed: true,
        });

      if (error) throw error;

      router.replace('/(tabs)/home');

    } catch (error: any) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar currentStep={5} />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="people-outline" size={40} color="#888" />
        </View>

        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>
          Your coach dashboard is ready. Start inviting clients and watch their real data flow in.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>NEXT STEPS</Text>

          {[
            'Invite your first client via email or link',
            'They complete their 7-day baseline',
            'You see their real weekly budget in your dashboard',
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Let's get started!</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#131311' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },
  iconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 12 },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.65)',
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    gap: 16,
  },
  cardLabel: {
    fontSize: 11, fontWeight: '700',
    color: '#888', letterSpacing: 1.2,
    marginBottom: 4,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#206E6B',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 22 },
  buttonContainer: { paddingHorizontal: 24, paddingBottom: 16 },
  button: {
    backgroundColor: '#206E6B',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});