
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface OptionCardProps {
  title: string;
  description?: string; 
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function OptionCard({ title, description, selected, onPress, disabled }: OptionCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected,
        disabled && styles.cardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={[styles.title, selected && styles.titleSelected]}>
          {title}
        </Text>
        
        {description && description.trim() !== '' && (
          <Text style={[styles.description, selected && styles.descriptionSelected]}>
            {description}
          </Text>
        )}
      </View>
      
      
      <View style={styles.radioContainer}>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSelected: {
    borderColor: '#3D5A5C',
    backgroundColor: '#206E6B',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  titleSelected: {
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 4,
  },
  descriptionSelected: {
    color: '#fff',
  },
  radioContainer: {
    paddingLeft: 8,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3D5A5C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#fff',
    backgroundColor: '#687C88',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
});