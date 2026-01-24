import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';

interface WeeklyCalendarProps {
  currentDate: Date;
  cheatDates: string[]; // Array of ISO date strings
  loggedDates?: string[]; // Array of ISO date strings for days with logs
}

export default function WeeklyCalendar({ 
  currentDate, 
  cheatDates, 
  loggedDates = [] 
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
    const dateStr = date.toISOString().split('T')[0];
    return cheatDates.includes(dateStr);
  };

  const hasLogs = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return loggedDates.includes(dateStr);
  };

  return (
    <View style={styles.container}>
      {weekDays.map((date, index) => {
        const today = isToday(date);
        const cheat = isCheatDay(date);
        const logged = hasLogs(date);

        return (
          <View key={index} style={styles.dayContainer}>
            <Text style={styles.dayName}>
              {dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1]}
            </Text>
            <View
              style={[
                styles.dateCircle,
                today && styles.todayCircle,
                cheat && !today && styles.cheatCircle,
              ]}
            >
              <Text
                style={[
                  styles.dateText,
                  (today || cheat) && styles.highlightedText,
                ]}
              >
                {date.getDate()}
              </Text>
            </View>
            {/* Dot indicator for logged days */}
            {logged && (
              <View 
                style={[
                  styles.logDot,
                  today && styles.logDotToday,
                  cheat && !today && styles.logDotCheat,
                ]} 
              />
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
  dateText: {
    fontSize: 14,
    color: Colors.graphite,
    fontWeight: '600',
  },
  highlightedText: {
    color: Colors.white,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.vividTeal,
  },
  logDotToday: {
    backgroundColor: Colors.energyOrange,
  },
  logDotCheat: {
    backgroundColor: Colors.vividTeal,
  },
});