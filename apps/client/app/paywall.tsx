
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Colors } from '@/constants/colors';

const TEAL_CARD = 'rgba(255,255,255,0.12)';
const TEAL_CARD_DARK = 'rgba(255,255,255,0.08)';

const FEATURES = [
  'Your personalized weekly calorie budget',
  'Treat day planning & auto-adjustment',
  'AI-powered food photo recognition',
  'Weekly progress reports & streaks',
  'Daily overage rollover system',
  'Smart macro recommendations',
];

const PACKAGE_META: Record<string, {
  label: string;
  price: string;
  sub: string;
  badge: string | null;
  badgeStyle: 'orange' | 'white' | null;
}> = {
  lifetime: {
    label: 'Lifetime',
    price: '$99',
    sub: 'Pay once, own it',
    badge: 'LAUNCH SPECIAL',
    badgeStyle: 'orange',
  },
  annual: {
    label: 'Annual',
    price: '$49.99/year',
    sub: 'Save 48%',
    badge: 'BEST VALUE',
    badgeStyle: 'white',
  },
  monthly: {
    label: 'Monthly',
    price: '$7.99/month',
    sub:'',
    badge: null,
    badgeStyle: null,
  },
};

export default function PaywallScreen() {
    const { weeklyBudget, isEstimated } = useLocalSearchParams<{ 
        weeklyBudget: string;
        isEstimated: string;
      }>();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedId, setSelectedId] = useState<string>('lifetime');
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const estimated = isEstimated === 'true';

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setOffering(offerings.current);
        // Order: lifetime, annual, monthly
        const sorted = [...offerings.current.availablePackages].sort((a, b) => {
          const order = ['lifetime', 'annual', 'monthly'];
          const aKey = Object.keys(PACKAGE_META).find(k =>
            a.product.identifier.includes(k)) || '';
          const bKey = Object.keys(PACKAGE_META).find(k =>
            b.product.identifier.includes(k)) || '';
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

  const getMetaKey = (pkg: PurchasesPackage) => { 
    return Object.keys(PACKAGE_META).find(k =>
      pkg.product.identifier.includes(k)
    ) || 'monthly';
  };

  const getSelectedLabel = () => {
    const pkg = packages.find(p => getMetaKey(p) === selectedId);
    if (!pkg) return 'Monthly';
    return PACKAGE_META[getMetaKey(pkg)]?.label || 'Monthly';
  };

  const handlePurchase = async () => {
    const pkg = packages.find(p => getMetaKey(p) === selectedId);
    if (!pkg) return;
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['HAVEN Premium']) {
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Something went wrong', 'Purchase completed but access could not be verified. Please restore purchases.');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', 'Please try again.');
      }
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
        Alert.alert('No purchases found', 'No active subscription found for this Apple ID.');
      }
    } catch (e) {
      Alert.alert('Restore failed', 'Please try again.');
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color={Colors.white} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <Text style={styles.label}>YOUR PLAN IS READY</Text>
        <Text style={styles.headline}>
        {estimated
            ? "We built a starting point for you."
            : "We spent 7 days learning you. Don't let that go to waste."
        }
        </Text>

        {/* Budget Card */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetTop}>
            <View>
             <Text style={styles.budgetLabel}>
                {estimated ? 'YOUR ESTIMATED WEEKLY BUDGET' : 'YOUR WEEKLY BUDGET'}
                </Text>
              <Text style={styles.budgetNumber}>
                {weeklyBudget
                  ? Number(weeklyBudget).toLocaleString()
                  : '—'}
              </Text>
              <Text style={styles.budgetUnit}>calories per week</Text>
            </View>
            <View style={styles.flameCircle}>
              <Ionicons name="fitness" size={28} color={Colors.energyOrange} />
            </View>
          </View>
          <View style={styles.budgetBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={Colors.energyOrange} />
            <Text style={styles.budgetBadgeText}>
                {estimated
                    ? <><Text>Based on </Text><Text style={styles.budgetBadgeBold}>your profile</Text><Text> — refines over time</Text></>
                    : <><Text>Built from </Text><Text style={styles.budgetBadgeBold}>your real data</Text><Text> -- not a formula</Text></>
                }
                </Text>
          </View>
        </View>

        {/* Value Prop */}
        <Text style={styles.valueHeadline}>
          Keep making sustainable progress --{' '}
          <Text style={styles.valueAccent}>guilt-free.</Text>
        </Text>
        <Text style={styles.valueSub}>
          Unlock the tools built around your body, your life, and your goals.
        </Text>

        {/* Pricing Packages */}
        <View style={styles.packagesContainer}>
          {packages.map((pkg) => {
            const key = getMetaKey(pkg);
            const meta = PACKAGE_META[key];
            const isSelected = selectedId === key;
            return (
              <TouchableOpacity
                key={pkg.product.identifier}
                style={[
                  styles.packageCard,
                  isSelected && styles.packageCardSelected,
                ]}
                onPress={() => setSelectedId(key)}
                activeOpacity={0.8}
              >
                {/* Badge */}
                {meta.badge && (
                  <View style={[
                    styles.packageBadge,
                    meta.badgeStyle === 'orange'
                      ? styles.packageBadgeOrange
                      : styles.packageBadgeWhite,
                  ]}>
                    <Text style={[
                      styles.packageBadgeText,
                      meta.badgeStyle === 'white' && styles.packageBadgeTextDark,
                    ]}>
                      {meta.badge}
                    </Text>
                  </View>
                )}

                <View style={styles.packageRow}>
                  {/* Radio */}
                  <View style={[
                    styles.radio,
                    isSelected && styles.radioSelected,
                  ]}>
                    {isSelected && (
                      <View style={styles.radioDot} />
                    )}
                  </View>

                  {/* Text */}
                  <View style={styles.packageText}>
                    <Text style={styles.packageLabel}>
                      {meta.label}{' '}
                      <Text style={styles.packagePrice}>{meta.price}</Text>
                    </Text>
                    <Text style={styles.packageSub}>{meta.sub}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>EVERYTHING YOU GET</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons
                name="checkmark"
                size={16}
                color={Colors.energyOrange}
              />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, purchasing && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.ctaText}>
                Start {getSelectedLabel()} Plan
              </Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </>
          )}
        </TouchableOpacity>
        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.freeVersion}
          onPress={handleRestore}
        >
          <Text style={styles.freeVersionText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Legal Footer */}
        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://tryhaven.co/terms')}
          >
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL('https://tryhaven.co/privacy')}
          >
            Privacy Policy
          </Text>
          {'. '}Subscriptions auto-renew unless cancelled.
        </Text>

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
    paddingTop: 56,
    paddingBottom: 48,
  },

  // Close
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.energyOrange,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 40,
    marginBottom: 24,
  },

  // Budget Card
  budgetCard: {
    backgroundColor: TEAL_CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  budgetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  budgetNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  budgetUnit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  flameCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.energyOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  budgetBadgeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  budgetBadgeBold: {
    fontWeight: '700',
    color: Colors.white,
  },

  // Value Prop
  valueHeadline: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  valueAccent: {
    color: Colors.energyOrange,
  },
  valueSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },

  // Packages
  packagesContainer: { gap: 10, marginBottom: 20 },
  packageCard: {
    backgroundColor: TEAL_CARD,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  packageCardSelected: {
    borderColor: Colors.energyOrange,
  },
  packageBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomLeftRadius: 10,
  },
  packageBadgeOrange: {
    backgroundColor: Colors.energyOrange,
  },
  packageBadgeWhite: {
    backgroundColor: Colors.white,
  },
  packageBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  packageBadgeTextDark: {
    color: Colors.graphite,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: Colors.energyOrange,
    backgroundColor: Colors.energyOrange,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  packageText: { flex: 1 },
  packageLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  packagePrice: {
    fontWeight: '400',
    color: 'rgba(255,255,255,0.75)',
  },
  packageSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },

  // Features
  featuresCard: {
    backgroundColor: TEAL_CARD_DARK,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    gap: 12,
  },
  featuresTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },

  // CTA
  ctaButton: {
    backgroundColor: Colors.energyOrange,
    borderRadius: 50,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },

  // Footer
  freeVersion: {
    alignItems: 'center',
    marginBottom: 10,
  },
  freeVersionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },
  legal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  legalLink: {
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'underline',
  },
});