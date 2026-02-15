import { Stack } from 'expo-router';
import { OnboardingProvider } from '@/contexts/onboardingContext';

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </OnboardingProvider>
  );
}
