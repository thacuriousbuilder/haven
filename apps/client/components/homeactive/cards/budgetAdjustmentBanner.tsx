

import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from '@haven/shared-utils';
import { Colors } from '@/constants/colors';

interface BudgetAdjustmentBannerProps {
  cumulativeOverage: number;
  adjustedBudget: number;
  baseBudget: number;
  weekStartDate: string;
}

const BANNER_THRESHOLD = 150;
const DISPLAY_DURATION = 3000;  // 3 seconds
const ANIMATE_OUT_DURATION = 400;
const STORAGE_KEY = 'budget_banner_dismissed_week';

export function BudgetAdjustmentBanner({
  cumulativeOverage,
  adjustedBudget,
  baseBudget,
  weekStartDate,
}: BudgetAdjustmentBannerProps) {
  const [visible, setVisible] = React.useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!weekStartDate) return; 
    checkShouldShow();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cumulativeOverage, weekStartDate]);

  const checkShouldShow = async () => {
    if (cumulativeOverage <= BANNER_THRESHOLD) return;

    const dismissedWeek = await AsyncStorage.getItem(STORAGE_KEY);

    if (dismissedWeek === weekStartDate) return;

    translateY.setValue(0);
    opacity.setValue(1);
    setVisible(true);

    timerRef.current = setTimeout(() => {
      animateOut();
    }, DISPLAY_DURATION);
  };

// Update animateOut to store weekStartDate instead of today
  const animateOut = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -20,
        duration: ANIMATE_OUT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATE_OUT_DURATION,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      setVisible(false);
      await AsyncStorage.setItem(STORAGE_KEY, weekStartDate);
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <View style={styles.bannerContent}>
        <Ionicons name="alert-circle" size={20} color={Colors.energyOrange} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Budget adjusted for this week</Text>
          <Text style={styles.subtext}>
            You're {cumulativeOverage} cal over. HAVEN recommends {adjustedBudget.toLocaleString()} cal today instead of your usual {baseBudget.toLocaleString()} cal
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.energyOrange,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  subtext: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
  },
});