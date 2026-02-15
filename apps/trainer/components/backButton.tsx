import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface BackButtonProps {
  backgroundColor?: string; 
  iconColor?: string;       
}

export function BackButton({ 
  backgroundColor = '#206E6B',  
  iconColor = '#fff'            
}: BackButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }]}
      onPress={() => router.back()}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={24} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
    marginTop: 16,
  },
});