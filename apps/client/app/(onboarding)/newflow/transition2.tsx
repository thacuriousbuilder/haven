

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BackButton } from '@/components/onboarding/backButton';

export default function Transition2Screen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={() => router.push('/newflow/gender')}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <BackButton />
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={styles.mutedText}>You're already moving forward.</Text>
          <View style={styles.divider} />
          <Text style={styles.mainText}>
            Now let's build{' '}
            <Text style={styles.tealText}>your plan.</Text>
          </Text>
        </Animated.View>

        <Animated.View style={[styles.tapPrompt, { opacity: fadeAnim }]}>
          <Text style={styles.tapText}>Tap to continue</Text>
        </Animated.View>
      </SafeAreaView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131311',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  mutedText: {
    fontSize: 28,
    color: '#6B6965',
    fontWeight: '400',
    lineHeight: 36,
    marginBottom: 24,
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: '#206E6B',
    marginBottom: 24,
  },
  mainText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 36,
  },
  tealText: {
    color: '#206E6B',
  },
  tapPrompt: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  tapText: {
    fontSize: 14,
    color: '#6B6965',
    fontWeight: '400',
  },
});