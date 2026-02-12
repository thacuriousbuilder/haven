import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';
import { WeekInfo } from '@/utils/weekHelpers';
import { formatLocalDate } from '@/utils/timezone';

interface WeeklyCalendarProps {
  currentDate: Date;
  cheatDates: string[]; // Array of ISO date strings (YYYY-MM-DD)
  loggedDates?: string[]; // Array of ISO date strings for days with logs
  weekInfo?: WeekInfo | null; // Optional: for partial week handling
}

export default function WeeklyCalendar({ 
  currentDate, 
  cheatDates, 
  loggedDates = [],
  weekInfo,
}: WeeklyCalendarProps) {
  const getWeekDays = () => {
    const monday = new Date(currentDate);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCheatDay = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return cheatDates.includes(dateStr);
  };

  const hasLogs = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return loggedDates.includes(dateStr);
  };

  // Check if day is before user started tracking (for partial weeks)
  const isBeforeTracking = (date: Date): boolean => {
    if (!weekInfo?.isPartialWeek) return false;
    
    const dateStr = formatLocalDate(date);
    const userStartStr = formatLocalDate(weekInfo.userStartDate);
    
    return dateStr < userStartStr;
  };

  return (
    <View style={styles.container}>
      {weekDays.map((date, index) => {
        const today = isToday(date);
        const cheat = isCheatDay(date);
        const logged = hasLogs(date);
        const beforeTracking = isBeforeTracking(date);

        return (
          <View key={index} style={styles.dayContainer}>
            <Text 
              style={[
                styles.dayName,
                beforeTracking && styles.dimmedText,
              ]}
            >
              {dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1]}
            </Text>
            <View
              style={[
                styles.dateCircle,
                today && styles.todayCircle,
                cheat && !today && styles.cheatCircle,
                beforeTracking && styles.inactiveCircle,
              ]}
            >
              <Text
                style={[
                  styles.dateText,
                  (today || cheat) && !beforeTracking && styles.highlightedText,
                  beforeTracking && styles.dimmedText,
                ]}
              >
                {date.getDate()}
              </Text>
            </View>
            {/* Dot indicator for logged days */}
            {logged && !beforeTracking && (
              <View 
                style={[
                  styles.logDot,
                  today && styles.logDotToday,
                  cheat && !today && styles.logDotCheat,
                ]} 
              />
            )}
            {/* Dash for inactive days */}
            {beforeTracking && (
              <View style={styles.inactiveDash} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  dayContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dayName: {
    fontSize: 12,
    color: Colors.steelBlue,
    fontWeight: '500',
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightCream,
  },
  todayCircle: {
    backgroundColor: Colors.vividTeal,
  },
  cheatCircle: {
    backgroundColor: Colors.energyOrange,
  },
  inactiveCircle: {
    backgroundColor: Colors.fatSteel,
    opacity: 0.4,
  },
  dateText: {
    fontSize: 14,
    color: Colors.graphite,
    fontWeight: '600',
  },
  highlightedText: {
    color: Colors.white,
  },
  dimmedText: {
    color: Colors.graphite,
    opacity: 0.5,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.vividTeal,
  },
  logDotToday: {
    backgroundColor: Colors.vividTeal,
  },
  logDotCheat: {
    backgroundColor: Colors.energyOrange,
  },
  inactiveDash: {
    width: 12,
    height: 2,
    backgroundColor: Colors.fatSteel,
    opacity: 0.3,
    borderRadius: 1,
  },
});