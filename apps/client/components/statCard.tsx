import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatCardProps {
  value: string | number;
  label: string;
  size?: 'large' | 'small';
}

export default function StatCard({ value, label, size = 'large' }: StatCardProps) {
  return (
    <View style={[styles.container, size === 'small' && styles.smallContainer]}>
      <Text style={[styles.value, size === 'small' && styles.smallValue]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 1,
  },
  smallContainer: {
    padding: 16,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2C4A52',
    marginBottom: 4,
  },
  smallValue: {
    fontSize: 28,
  },
  label: {
    fontSize: 12,
    color: '#2C4A52',
    textAlign: 'center',
  },
});