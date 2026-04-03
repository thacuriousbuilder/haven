
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { BackButton } from '@/components/onboarding/backButton';

export default function Transition1Screen() {
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
      onPress={() => router.push('/newflow/whyWorks2')}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <BackButton backgroundColor="#000" iconColor="#fff"  />
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.card}>
            <View style={styles.iconsRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#F4C5A8' }]}>
                <Text style={styles.emoji}>🍨</Text>
              </View>
              <View style={[styles.iconCircle, { backgroundColor: '#A8D5B5' }]}>
                <Text style={styles.emoji}>🥗</Text>
              </View>
              <View style={[styles.iconCircle, { backgroundColor: '#F4A8B5' }]}>
                <Text style={styles.emoji}>🥩</Text>
              </View>
            </View>

            <Text style={styles.cardText}>
              Enjoying food was never supposed to feel like{' '}
              <Text style={styles.orangeText}>failure</Text>
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
    backgroundColor: Colors.vividTeal,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
  },
  iconsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    justifyContent:'center'
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  cardText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#131311',
    lineHeight: 30,
  },
  orangeText: {
    color: Colors.energyOrange,
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