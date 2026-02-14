
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

type DayData = {
  day: string;
  color: string;
  height: number; // 0-100 percentage of max height
};

type WeeklyComparisonChartProps = {
  title: string;
  subtitle: string;
  days: DayData[];
  backgroundColor?: string;
  titleColor?: string;
  subtitleColor?: string;
};

export function WeeklyComparisonChart({ 
  title, 
  subtitle, 
  days,
  backgroundColor = 'rgba(255, 255, 255, 0.15)',
  titleColor = 'rgba(255, 255, 255, 0.7)',
  subtitleColor = Colors.energyOrange,
}: WeeklyComparisonChartProps) {
  const MAX_PILL_HEIGHT = 80; // Maximum height in pixels

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      
      <View style={styles.chartContainer}>
        {days.map((dayData, index) => {
          const pillHeight = (dayData.height / 100) * MAX_PILL_HEIGHT;
          
          return (
            <View key={index} style={styles.dayColumn}>
              <View style={styles.pillContainer}>
                <View 
                  style={[
                    styles.pill,
                    { 
                      height: pillHeight,
                      backgroundColor: dayData.color,
                    }
                  ]} 
                />
              </View>
              <Text style={styles.dayLabel}>{dayData.day}</Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginBottom: 12,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  pillContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  pill: {
    width: '70%',
    borderRadius: 20,
    minHeight: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});