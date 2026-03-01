
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';

const TEAL_CARD = 'rgba(255,255,255,0.12)';
const TEAL_CARD_DARK = 'rgba(255,255,255,0.08)';

export default function BaselineCompleteScreen() {
  const {
    baselineAverage,
    reportedActivityLevel,
    actualActivityLevel,
    daysUsed,
    isEstimated,
  } = useLocalSearchParams<{
    baselineAverage: string;
    reportedActivityLevel: string;
    actualActivityLevel: string;
    daysUsed: string;
    isEstimated?: string;
  }>();

  const average = Number(baselineAverage) || 0;
  const days = Number(daysUsed) || 7;
  const weeklyBudget = average * 7;

  const estimated = isEstimated === 'true';

  const activityChanged =
    reportedActivityLevel &&
    actualActivityLevel &&
    reportedActivityLevel.toLowerCase() !== actualActivityLevel.toLowerCase();

  const getActivityLabel = (level?: string) => {
    if (!level) return '';
    const labels: Record<string, string> = {
      not_very_active: 'Sedentary',
      lightly_active: 'Lightly Active',
      moderately_active: 'Moderately Active',
      very_active: 'Very Active',
    };
    return labels[level.toLowerCase()] || level;
  };

  const handleUnlock = () => {
    router.replace({
      pathname: '/paywall',
      params: { 
        weeklyBudget: String(weeklyBudget),
        isEstimated: isEstimated || 'false',
       },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Icon + Badge */}
        <View style={styles.iconRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={32} color={Colors.white} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{days}</Text>
            </View>
          </View>
        </View>

        {/* Header */}
        <Text style={styles.label}>
        {estimated ? 'YOUR STARTING PLAN' : 'BASELINE COMPLETE'}
        </Text>
        <Text style={styles.headline}>
        {estimated ? "We built a starting point for you." : "Your body has spoken."}
        </Text>
        <Text style={styles.subheadline}>
        {estimated
            ? "Based on your profile. It gets more accurate the more you log."
            : "We didn't guess. We learned. Here's your real number."}
        </Text>

        {/* Budget Card */}
        <View style={styles.budgetCard}>
        <Text style={styles.budgetLabel}>
        {estimated ? 'YOUR ESTIMATED WEEKLY BUDGET' : 'YOUR REAL WEEKLY BUDGET'}
        </Text>
          <Text style={styles.budgetNumber}>{weeklyBudget.toLocaleString()}</Text>
          <Text style={styles.budgetUnit}>calories per week</Text>
          <View style={styles.divider} />
          <View style={styles.budgetRow}>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatLabel}>DAILY AVERAGE</Text>
              <Text style={styles.budgetStatValue}>{average.toLocaleString()}</Text>
            </View>
            <View style={styles.budgetDividerV} />
            <View style={styles.budgetStat}>
              <Text style={styles.budgetStatLabel}>BASED ON</Text>
              <Text style={styles.budgetStatValue}>{days} days</Text>
            </View>
          </View>
        </View>

        {/* Activity Card */}
        {!estimated && (
        <View style={styles.activityCard}>
          <View style={styles.activityIconCircle}>
            <Ionicons name="pulse" size={20} color={Colors.white} />
          </View>
          {activityChanged ? (
            <View style={styles.activityContent}>
              <View style={styles.activityRow}>
                <View>
                  <Text style={styles.activityMeta}>Reported:</Text>
                  <Text style={styles.activityValue}>
                    {getActivityLabel(reportedActivityLevel)}
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={Colors.white}
                  style={{ marginHorizontal: 8, marginTop: 12 }}
                />
                <View>
                  <Text style={styles.activityMeta}>Actual:</Text>
                  <Text style={[styles.activityValue, styles.activityOrange]}>
                    {getActivityLabel(actualActivityLevel)}
                  </Text>
                </View>
              </View>
              <Text style={styles.activityNote}>
                We've adjusted your plan to match your actual activity
              </Text>
            </View>
          ) : (
            <View style={styles.activityContent}>
              <View style={styles.activityRow}>
                <View>
                  <Text style={styles.activityMeta}>Reported:</Text>
                  <Text style={styles.activityValue}>
                    {getActivityLabel(reportedActivityLevel)}
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={Colors.white}
                  style={{ marginHorizontal: 8, marginTop: 12 }}
                />
                <View>
                  <Text style={styles.activityMeta}>Actual:</Text>
                  <Text style={[styles.activityValue, styles.activityOrange]}>
                    {getActivityLabel(actualActivityLevel)}
                  </Text>
                </View>
              </View>
              <Text style={styles.activityNote}>
                Your activity matches what you reported — your plan is perfectly calibrated.
              </Text>
            </View>
          )}
        </View>
        )}

        {/* Flame Card */}
        <View style={styles.flameCard}>
        <Ionicons name={estimated ? "sparkles" : "flame"} size={20} color={Colors.energyOrange} />
        <View style={styles.flameContent}>
            <Text style={styles.flameTitle}>
            {estimated ? "This is your starting point." : "This number is yours."}
            </Text>
            <Text style={styles.flameText}>
            {estimated
                ? "We estimated this from your profile. Log your meals and it'll get more personal over time. Unlock your full weekly plan to get started."
                : `Not a formula. Not a guess. A plan built from ${days} days of your real life. Unlock your full weekly plan with smart features to stay on track.`
            }
            </Text>
        </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleUnlock}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Unlock My Plan</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.vividTeal,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: 'center',
  },

  // Icon
  iconRow: { alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: TEAL_CARD_DARK,
    justifyContent: 'center', alignItems: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.energyOrange,
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: Colors.white, fontSize: 12, fontWeight: '700' },

  // Header
  label: {
    fontSize: 12, fontWeight: '700', color: Colors.energyOrange,
    letterSpacing: 1.5, marginBottom: 12, textAlign: 'center',
  },
  headline: {
    fontSize: 30, fontWeight: '800', color: Colors.white,
    textAlign: 'center', marginBottom: 10,
  },
  subheadline: {
    fontSize: 15, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },

  // Budget Card
  budgetCard: {
    backgroundColor: TEAL_CARD,
    borderRadius: 16, padding: 20,
    width: '100%', alignItems: 'center', marginBottom: 16,
  },
  budgetLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1, marginBottom: 12, textAlign: 'center',
  },
  budgetNumber: {
    fontSize: 52, fontWeight: '800', color: Colors.white, marginBottom: 4,
  },
  budgetUnit: {
    fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 16,
  },
  divider: {
    width: '100%', height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 16,
  },
  budgetRow: { flexDirection: 'row', width: '100%', alignItems: 'center' },
  budgetStat: { flex: 1, alignItems: 'center' },
  budgetStatLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5, marginBottom: 4,
  },
  budgetStatValue: { fontSize: 22, fontWeight: '700', color: Colors.white },
  budgetDividerV: {
    width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // Activity Card
  activityCard: {
    backgroundColor: TEAL_CARD,
    borderRadius: 16, padding: 16,
    width: '100%', flexDirection: 'row',
    alignItems: 'flex-start', gap: 12, marginBottom: 16,
  },
  activityIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.energyOrange,
    justifyContent: 'center', alignItems: 'center',
  },
  activityContent: { flex: 1 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  activityMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  activityValue: { fontSize: 14, fontWeight: '700', color: Colors.white },
  activityOrange: { color: Colors.energyOrange },
  activityNote: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 18 },

  // Flame Card
  flameCard: {
    backgroundColor: TEAL_CARD_DARK,
    borderRadius: 16, padding: 16,
    width: '100%', flexDirection: 'row',
    gap: 12, alignItems: 'flex-start', marginBottom: 28,
  },
  flameContent: { flex: 1 },
  flameTitle: { fontSize: 15, fontWeight: '700', color: Colors.white, marginBottom: 6 },
  flameText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },

  // CTA
  ctaButton: {
    backgroundColor: Colors.energyOrange,
    borderRadius: 50, paddingVertical: 18,
    width: '100%', flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: Colors.white },
});