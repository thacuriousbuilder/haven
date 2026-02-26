import { Stack } from 'expo-router';
import { OnboardingProvider } from '@/contexts/onboardingContext';
import { requestNotificationPermissions } from "@/hooks/useNotificationPermissions";
import { useEffect, useState } from 'react';
import { usePushToken } from "@/hooks/usePushToken";
import * as Notifications from 'expo-notifications';
import { configureGoogleSignIn } from '@/lib/auth';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
const REVENUECAT_GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  usePushToken();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    requestNotificationPermissions();
    configureGoogleSignIn();

    const apiKey = Platform.OS === 'ios'
      ? REVENUECAT_APPLE_KEY
      : REVENUECAT_GOOGLE_KEY;

    if (apiKey) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey });
    } else {
      console.warn('RevenueCat API key missing for platform:', Platform.OS);
    }
  }, [isMounted]);

  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="baselineComplete"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
      </Stack>
    </OnboardingProvider>
  );
}