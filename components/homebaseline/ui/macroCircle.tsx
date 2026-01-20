
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { getMacroColor, getMacroBackgroundColor, getMacroIcon } from '@/utils/homeHelpers';

interface MacroCircleProps {
  value: number;                          // Grams (e.g., 361)
  label: string;                          // "Protein", "Carbs", "Fat"
  type: 'protein' | 'carbs' | 'fat';      // For color/icon mapping
  size?: 'small' | 'medium';              // Default: 'medium'
}

export function MacroCircle({
  value,
  label,
  type,
  size = 'medium',
}: MacroCircleProps) {
  const color = getMacroColor(type);
  const backgroundColor = getMacroBackgroundColor(type);
  const iconName = getMacroIcon(type);
  
  const isSmall = size === 'small';
  const circleSize = isSmall ? 48 : 56;
  const iconSize = isSmall ? 20 : 24;
  const valueSize = isSmall ? 16 : 18;
  const labelSize = isSmall ? 11 : 12;

  return (
    <View style={styles.container}>
      {/* Icon circle */}
      <View 
        style={[
          styles.iconCircle, 
          { 
            width: circleSize, 
            height: circleSize, 
            backgroundColor 
          }
        ]}
      >
        <Ionicons name={iconName as any} size={iconSize} color={color} />
      </View>
      
      {/* Value and label */}
      <View style={styles.textContainer}>
        <Text style={[styles.value, { fontSize: valueSize, color: Colors.graphite }]}>
          {value}g
        </Text>
        <Text style={[styles.label, { fontSize: labelSize }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    gap: 2,
  },
  value: {
    fontWeight: '700',
  },
  label: {
    color: Colors.steelBlue,
    fontWeight: '500',
  },
});