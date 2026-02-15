

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface ClientCardBaseProps {
  children: React.ReactNode;
}

export function ClientCardBase({ children }: ClientCardBaseProps) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
});