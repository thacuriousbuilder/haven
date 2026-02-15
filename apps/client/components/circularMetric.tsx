import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularMetricProps {
  score: number; // 0-100
  label: string;
  size?: number;
}

export default function CircularMetric({ score, label, size = 80 }: CircularMetricProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Color based on score
  const getColor = () => {
    if (score >= 70) return '#4CAF50'; // Green - High
    if (score >= 40) return '#FFA726'; // Orange - Medium
    return '#EF5350'; // Red - Low
  };

  return (
    <View style={styles.container}>
      <View style={[styles.circleContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor()}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={styles.percentage}>{Math.round(score)}%</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  percentage: {
    position: 'absolute',
    fontSize: 20,
    fontWeight: '600',
    color: '#2C4A52',
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    color: '#2C4A52',
    fontWeight: '500',
  },
});
