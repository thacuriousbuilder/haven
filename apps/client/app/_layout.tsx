import { router, Stack } from 'expo-router';
import { OnboardingProvider } from '@/contexts/onboardingContext';
import { requestNotificationPermissions } from "@/hooks/useNotificationPermissions";
import { useEffect, useRef, useState } from 'react';
import { usePushToken } from "@/hooks/usePushToken";
import * as Notifications from 'expo-notifications';
import { configureGoogleSignIn } from '@/lib/auth';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.APP_VARIANT || 'production',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

configureGoogleSignIn();
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

export default Sentry.wrap(function RootLayout() {
  const [isMounted, setIsMounted] = useState(false);
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener> | null>(null);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  useEffect(() => {
    setIsMounted(true);
    AsyncStorage.removeItem('budget_banner_dismissed_date');
  }, []);
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received in foreground:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('👆 Notification tapped, data:', data);

      if (data?.type === 'message' && data?.sender_id) {
        router.push('/messages');
      }
      
      if (data?.type === 'evening_recap') {
        router.push('/(tabs)/weekly?showEveningRecap=true');
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
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
  
      <Stack.Screen
    name="dailyCheckin"
    options={{
      presentation: 'modal',
      animation: 'slide_from_bottom',
      headerShown: false,
      gestureEnabled: true,
    }}
  />
  </Stack>
    </OnboardingProvider>
  );
});