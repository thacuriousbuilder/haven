// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getAppName = () => {
  if (IS_DEV) return 'HAVEN Dev';
  if (IS_PREVIEW) return 'HAVEN Preview';
  return 'HAVEN';
};

const getBundleId = () => {
  if (IS_DEV) return 'co.tryhaven.app.dev';
  if (IS_PREVIEW) return 'co.tryhaven.app.preview';
  return 'co.tryhaven.app';
};

const getRuntimeVersion = () => {
  const base = '1.0.0'; // bump when native code changes
  if (IS_DEV) return `${base}-dev`;
  if (IS_PREVIEW) return `${base}-preview`;
  return base;
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'haven',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon1.png',
  scheme: 'haven',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#131311',
  },
  ios: {
    bundleIdentifier: getBundleId(),
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription:
        'HAVEN uses your camera to identify food and log meals, and to update your profile photo.',
      NSPhotoLibraryUsageDescription:
        'HAVEN accesses your photo library so you can log meals from existing photos.',
    },
  },
  android: {
    package: getBundleId(),
    versionCode: 4,
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon1.png',
      backgroundColor: '#206E6B',
    },
    permissions: ['android.permission.POST_NOTIFICATIONS'],
  },
  notification: {
    icon: './assets/icon1.png',
    color: '#206E6B',
    androidMode: 'default',
    androidCollapsedTitle: 'HAVEN Updates',
  },
  plugins: [
    [
      'expo-notifications',
      {
        icon: './assets/icon1.png',
        color: '#206E6B',
      },
    ],
    'expo-apple-authentication',
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme:
          'com.googleusercontent.apps.34620264454-bmm1u19r4cln7pfom1qng4ig4b174hah',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'c4c2ea3b-3057-4367-8c23-1923327c23ca',
    },
  },


  runtimeVersion: getRuntimeVersion(),

  updates: {
    url: 'https://u.expo.dev/c4c2ea3b-3057-4367-8c23-1923327c23ca',
  },
});