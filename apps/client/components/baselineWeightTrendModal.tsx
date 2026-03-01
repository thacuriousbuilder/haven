
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, BorderRadius } from '@/constants/colors';

type WeightTrend = 'stable' | 'losing' | 'gaining';

interface TrendOption {
  value: WeightTrend;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  selectedBg: string;
  selectedBorder: string;
  selectedIconColor: string;
  selectedTextColor: string;
}

const TREND_OPTIONS: TrendOption[] = [
  {
    value: 'losing',
    icon: 'trending-down',
    label: 'A bit lower',
    sublabel: 'I noticed the scale dip',
    selectedBg: '#D1FAE5',
    selectedBorder: Colors.success,
    selectedIconColor: Colors.success,
    selectedTextColor: '#065F46',
  },
  {
    value: 'stable',
    icon: 'remove',
    label: 'About the same',
    sublabel: 'No real change either way',
    selectedBg: '#D1FAE5',
    selectedBorder: Colors.success,
    selectedIconColor: Colors.success,
    selectedTextColor: '#065F46',
  },
  {
    value: 'gaining',
    icon: 'trending-up',
    label: 'A bit higher',
    sublabel: 'Scale crept up slightly',
    selectedBg: '#D1FAE5',
    selectedBorder: Colors.success,
    selectedIconColor: Colors.success,
    selectedTextColor: '#065F46',
  },
];

interface BaselineWeightTrendModalProps {
  visible: boolean;
  onSelect: (trend: WeightTrend) => void;
}

export function BaselineWeightTrendModal({
  visible,
  onSelect,
}: BaselineWeightTrendModalProps) {
  const [selected, setSelected] = useState<WeightTrend | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    onSelect(selected);
    setSelected(null); // reset for next time
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.overlay}>
          <View style={styles.modal}>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="scale-outline" size={52} color={Colors.vividTeal} />
            </View>

            {/* Title */}
            <Text style={styles.title}>One last thing</Text>
            <Text style={styles.description}>
              Over the past week, how did your weight feel overall?
            </Text>

            {/* Info note */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.steelBlue} />
              <Text style={styles.infoText}>
                This is just for your awareness — it won't change your budget.
              </Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {TREND_OPTIONS.map((option) => {
                const isSelected = selected === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionCard,
                      isSelected && {
                        backgroundColor: option.selectedBg,
                        borderColor: option.selectedBorder,
                      },
                    ]}
                    onPress={() => setSelected(option.value)}
                    activeOpacity={0.75}
                  >
                    <View style={[
                      styles.optionIconCircle,
                      isSelected && { backgroundColor: option.selectedBorder + '22' },
                    ]}>
                      <Ionicons
                        name={option.icon}
                        size={22}
                        color={isSelected ? option.selectedIconColor : Colors.steelBlue}
                      />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={[
                        styles.optionLabel,
                        isSelected && { color: option.selectedTextColor, fontWeight: '700' },
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={[
                        styles.optionSublabel,
                        isSelected && { color: option.selectedTextColor },
                      ]}>
                        {option.sublabel}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={option.selectedIconColor}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.button, !selected && styles.buttonDisabled]}
              onPress={handleContinue}
              activeOpacity={0.8}
              disabled={!selected}
            >
              <Text style={styles.buttonText}>See My Results</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </TouchableOpacity>

          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Shadows.large,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.graphite,
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: Colors.steelBlue,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.steelBlue,
    lineHeight: 18,
  },
  optionsContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.graphite,
    marginBottom: 2,
  },
  optionSublabel: {
    fontSize: 13,
    color: Colors.steelBlue,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.steelBlue,
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },
});