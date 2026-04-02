
import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/colors';
import RecapTab from '@/components/weekly/recap/recapTab';
import WeekDetailView from '@/components/weekly/recap/weekDetailView';
import DayDetailView from '@/components/weekly/recap/dayDetailView';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';
import { WeekSummary, DaySummary } from '@/types/recap';
import PlanTab from '@/components/weekly/plan/planTab';
import DiscoveryTab from '@/components/weekly//discovery/discoveryTab';
import EveningRecapSheet from '@/components/weekly/recap/eveningRecapSheet';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

type WeeklyTab = 'recap' | 'plan' | 'discovery';

const TABS: { key: WeeklyTab; label: string; icon: string }[] = [
  { key: 'recap',     label: 'Recap',     icon: 'time-outline' },
  { key: 'plan',      label: 'Plan',      icon: 'flame-outline' },
  { key: 'discovery', label: 'Discovery', icon: 'compass-outline' },
];

export default function WeeklyScreen() {
  const [activeTab, setActiveTab]       = useState<WeeklyTab>('recap');
  const [selectedWeek, setSelectedWeek] = useState<WeekSummary | null>(null);
  const [selectedDay, setSelectedDay]   = useState<DaySummary | null>(null);
  const [showEveningRecap, setShowEveningRecap] = useState(false);
  const [recapKey, setRecapKey] = useState(0);
  const params = useLocalSearchParams();

  useFocusEffect(
    useCallback(() => {
      if (params.showEveningRecap === 'true') {
        setRecapKey(k => k + 1);
        setShowEveningRecap(true);
      }
    }, [params.showEveningRecap])
  );

  useEffect(() => {
  if (params.tab === 'plan' || params.tab === 'discovery' || params.tab === 'recap') {
    setActiveTab(params.tab as WeeklyTab);
  }
}, [params.tab]);

  const { weeks, loading, error } = useWeeklyRecap();

  return (
    <SafeAreaView style={styles.container}>
      {/* Page title */}
      <Text style={styles.pageTitle}>Weekly</Text>
      <Text style={styles.pageSubtitle}>Your week at a glance</Text>

      {/* Sub-tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={isActive ? Colors.vividTeal : Colors.steelBlue}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.divider} />

      {/* Tab content */}
      {activeTab === 'recap' && (
        selectedDay ? (
          <DayDetailView
            day={selectedDay}
            weekDateRange={`${selectedWeek!.startDate} - ${selectedWeek!.endDate}`}
            onBack={() => setSelectedDay(null)}
          />
        ) : selectedWeek ? (
          <WeekDetailView
            week={selectedWeek}
            onBack={() => setSelectedWeek(null)}
            onSelectDay={(day) => setSelectedDay(day)}
          />
        ) : (
          <RecapTab
            weeks={weeks}
            loading={loading}
            error={error}
            onSelectWeek={(week) => setSelectedWeek(week)}
          />
        )
      )}

      {activeTab === 'plan' && <PlanTab />}

      {activeTab === 'discovery' && <DiscoveryTab />}

      <EveningRecapSheet
        key={recapKey}
        visible={showEveningRecap}
        onClose={() => setShowEveningRecap(false)}
        onAddMeal={(meal) => {
        setShowEveningRecap(false);
        setTimeout(() => {
          router.push({
            pathname: '/log',
            params: {
              mealType: meal,
              returnTo: 'weekly',
            },
          });
        }, 500);
  }}
/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightCream,
  },
  pageTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  pageSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.steelBlue,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xxl,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
    position: 'relative',
  },
  tabLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.steelBlue,
  },
  tabLabelActive: {
    color: Colors.vividTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.full,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.sm,
  },
});