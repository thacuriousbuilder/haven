
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

const NEGATIVE_KEY = 'budget_banner_negative_state';
const POSITIVE_KEY = 'budget_banner_positive_state';

interface BannerState {
  weekStart: string;
  count: number;
}

const NEGATIVE_COPY = [
  {
    title: 'Budget adjusted',
    sub: "You're {over} cal over this week. Today's goal is {adjusted} cal.",
  },
  {
    title: "Let's get back on track",
    sub: "You're {over} cal over this week. Today's goal is {adjusted} cal.",
  },
  {
    title: 'Tough week?',
    sub: "No worries. You're {over} cal over this week. Today's goal is {adjusted} cal.",
  },
];

const POSITIVE_COPY = [
  {
    title: "You're ahead this week",
    sub: "You've got {under} cal to play with. Today's goal is {adjusted} cal.",
  },
  {
    title: 'Still going strong',
    sub: "You're {under} cal under this week. Today's goal is {adjusted} cal.",
  },
  {
    title: 'Great week so far',
    sub: "You've got {under} cal extra. Today's goal is {adjusted} cal.",
  },
];

export function BudgetAdjustmentBanner({
  cumulativeOverage,
  adjustedBudget,
  baseBudget,
  weekStartDate,
}: BudgetAdjustmentBannerProps) {
  const [visible, setVisible] = React.useState(false);
  const [copyIndex, setCopyIndex] = React.useState(0);
  const [isPositive, setIsPositive] = React.useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  // 15% of base budget — scales with user's daily target
  const BANNER_THRESHOLD = Math.round(baseBudget * 0.15);

  useEffect(() => {
    if (!weekStartDate) return;
    checkShouldShow();
  }, [cumulativeOverage, weekStartDate]);

  const checkShouldShow = async () => {
    console.log('🏷️ Banner check:', {
      cumulativeOverage,
      baseBudget,
      threshold: Math.round(baseBudget * 0.15),
      weekStartDate,
    });
    // Not significant enough either way — do nothing
    if (Math.abs(cumulativeOverage) <= BANNER_THRESHOLD) return;

    const positive = cumulativeOverage < 0;
    const storageKey = positive ? POSITIVE_KEY : NEGATIVE_KEY;

    try {
      const raw = await AsyncStorage.getItem(storageKey);
      let state: BannerState = raw
        ? JSON.parse(raw)
        : { weekStart: weekStartDate, count: 0 };

      // Reset if new week
      if (state.weekStart !== weekStartDate) {
        state = { weekStart: weekStartDate, count: 0 };
      }

      // Cap at 3 shows per week per banner type
      if (state.count >= 3) return;

      // Set which copy to show
      setCopyIndex(state.count);
      setIsPositive(positive);

      // Increment and save
      const newState: BannerState = {
        weekStart: weekStartDate,
        count: state.count + 1,
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(newState));

      // Show banner
      setVisible(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error('Error in BudgetAdjustmentBanner:', error);
    }
  };

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  if (!visible) return null;

  const copy = isPositive ? POSITIVE_COPY[copyIndex] : NEGATIVE_COPY[copyIndex];

  // Positive: cumulativeOverage is negative so abs gives the saving amount
  const subtext = isPositive
    ? copy.sub
        .replace('{under}', Math.abs(cumulativeOverage).toLocaleString())
        .replace('{adjusted}', adjustedBudget.toLocaleString())
    : copy.sub
        .replace('{over}', cumulativeOverage.toLocaleString())
        .replace('{adjusted}', adjustedBudget.toLocaleString());

  return (
    <Animated.View style={[
      styles.banner,
      isPositive ? styles.bannerPositive : styles.bannerNegative,
      { opacity },
    ]}>
      <View style={styles.bannerContent}>
        <Ionicons
          name={isPositive ? 'trending-down' : 'information-circle'}
          size={20}
          color={isPositive ? Colors.vividTeal : Colors.energyOrange}
        />
        <View style={styles.textContainer}>
          <Text style={[
            styles.title,
            isPositive ? styles.titlePositive : styles.titleNegative,
          ]}>
            {copy.title}
          </Text>
          <Text style={[
            styles.subtext,
            isPositive ? styles.subtextPositive : styles.subtextNegative,
          ]}>
            {subtext}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.dismissButton,
          isPositive ? styles.dismissButtonPositive : styles.dismissButtonNegative,
        ]}
        onPress={handleDismiss}
      >
        <Text style={styles.dismissText}>Got it</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    gap: Spacing.md,
  },
  bannerNegative: {
    backgroundColor: '#FFF7ED',
    borderLeftColor: Colors.energyOrange,
  },
  bannerPositive: {
    backgroundColor: '#F0F9F8',
    borderLeftColor: Colors.vividTeal,
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
    marginBottom: 2,
  },
  titleNegative: {
    color: '#92400E',
  },
  titlePositive: {
    color: '#0F5C59',
  },
  subtext: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  subtextNegative: {
    color: '#B45309',
  },
  subtextPositive: {
    color: '#206E6B',
  },
  dismissButton: {
    alignSelf: 'flex-end',
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  dismissButtonNegative: {
    backgroundColor: Colors.energyOrange,
  },
  dismissButtonPositive: {
    backgroundColor: Colors.vividTeal,
  },
  dismissText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});