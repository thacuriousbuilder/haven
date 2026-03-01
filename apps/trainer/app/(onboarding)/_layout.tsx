import { Stack } from 'expo-router';
import { TrainerOnboardingProvider } from '@/contexts/trainerOnboardingContext';

export default function OnboardingLayout() {
  return (
    <TrainerOnboardingProvider>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="educationOne" />
      <Stack.Screen name="clientCount" />
      <Stack.Screen name="specialties" />
      <Stack.Screen name="educationTwo" />
      <Stack.Screen name="complete" />
    </Stack>
    </TrainerOnboardingProvider>
  );
}