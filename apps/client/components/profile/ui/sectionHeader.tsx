
import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface SectionHeaderProps {
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  return <Text style={styles.header}>{title}</Text>;
};

const styles = StyleSheet.create({
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 16,
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});