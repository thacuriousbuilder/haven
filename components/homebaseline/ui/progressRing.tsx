

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
  displayValue?:number
}

export function ProgressRing({
  value,
  max,
  size = 140,
  strokeWidth = 14,
  label,
  color = Colors.vividTeal,
  showPercentage = false,
  displayValue,  // NEW
}: ProgressRingProps) {
  // Calculate percentage from value/max
  const percentage = max && max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;
  
  // Use displayValue if provided, otherwise use value
  const valueToShow = displayValue !== undefined ? displayValue : value;
  
  const displayText = showPercentage 
    ? `${Math.round(percentage)}%`
    : valueToShow.toLocaleString('en-US');

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
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
      
      <View style={styles.centerContent}>
        <Text style={styles.value}>{displayText}</Text>
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