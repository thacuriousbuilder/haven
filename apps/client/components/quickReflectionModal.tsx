
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { supabase } from '@haven/shared-utils';
import { UnreflectedMeal } from '@/utils/reflectionTrigger';
import { formatTime } from '@/utils/timezone';

const EAT_REASONS = [
  'Hungry', 'Social', 'It was time', 'Bored',
  'Stressed', 'Cravings', 'Tired', 'Loved the taste',
  'Why not?', 'Other',
];

const SATIETY_OPTIONS = ['Yes', 'Somewhat', 'No'];

type Props = {
  meal: UnreflectedMeal | null;
  visible: boolean;
  onComplete: () => void;
};

export default function QuickReflectionModal({ meal, visible, onComplete }: Props) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [satiety, setSatiety] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleReason(reason: string) {
    setSelectedReasons(prev =>
      prev.includes(reason)
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  }

  async function handleSave() {
    if (!meal) return;
    setSaving(true);
    await supabase
      .from('food_logs')
      .update({
        eat_reason: selectedReasons,
        satiety_response: satiety ? satiety.toLowerCase() : null,
      })
      .eq('id', meal.id);
    setSaving(false);
    onComplete();
  }

  if (!meal) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onComplete}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: Spacing.lg }]}>
            <Text style={styles.title}>Quick Reflection</Text>
            <Text style={styles.subtitle}>No meal found to reflect on.</Text>
            <TouchableOpacity onPress={onComplete} activeOpacity={0.7} style={styles.skipBtn}>
              <Text style={styles.skipText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onComplete}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Quick Reflection</Text>
              {/* Close button — matches FoodItemModal exactly */}
              <TouchableOpacity style={styles.closeBtn} onPress={onComplete} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={Colors.graphite} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
              Before you log, take a moment to reflect on your last meal
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Meal context row */}
          <View style={styles.mealRow}>
            {meal.image_url ? (
              <Image
                source={{ uri: meal.image_url }}
                style={styles.mealImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mealPlaceholder}>
                <Ionicons name="restaurant-outline" size={22} color={Colors.steelBlue} />
              </View>
            )}
            <View style={styles.mealInfo}>
              <Text style={styles.mealName}>{meal.food_name}</Text>
              <Text style={styles.mealTime}>{formatTime(meal.created_at)}</Text>
              <Text style={styles.mealCal}>{meal.calories} cal</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Reflection questions */}
          <View style={styles.reflectionSection}>
            <Text style={styles.questionLabel}>Why did you eat?</Text>
            <View style={styles.pillGrid}>
              {EAT_REASONS.map(reason => {
                const active = selectedReasons.includes(reason);
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => toggleReason(reason)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.questionLabel, { marginTop: Spacing.xl }]}>
              Did this meal keep you full?
            </Text>
            <View style={styles.satietyRow}>
              {SATIETY_OPTIONS.map(opt => {
                const active = satiety === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.satietyBtn, active && styles.satietyBtnActive]}
                    onPress={() => setSatiety(opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.satietyText, active && styles.satietyTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save — full width, matches FoodItemModal */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.saveBtnText}>Save Reflection</Text>
              }
            </TouchableOpacity>

            {/* Skip — centered below save */}
            <TouchableOpacity onPress={onComplete} activeOpacity={0.7} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: Colors.lightCream },
  container: { flex: 1, backgroundColor: Colors.lightCream },
  content:   { paddingBottom: Spacing.xxxl },

  // Header
  header: {
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  // Close button — identical to FoodItemModal
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    lineHeight: Typography.fontSize.sm * 1.5,
  },

  // Meal row
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  mealImage: {
    width: 52, height: 52,
    borderRadius: BorderRadius.md,
  },
  mealPlaceholder: {
    width: 52, height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  mealInfo: { gap: 2 },
  mealName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  mealTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },
  mealCal: {
    fontSize: Typography.fontSize.xs,
    color: Colors.vividTeal,
    fontWeight: Typography.fontWeight.semibold,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },

  // Questions
  reflectionSection: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  questionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive:     { backgroundColor: Colors.vividTeal, borderColor: Colors.vividTeal },
  pillText:       { fontSize: Typography.fontSize.xs, color: Colors.graphite, fontWeight: Typography.fontWeight.medium },
  pillTextActive: { color: Colors.white },

  satietyRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  satietyBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  satietyBtnActive:  { backgroundColor: Colors.vividTeal, borderColor: Colors.vividTeal },
  satietyText:       { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: Colors.graphite },
  satietyTextActive: { color: Colors.white },

  // Save + Skip — matches FoodItemModal layout
  saveBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  skipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    fontWeight: Typography.fontWeight.medium,
    textDecorationLine: 'underline',
  },
});