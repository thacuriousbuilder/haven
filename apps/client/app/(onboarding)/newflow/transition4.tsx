// apps/client/app/(onboarding)/transition4.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { BackButton } from '@/components/onboarding/backButton';

export default function Transition4Screen() {
  const handleContinue = () => {
    router.push('/(auth)/signup');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handleContinue}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <BackButton backgroundColor="#000" iconColor="#fff"  />
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="heart-outline" size={36} color="#fff" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Thank you for trusting us{'\n'}with your journey!</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            We'll use this to build a plan that{'\n'}actually fits your life.
          </Text>
        </View>

        {/* Tap to continue */}
        <Text style={styles.tapPrompt}>Tap to continue</Text>
      </SafeAreaView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.vividTeal,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 20,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  tapPrompt: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '400',
  },
});