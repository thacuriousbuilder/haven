import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  backgroundColor?: string; 
  fillColor?: string;        
}

export function ProgressBar({ 
  currentStep, 
  totalSteps,
  backgroundColor = '#E5E5E5',  
  fillColor = '#206E6B'          
}: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.container}>
      <View style={[styles.background, { backgroundColor }]}>
        <View style={[styles.fill, { width: `${progress}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  background: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});