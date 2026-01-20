

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  value: number;           // Current value (e.g., 7290)
  max?: number;            // Max value for percentage calculation (optional)
  size?: number;           // Diameter in pixels (default 140)
  strokeWidth?: number;    // Ring thickness (default 14)
  label: string;           // Bottom label (e.g., "total kcal")
  color?: string;          // Ring color (default: vividTeal)
  showPercentage?: boolean; // Show percentage instead of value
}

export function ProgressRing({
  value,
  max,
  size = 140,
  strokeWidth = 14,
  label,
  color = Colors.vividTeal,
  showPercentage = false,
}: ProgressRingProps) {
  // Calculate percentage if max is provided
  const percentage = max && max > 0 ? Math.min((value / max) * 100, 100) : 75;
  
  // Circle calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;
  
  // Format display value
  const displayValue = showPercentage 
    ? `${Math.round(percentage)}%`
    : value.toLocaleString('en-US');

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={styles.value}>{displayValue}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.steelBlue,
  },
});