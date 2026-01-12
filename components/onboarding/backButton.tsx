import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export function BackButton() {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => router.back()}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={24} color="#ffff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#206E6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
    marginTop: 16,
  },
});