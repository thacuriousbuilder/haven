import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TrainerHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>HAVEN Trainer App</Text>
      <Text style={styles.subtitle}>Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#206E6B',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});
