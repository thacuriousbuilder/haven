

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '@/contexts/onboardingContext';
import { Colors } from '@/constants/colors';
import { PlanPath } from '@/types/onboarding';

export default function PlanPathScreen() {
  const { data, updateData } = useOnboarding();
  const [selected, setSelected] = useState<PlanPath | null>(data.planPath);

  const handleContinue = () => {
    if (!selected) return;
    updateData({ planPath: selected });
    if (selected === 'baseline') {
      router.push('/newflow/whyWorks3');
    } else {
      router.push('/(auth)/signup');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Your plan is almost ready!</Text>
        <Text style={styles.subtitle}>
          Both paths lead to a weekly calorie budget. One is personalized. the other estimated.
        </Text>

        {/* Baseline option */}
        <TouchableOpacity
          style={[styles.card, selected === 'baseline' && styles.cardSelected]}
          onPress={() => setSelected('baseline')}
          activeOpacity={0.8}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="time-outline" size={24} color="#fff" />
            </View>
            <View style={styles.cardText}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>Learn me first</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>RECOMMENDED</Text>
                </View>
              </View>
              <Text style={styles.cardDescription}>
                Track normally for 7 days. Haven learns your real metabolism and builds a budget that actually fits.
              </Text>
            </View>
            <View style={[styles.radio, selected === 'baseline' && styles.radioSelected]}>
              {selected === 'baseline' && <View style={styles.radioDot} />}
            </View>
          </View>
        </TouchableOpacity>

        {/* Estimate option */}
        <TouchableOpacity
          style={[styles.card, selected === 'estimate' && styles.cardSelected]}
          onPress={() => setSelected('estimate')}
          activeOpacity={0.8}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="flash-outline" size={24} color="#fff" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Start with an estimate</Text>
              <Text style={styles.cardDescription}>
                Get a weekly budget now based on your age, height, weight, and activity. you can always refine it later.
              </Text>
            </View>
            <View style={[styles.radio, selected === 'estimate' && styles.radioSelected]}>
              {selected === 'estimate' && <View style={styles.radioDot} />}
            </View>
          </View>
        </TouchableOpacity>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Most HAVEN users who complete the 7-day baseline see better long-term results because their plan is built on real data, not assumptions
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.vividTeal,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.energyOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  badge: {
    backgroundColor: Colors.energyOrange,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: '#fff',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  infoCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: Colors.graphite,
    fontSize: 17,
    fontWeight: '600',
  },
});