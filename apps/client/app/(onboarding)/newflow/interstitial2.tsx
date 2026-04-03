

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BackButton } from '@/components/onboarding/backButton';

export default function Interstitial2Screen() {
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
      onPress={() => router.push('/newflow/whyWorks1')}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <BackButton backgroundColor="#000" iconColor="#fff"  />
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={styles.mutedText}>It's not a willpower problem.</Text>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>THE REAL ISSUE</Text>
            <Text style={styles.cardText}>
              It's a{' '}
              <Text style={styles.orangeText}>planning</Text>
              {'\n'}problem
            </Text>
          </View>
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
    backgroundColor: '#206E6B',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  mutedText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999896',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#131311',
    lineHeight: 40,
  },
  orangeText: {
    color: '#EF7828',
  },
  tapPrompt: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  tapText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
});