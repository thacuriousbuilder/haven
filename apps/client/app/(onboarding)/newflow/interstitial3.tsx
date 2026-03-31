

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export default function Interstitial4Screen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Almost done.</Text>
          <Text style={styles.subtitle}>Now let's set your preferences</Text>
        </View>

        <View style={styles.rows}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(onboarding)/mealTimes')}
            activeOpacity={0.8}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Text style={styles.emoji}>⏰</Text>
              </View>
              <View>
                <Text style={styles.rowTitle}>Meal times</Text>
                <Text style={styles.rowSubtitle}>When do you usually eat?</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(onboarding)/eveningRecap')}
            activeOpacity={0.8}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Text style={styles.emoji}>🌙</Text>
              </View>
              <View>
                <Text style={styles.rowTitle}>Evening recap</Text>
                <Text style={styles.rowSubtitle}>Daily reflection reminder</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View style={[styles.tapPrompt, { opacity: fadeAnim }]}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => router.push('/newflow/allowNotification')}
        >
          <Text style={styles.tapText}>Tap to continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.vividTeal,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 32,
  },
  textContainer: {
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  rows: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  tapPrompt: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  tapText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
  },
});