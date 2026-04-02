

import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/colors';

interface BudgetAdjustmentBannerProps {
  cumulativeOverage: number;
  adjustedBudget: number;
  baseBudget: number;
  weekStartDate: string;
}

const BANNER_THRESHOLD = 150;
const STORAGE_KEY = 'budget_banner_dismissed_week';

export function BudgetAdjustmentBanner({
  cumulativeOverage,
  adjustedBudget,
  baseBudget,
  weekStartDate,
}: BudgetAdjustmentBannerProps) {
  const [visible, setVisible] = React.useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!weekStartDate) return;
    checkShouldShow();
  }, [cumulativeOverage, weekStartDate]);

  const checkShouldShow = async () => {
    if (cumulativeOverage <= BANNER_THRESHOLD) return;

    const dismissedWeek = await AsyncStorage.getItem(STORAGE_KEY);
    if (dismissedWeek === weekStartDate) return;

    setVisible(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      setVisible(false);
      await AsyncStorage.setItem(STORAGE_KEY, weekStartDate);
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <View style={styles.bannerContent}>
        <Ionicons name="alert-circle" size={20} color={Colors.energyOrange} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Budget adjusted for this week</Text>
          <Text style={styles.subtext}>
            You went {cumulativeOverage} cal over yesterday. HAVEN recommends{' '}
            {adjustedBudget.toLocaleString()} cal today instead of your usual{' '}
            {baseBudget.toLocaleString()} cal.
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
        <Text style={styles.dismissText}>Got it</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF7ED',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.energyOrange,
    gap: Spacing.md,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: '#92400E',
    marginBottom: 2,
  },
  subtext: {
    fontSize: Typography.fontSize.xs,
    color: '#B45309',
    lineHeight: 18,
  },
  dismissButton: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.energyOrange,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  dismissText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});