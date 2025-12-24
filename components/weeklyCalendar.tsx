import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WeeklyCalendarProps {
  currentDate: Date;
  cheatDates: string[]; // Array of ISO date strings
}

export default function WeeklyCalendar({ currentDate, cheatDates }: WeeklyCalendarProps) {
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
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCheatDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return cheatDates.includes(dateStr);
  };

  return (
    <View style={styles.container}>
      {weekDays.map((date, index) => {
        const today = isToday(date);
        const cheat = isCheatDay(date);

        return (
          <View key={index} style={styles.dayContainer}>
            <Text style={styles.dayName}>{dayNames[date.getDay()]}</Text>
            <View
              style={[
                styles.dateCircle,
                today && styles.todayCircle,
                cheat && styles.cheatCircle,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  dayContainer: {
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    color: '#2C4A52',
    marginBottom: 8,
    fontWeight: '500',
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  todayCircle: {
    backgroundColor: '#FF6B35', // Orange for today
  },
  cheatCircle: {
    backgroundColor: '#FF6B35', // Orange for cheat days
  },
  dateText: {
    fontSize: 14,
    color: '#2C4A52',
    fontWeight: '600',
  },
  highlightedText: {
    color: '#FFFFFF',
  },
});