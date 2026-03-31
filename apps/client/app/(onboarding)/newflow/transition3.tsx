

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function Transition3Screen() {
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
      onPress={() => router.push('/newflow/workouts')}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>👣</Text>
          </View>

          <Text style={styles.mainText}>
            How you move day to day changes everything.
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
    backgroundColor: Colors.vividTeal,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 36,
  },
  mainText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 36,
    textAlign: 'center',
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