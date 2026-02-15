
import React from 'react';
import { 
  TouchableOpacity, 
  View, 
  Text, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  label: string;
  value?: string;
  onPress: () => void;
  showChevron?: boolean;
  isDestructive?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconColor = '#206E6B',
  iconBgColor = '#E8F4F3',
  label,
  value,
  onPress,
  showChevron = true,
  isDestructive = false,
}) => {
  return (
    <TouchableOpacity 
      style={styles.row} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={[
          styles.label,
          isDestructive && styles.destructiveLabel
        ]}>
          {label}
        </Text>
      </View>
      
      <View style={styles.rightContent}>
        {value && <Text style={styles.value}>{value}</Text>}
        {showChevron && (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color="#9CA3AF" 
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  destructiveLabel: {
    color: '#EF4444',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 14,
    color: '#6B7280',
  },
});