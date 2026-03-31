

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useOnboarding } from '@/contexts/onboardingContext';
import { supabase } from '@haven/shared-utils';
import { Colors } from '@/constants/colors';
import { calculateBMR, calculateTDEE, adjustForGoal } from '@/utils/calorieCalculator';
import { formatDateComponents, getLocalDateString } from '@haven/shared-utils';

const PACKAGE_META: Record<string, {
  label: string; price: string; sub: string;
  badge: string | null; badgeStyle: 'orange' | 'white' | null;
}> = {
  lifetime: { label: 'Lifetime', price: '$99.99/one-time', sub: 'Pay once, own it', badge: 'LAUNCH SPECIAL', badgeStyle: 'orange' },
  annual:   { label: 'Annual',   price: '$49.99/year',     sub: 'Save 48%',         badge: 'BEST VALUE',    badgeStyle: 'white' },
  monthly:  { label: 'Monthly',  price: '$7.99/mo',        sub: '',                 badge: null,            badgeStyle: null },
};

export default function PaywallBaselineScreen() {
  const { data, resetData } = useOnboarding();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedId, setSelectedId] = useState('lifetime');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOfferings();
    saveBaselineProfile();
  }, []);

  const saveBaselineProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const birthDate = formatDateComponents(
        data.birthYear || 1990,
        data.birthMonth || 1,
        data.birthDay || 1
      );

      const bmr = calculateBMR(
        data.gender || 'other',
        data.currentWeight || 150,
        data.heightFeet || 5,
        data.heightInches || 0,
        birthDate
      );

      const tdee = calculateTDEE(bmr, data.activityLevel || 'lightly_active');
      const adjustedDaily = adjustForGoal(
        tdee,
        data.goal || 'lose',
        data.goalWeight,
        data.currentWeight
      );
      const dailyDeficit = tdee - adjustedDaily;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          user_type: 'client',
          first_name: data.firstName || user.user_metadata?.first_name || '',
          last_name: data.lastName || user.user_metadata?.last_name || '',
          gender: data.gender || 'other',
          birth_date: birthDate,
          unit_system: data.unitSystem || 'imperial',
          height_ft: data.heightFeet || 5,
          height_in: data.heightInches || 0,
          weight_lbs: data.currentWeight || 150,
          target_weight_lbs: data.goalWeight || data.currentWeight || 150,
          weekly_weight_goal: data.weeklyGoalRate,
          goal: data.goal || 'maintain',
          workouts_per_week: data.workoutFrequency || '0-2',
          activity_level: data.activityLevel || 'lightly_active',
          plan_path: 'baseline',
          choose_goals: data.chooseGoals,
          choose_obstacles: data.chooseObstacles,
          meal_times_enabled: data.mealTimesEnabled,
          breakfast_time: data.breakfastTime,
          lunch_time: data.lunchTime,
          dinner_time: data.dinnerTime,
          evening_recap_enabled: data.eveningRecapEnabled,
          evening_recap_time: data.eveningRecapTime,
          push_notifications_enabled: data.notificationsEnabled,
          bmr,
          daily_deficit: dailyDeficit,
          baseline_start_date: getLocalDateString(),
          baseline_complete: false,
          onboarding_completed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      console.log('✅ Baseline profile saved');
      await resetData();
    } catch (error) {
      console.error('❌ Error saving baseline profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        const sorted = [...offerings.current.availablePackages].sort((a, b) => {
          const order = ['lifetime', 'annual', 'monthly'];
          const aKey = Object.keys(PACKAGE_META).find(k => a.product.identifier.includes(k)) || '';
          const bKey = Object.keys(PACKAGE_META).find(k => b.product.identifier.includes(k)) || '';
          return order.indexOf(aKey) - order.indexOf(bKey);
        });
        setPackages(sorted);
      }
    } catch (e) {
      console.error('Error loading offerings:', e);
    } finally {
      setLoading(false);
    }
  };

  const getMetaKey = (pkg: PurchasesPackage) =>
    Object.keys(PACKAGE_META).find(k => pkg.product.identifier.includes(k)) || 'monthly';

  const handlePurchase = async () => {
    const pkg = packages.find(p => getMetaKey(p) === selectedId);
    if (!pkg) return;
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['HAVEN Premium']) {
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Something went wrong', 'Please restore purchases.');
      }
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert('Purchase failed', 'Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['HAVEN Premium']) {
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('No purchases found', 'No active subscription found.');
      }
    } catch {
      Alert.alert('Restore failed', 'Please try again.');
    }
  };

  const handleSkip = () => router.replace('/(tabs)/home');

  if (loading || saving) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#fff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Give us 7 days.</Text>
        <Text style={styles.subheadline}>
          We'll give you a plan built around you
        </Text>

        {/* How it works */}
        <View style={styles.stepsCard}>
          {[
            { day: 'DAY 1', title: 'Eat normally', desc: 'No rules, no restrictions. Just log what you eat.', icon: 'restaurant-outline' },
            { day: 'DAY 7', title: 'HAVEN builds your budget', desc: 'We analyze your real eating patterns and movement.', icon: 'sparkles-outline' },
            { day: 'AFTER 7 DAYS', title: 'HAVEN builds your budget', desc: 'We analyze your real eating patterns and movement.', icon: 'radio-button-on-outline' },
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon as any} size={20} color="#fff" />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepDay}>{step.day}</Text>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <Text style={styles.pricingLabel}>AFTER YOUR FREE TRIAL</Text>
        <View style={styles.packagesContainer}>
          {packages.map(pkg => {
            const key = getMetaKey(pkg);
            const meta = PACKAGE_META[key];
            const isSelected = selectedId === key;
            return (
              <TouchableOpacity
                key={pkg.identifier}
                style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                onPress={() => setSelectedId(key)}
                activeOpacity={0.8}
              >
                {meta.badge && (
                  <View style={[
                    styles.packageBadge,
                    meta.badgeStyle === 'orange' ? styles.badgeOrange : styles.badgeWhite,
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      meta.badgeStyle === 'white' && styles.badgeTextDark,
                    ]}>{meta.badge}</Text>
                  </View>
                )}
                <View style={styles.packageRow}>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.packageLabel}>{meta.label}</Text>
                  <Text style={styles.packagePrice}>{meta.price}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* No payment note */}
        <View style={styles.noPaymentRow}>
          <Ionicons name="warning-outline" size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.noPaymentText}>No payment now. Cancel anytime before day 7</Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.8}
        >
          {purchasing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>Start My 7 Days Free</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Maybe later</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL('https://tryhaven.co/terms')}>
            Terms
          </Text>
          {' '}and{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL('https://tryhaven.co/privacy')}>
            Privacy Policy
          </Text>
          . Subscriptions auto-renew unless cancelled.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.vividTeal },
  scroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 },
  headline: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subheadline: { fontSize: 16, color: Colors.energyOrange, fontWeight: '600', marginBottom: 24 },
  stepsCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 20,
    gap: 20,
    marginBottom: 24,
  },
  stepRow: { flexDirection: 'row', gap: 14 },
  stepIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { flex: 1 },
  stepDay: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: 2 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  stepDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  pricingLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2, marginBottom: 12,
  },
  packagesContainer: { gap: 10, marginBottom: 16 },
  packageCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, padding: 16,
    borderWidth: 2, borderColor: 'transparent',
    overflow: 'hidden',
  },
  packageCardSelected: { borderColor: Colors.energyOrange },
  packageBadge: {
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 12, paddingVertical: 5,
    borderBottomLeftRadius: 10,
  },
  badgeOrange: { backgroundColor: Colors.energyOrange },
  badgeWhite: { backgroundColor: '#fff' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  badgeTextDark: { color: Colors.graphite },
  packageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  radioSelected: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.2)' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  packageLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },
  packagePrice: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  noPaymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  noPaymentText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 },
  ctaContainer: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  ctaButton: {
    backgroundColor: Colors.energyOrange,
    paddingVertical: 18, borderRadius: 50, alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  restoreText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' },
  skipText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' },
  legal: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 16 },
  legalLink: { textDecorationLine: 'underline' },
});