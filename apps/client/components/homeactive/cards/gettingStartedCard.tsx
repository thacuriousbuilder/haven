
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/colors';
import { useGettingStarted, GettingStartedItem } from '@/hooks/useGettingStarted';
import { getLocalDateString } from '@/utils/timezone';

interface Props {
  onLogMeal: () => void;
}

const ITEMS: {
  id: GettingStartedItem;
  title: string;
  subtitle: string;
  icon: string;
}[] = [
  {
    id: 'log_first_meal',
    title: 'Log your first meal',
    subtitle: 'Start building your weekly picture',
    icon: 'restaurant-outline',
  },
  {
    id: 'adjust_budget',
    title: 'Adjust your budget',
    subtitle: 'Make it fit your lifestyle',
    icon: 'options-outline',
  },
  {
    id: 'plan_treat_day',
    title: 'Plan a treat day',
    subtitle: 'Pick your day to enjoy more',
    icon: 'calendar-outline',
  },
  {
    id: 'food_journal',
    title: 'Review your food journal',
    subtitle: 'Understand your eating patterns',
    icon: 'journal-outline',
  },
  {
    id: 'read_why_weekly',
    title: 'Read: Why weekly works',
    subtitle: '2 min read',
    icon: 'book-outline',
  },
];

export function GettingStartedCard({ onLogMeal }: Props) {
  const { state, markComplete, completedCount, totalCount, visible, allDone } =
    useGettingStarted();
  const [collapsed, setCollapsed] = useState(false);

  if (!visible || allDone) return null;

  const handlePress = (id: GettingStartedItem) => {
    markComplete(id);
    switch (id) {
      case 'log_first_meal':
        onLogMeal();
        break;
      case 'adjust_budget':
        router.push({
          pathname: '/(tabs)/weekly',
          params: { tab: 'plan' },
        });
        break;
      case 'plan_treat_day':
        router.push('/planCheatDay');
        break;
      case 'food_journal':
          router.push({
            pathname: '/(tabs)/weekly',
            params: { tab: 'recap', date: getLocalDateString() },
          });
          break;
      case 'read_why_weekly':
        router.push({
          pathname: '/(tabs)/weekly',
          params: { tab: 'discovery', article: 'weekly-budgets' },
        });
        break;
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Getting Started</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{completedCount}/{totalCount}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setCollapsed(prev => !prev)}
          activeOpacity={0.6}
        >
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={Colors.steelBlue}
          />
        </TouchableOpacity>
      </View>

      {!collapsed && (
        <>
          {ITEMS.map((item, index) => {
            const done = state.completed[item.id];
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.row,
                  index < ITEMS.length - 1 && styles.rowBorder,
                ]}
                onPress={() => handlePress(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, done && styles.iconCircleDone]}>
                  <Ionicons
                    name={done ? 'checkmark' : (item.icon as any)}
                    size={18}
                    color={done ? Colors.white : Colors.vividTeal}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, done && styles.rowTitleDone]}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                </View>
                {!done && (
                  <Ionicons name="chevron-forward" size={18} color={Colors.steelBlue} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
                Complete these to get the most out of HAVEN
            </Text>
            </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.graphite,
  },
  badge: {
    backgroundColor: Colors.lightCream,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.steelBlue,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowBorder: {
    borderBottomWidth: 0,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.tealOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleDone: {
    backgroundColor: Colors.vividTeal,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 2,
  },
  rowTitleDone: {
    color: Colors.steelBlue,
    textDecorationLine: 'line-through',
  },
  rowSubtitle: {
    fontSize: 13,
    color: Colors.steelBlue,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 12,
    color: Colors.steelBlue,
    flex: 1,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.vividTeal,
    textDecorationLine: 'underline',
  },
});