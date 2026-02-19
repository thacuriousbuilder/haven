import { Stack } from 'expo-router';
import { OnboardingProvider } from '@/contexts/onboardingContext';
import { requestNotificationPermissions } from "@/hooks/useNotificationPermissions";
import { useEffect } from 'react';
import { usePushToken } from "@/hooks/usePushToken";
import * as Notifications from 'expo-notifications'
import { configureGoogleSignIn } from '@/lib/auth';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})
export default function RootLayout() {
  usePushToken();
  useEffect(() => {
    requestNotificationPermissions();
    configureGoogleSignIn();
  }, []);
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
