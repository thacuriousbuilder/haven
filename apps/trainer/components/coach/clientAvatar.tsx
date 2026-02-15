
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface ClientAvatarProps {
  fullName: string;
  avatarUrl?: string | null;
  size?: 'small' | 'medium' | 'large';
}

export function ClientAvatar({ 
  fullName, 
  avatarUrl, 
  size = 'medium' 
}: ClientAvatarProps) {
  
  // Get initials from full name
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const sizeStyles = {
    small: { width: 32, height: 32, fontSize: 14 },
    medium: { width: 40, height: 40, fontSize: 16 },
    large: { width: 48, height: 48, fontSize: 18 },
  };

  const { width, height, fontSize } = sizeStyles[size];

  // TODO: If avatarUrl exists, render image instead
  // For now, just show initials

  return (
    <View style={[styles.container, { width, height, borderRadius: width / 2 }]}>
      <Text style={[styles.initials, { fontSize }]}>
        {getInitials(fullName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    color: Colors.vividTeal,
  },
});