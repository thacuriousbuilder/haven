
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { FoodLogItem } from '../recap/dayDetailView';
import { useFoodReflection } from '@/hooks/useFoodReflection';

const EAT_REASONS = [
  'Hungry', 'Social', 'It was time', 'Bored',
  'Stressed', 'Cravings', 'Tired', 'Loved the taste',
  'Why not?', 'Other',
];

const SATIETY_OPTIONS = ['Yes', 'Somewhat', 'No'];

type Props = {
  item: FoodLogItem;
  onClose: () => void;
  onDeleted: () => void;
};

export default function FoodItemModal({ item, onClose, onDeleted }: Props) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>(
    item.eatReason ?? []
  );
  const [satiety, setSatiety]       = useState<string | null>(
    item.satietyResponse ? capitalize(item.satietyResponse) : null
  );
  const [isFavorite, setIsFavorite] = useState(item.isFavorite);

  const { saveReflection, deleteFoodLog, saving, deleting, error } =
    useFoodReflection(item.id);

  function toggleReason(reason: string) {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  }

  async function handleSave() {
    await saveReflection({
      eat_reason:       selectedReasons,
      satiety_response: satiety ? satiety.toLowerCase() : null,
      is_favorite:      isFavorite,
    });
    if (!error) onClose();
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Food Log',
      `Remove "${item.foodName}" from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFoodLog();
            onDeleted();
          },
        },
      ]
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="restaurant-outline" size={40} color={Colors.steelBlue} />
            </View>
          )}

          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.graphite} />
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={styles.imageActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setIsFavorite((v) => !v)}
            >
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={18}
                color={isFavorite ? Colors.energyOrange : Colors.graphite}
              />
            </TouchableOpacity>

            {/* Share — commented out for now */}
            {/* <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="share-social-outline" size={18} color={Colors.graphite} />
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Food info */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <View style={styles.infoHeaderLeft}>
              <Text style={styles.mealTimeLine}>
                {item.mealTime} · {item.mealType}
              </Text>
              <Text style={styles.foodName}>{item.foodName}</Text>
              <Text style={styles.calories}>{item.calories} cal</Text>
            </View>
          </View>

          {/* Macros row */}
          {(item.proteinGrams != null || item.carbsGrams != null || item.fatGrams != null) && (
            <View style={styles.macrosRow}>
              {item.proteinGrams != null && (
                <View style={styles.macroChip}>
                  <Text style={styles.macroValue}>{item.proteinGrams}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
              )}
              {item.carbsGrams != null && (
                <View style={styles.macroChip}>
                  <Text style={styles.macroValue}>{item.carbsGrams}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
              )}
              {item.fatGrams != null && (
                <View style={styles.macroChip}>
                  <Text style={styles.macroValue}>{item.fatGrams}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Self Reflection */}
        <View style={styles.reflectionSection}>
          <Text style={styles.sectionTitle}>Self-Reflection</Text>

          <Text style={styles.questionLabel}>Why did I eat?</Text>
          <View style={styles.pillGrid}>
            {EAT_REASONS.map((reason) => {
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
            {SATIETY_OPTIONS.map((opt) => {
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

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save Reflection</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content:   { paddingBottom: Spacing.xxxl },
  imageContainer: { position: 'relative' },
  heroImage: { width: '100%', height: 240 },
  heroPlaceholder: {
    width: '100%', height: 240,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute', top: Spacing.lg, left: Spacing.lg,
    width: 32, height: 32, borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.small,
  },
  imageActions: {
    position: 'absolute', bottom: Spacing.lg, right: Spacing.lg,
    flexDirection: 'row', gap: Spacing.sm,
  },
  actionBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.small,
  },
  infoSection:    { padding: Spacing.lg },
  infoHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoHeaderLeft: { flex: 1 },
  mealTimeLine: {
    fontSize: Typography.fontSize.xs,
    color: Colors.energyOrange,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  foodName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginBottom: Spacing.xs,
  },
  calories: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vividTeal,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  macroChip: {
    flex: 1,
    backgroundColor: Colors.lightCream,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  macroLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
  reflectionSection: { padding: Spacing.lg, gap: Spacing.md },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  questionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginTop: Spacing.sm,
  },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightCream,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive:        { backgroundColor: Colors.vividTeal, borderColor: Colors.vividTeal },
  pillText:          { fontSize: Typography.fontSize.xs, color: Colors.graphite, fontWeight: Typography.fontWeight.medium },
  pillTextActive:    { color: Colors.white },
  satietyRow:        { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  satietyBtn: {
    flex: 1, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.lightCream,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  satietyBtnActive:  { backgroundColor: Colors.vividTeal, borderColor: Colors.vividTeal },
  satietyText:       { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: Colors.graphite },
  satietyTextActive: { color: Colors.white },
  errorText:         { fontSize: Typography.fontSize.xs, color: Colors.error, marginTop: Spacing.xs },
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
});