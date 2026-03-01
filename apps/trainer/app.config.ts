
import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getAppName = () => {
  if (IS_DEV) return 'HAVEN Coach Dev';
  if (IS_PREVIEW) return 'HAVEN Coach Preview';
  return 'HAVEN Coach';
};

const getBundleId = () => {
  if (IS_DEV) return 'co.tryhaven.coach.dev';
  return 'co.tryhaven.coach';
};

const getRuntimeVersion = () => {
  const base = '1.0.0';
  if (IS_DEV) return `${base}-dev`;
  if (IS_PREVIEW) return `${base}-preview`;
  return base;
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'haven-coach',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon2.png',
  scheme: 'haven-coach',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splashNew.png',
    resizeMode: 'contain',
    backgroundColor: '#131311',
  },
  ios: {
    bundleIdentifier: getBundleId(),
    buildNumber: '1',
    supportsTablet: false,
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: getBundleId(),
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#206E6B',
    },
    permissions: ['android.permission.POST_NOTIFICATIONS'],
  },
  notification: {
    icon: './assets/icon2.png',
    color: '#206E6B',
    androidMode: 'default',
    androidCollapsedTitle: 'HAVEN Coach Updates',
  },
  plugins: [
    [
      'expo-notifications',
      {
        icon: './assets/icon2.png',
        color: '#206E6B',
      },
    ],
  ],
  extra: {
    eas: {
        projectId: '7fd8fa84-24d6-4bc0-a620-aecabd8b5717',
    },
  },
  runtimeVersion: getRuntimeVersion(),
  updates: {
    url: 'https://u.expo.dev/7fd8fa84-24d6-4bc0-a620-aecabd8b5717',
  },
});