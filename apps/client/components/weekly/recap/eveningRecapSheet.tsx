
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Image, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { supabase } from '@haven/shared-utils';
import { useEveningRecap, MissedMeal, UnreflectedLog } from '@/hooks/useEveningRecap';
import { getRandomRecapMessage } from '@/constants/eveningRecapMessages';

type Step = 'missed_meals' | 'reflection' | 'done';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAddMeal: (meal: MissedMeal) => void;
};

const MEAL_LABELS: Record<MissedMeal, { label: string; icon: string; expected: string }> = {
  breakfast: { label: 'Breakfast', icon: 'sunny-outline',        expected: 'Expected around 8:00 AM' },
  lunch:     { label: 'Lunch',     icon: 'partly-sunny-outline', expected: 'Expected around 12:00 PM' },
  dinner:    { label: 'Dinner',    icon: 'moon-outline',         expected: 'Expected around 6:00 PM' },
};

const EAT_REASONS = [
  'Hungry', 'Social', 'It was time', 'Bored',
  'Stressed', 'Cravings', 'Tired', 'Loved the taste',
  'Why not?', 'Other',
];

const SATIETY_OPTIONS = ['Yes', 'Somewhat', 'No'];

export default function EveningRecapSheet({ visible, onClose, onAddMeal }: Props) {
  const [step, setStep]                 = useState<Step>('missed_meals');
  const [skippedMeals, setSkippedMeals] = useState<MissedMeal[]>([]);

  function handleClose() {
    setStep('missed_meals');
    setSkippedMeals([]);
    onClose();
  }


  const {
    missedMeals,
    unreflectedLogs,
    totalCaloriesToday,
    dailyTarget,
    loading,
  } = useEveningRecap();

  function handleSkipMeal(meal: MissedMeal) {
    setSkippedMeals(prev => [...prev, meal]);
  }

  function handleContinue() {
    if (unreflectedLogs.length > 0) {
      setStep('reflection');
    } else {
      setStep('done');
    }
  }



  const activeMissedMeals = missedMeals.filter(m => !skippedMeals.includes(m));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        {step !== 'done' && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={Colors.graphite} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Evening Recap</Text>
              <Text style={styles.headerSub}>Daily Check-in</Text>
            </View>
            <View style={{ width: 22 }} />
          </View>
        )}

        {/* Progress bar */}
        {step !== 'done' && (
          <View style={styles.progressRow}>
            <View style={[styles.progressSegment, styles.progressActive]} />
            <View style={[styles.progressSegment, step === 'reflection' && styles.progressActive]} />
            <View style={styles.progressSegment} />
          </View>
        )}

        {/* Step 1 — Missed meals */}
        {step === 'missed_meals' && (
          <MissedMealsStep
            loading={loading}
            activeMissedMeals={activeMissedMeals}
            onSkipMeal={handleSkipMeal}
            onContinue={handleContinue}
            onClose={handleClose}
            onAddMeal={onAddMeal}
          />
        )}

        {/* Step 2 — Reflection loop */}
        {step === 'reflection' && (
          <ReflectionStep
            unreflectedLogs={unreflectedLogs}
            onComplete={() => setStep('done')}
          />
        )}

        {/* Step 3 — Done */}
        {step === 'done' && (
          <DoneStep
            totalCaloriesToday={totalCaloriesToday}
            dailyTarget={dailyTarget}
            onClose={handleClose}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── Step 1: Missed Meals ──────────────────────────────────────────────────────
type MissedMealsStepProps = {
  loading: boolean;
  activeMissedMeals: MissedMeal[];
  onSkipMeal: (meal: MissedMeal) => void;
  onContinue: () => void;
  onClose: () => void;
  onAddMeal: (meal: MissedMeal) => void;
};

function MissedMealsStep({
  loading,
  activeMissedMeals,
  onSkipMeal,
  onContinue,
  onAddMeal
}: MissedMealsStepProps) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.vividTeal} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.heroSection}>
        <View style={styles.heroIconCircle}>
          <Ionicons name="moon-outline" size={26} color={Colors.vividTeal} />
        </View>
        <Text style={styles.heroTitle}>Time to wrap up your day</Text>
        <Text style={styles.heroSub}>Let's make sure we've captured everything</Text>
      </View>

      {/* Info card — positive if no missed meals */}
      {activeMissedMeals.length === 0 ? (
        <View style={styles.positiveCard}>
          <View style={styles.infoCardRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.vividTeal} />
            <Text style={styles.infoCardTitle}>Great logging today!</Text>
          </View>
          <Text style={styles.infoCardBody}>
            You've captured all your meals. Take a moment to reflect and wrap up your day.
          </Text>
        </View>
      ) : (
        <View style={styles.infoCard}>
          <View style={styles.infoCardRow}>
            <Ionicons name="time-outline" size={16} color={Colors.vividTeal} />
            <Text style={styles.infoCardTitle}>Why Evening Recap?</Text>
          </View>
          <Text style={styles.infoCardBody}>
            A quick check-in each evening helps HAVEN learn your eating patterns,
            refine your weekly budget, and get smarter about what works for you.
          </Text>
        </View>
      )}

      {/* Missed meals */}
      {activeMissedMeals.length > 0 && (
        <View style={styles.missedSection}>
          <View style={styles.missedHeader}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.energyOrange} />
            <Text style={styles.missedHeaderText}>
              Looks like you missed {activeMissedMeals.length === 1 ? 'a meal' : 'some meals'}
            </Text>
          </View>

          <View style={styles.missedCard}>
            {activeMissedMeals.map((meal, index) => {
              const meta = MEAL_LABELS[meal];
              return (
                <View key={meal}>
                  <View style={styles.missedMealRow}>
                    <View style={styles.missedMealIcon}>
                      <Ionicons name={meta.icon as any} size={18} color={Colors.steelBlue} />
                    </View>
                    <View style={styles.missedMealInfo}>
                      <Text style={styles.missedMealLabel}>{meta.label}</Text>
                      <Text style={styles.missedMealExpected}>{meta.expected}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onSkipMeal(meal)}
                      activeOpacity={0.7}
                      style={styles.skipMealBtn}
                    >
                      <Text style={styles.skipMealText}>Skip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addMealBtn}
                        activeOpacity={0.85}
                        onPress={() => onAddMeal(meal)}
                        >
                        <Ionicons name="add" size={14} color={Colors.white} />
                        <Text style={styles.addMealText}>Add</Text>
                        </TouchableOpacity>
                  </View>
                  {index < activeMissedMeals.length - 1 && (
                    <View style={styles.mealDivider} />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* CTA */}
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={onContinue}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaBtnText}>Continue to Reflection</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.white} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 2: Reflection Loop ───────────────────────────────────────────────────
type ReflectionStepProps = {
  unreflectedLogs: UnreflectedLog[];
  onComplete: () => void;
};

function ReflectionStep({ unreflectedLogs, onComplete }: ReflectionStepProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [satiety, setSatiety]               = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const fadeAnim                            = useRef(new Animated.Value(1)).current;

  const currentLog = unreflectedLogs[currentIndex];
  const total      = unreflectedLogs.length;
  const isLast     = currentIndex === total - 1;

  function toggleReason(reason: string) {
    setSelectedReasons(prev =>
      prev.includes(reason)
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  }

  function resetSelections() {
    setSelectedReasons([]);
    setSatiety(null);
  }

  async function handleSave() {
    setSaving(true);
    await supabase
      .from('food_logs')
      .update({
        eat_reason: selectedReasons,
        satiety_response: satiety ? satiety.toLowerCase() : null,
      })
      .eq('id', currentLog.id);
    setSaving(false);
    advance();
  }

  function handleSkip() {
    advance();
  }

  function advance() {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (isLast) {
        onComplete();
      } else {
        setCurrentIndex(i => i + 1);
        resetSelections();
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Meal counter */}
      <View style={styles.mealCounter}>
        {currentIndex > 0 ? (
          <TouchableOpacity
            onPress={() => { setCurrentIndex(i => i - 1); resetSelections(); }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={Colors.steelBlue} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 18 }} />
        )}
        <Text style={styles.mealCounterText}>
          Meal {currentIndex + 1} of {total}
        </Text>
        <View style={{ width: 18 }} />
      </View>

      {/* Animated meal content */}
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Meal card */}
        <View style={styles.reflectionMealCard}>
          {currentLog.image_url ? (
            <Image
              source={{ uri: currentLog.image_url }}
              style={styles.reflectionMealImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.reflectionMealPlaceholder}>
              <Ionicons name="restaurant-outline" size={32} color={Colors.steelBlue} />
            </View>
          )}
          <View style={styles.reflectionMealInfo}>
            <Text style={styles.reflectionMealMeta}>
              {currentLog.meal_type ? currentLog.meal_type.toUpperCase() : 'MEAL'}
            </Text>
            <Text style={styles.reflectionMealName}>{currentLog.food_name}</Text>
            <Text style={styles.reflectionMealCal}>{currentLog.calories} cal</Text>
          </View>
        </View>

        {/* Q1 */}
        <Text style={styles.questionLabel}>Why did you eat this?</Text>
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

        {/* Q2 */}
        <Text style={[styles.questionLabel, { marginTop: Spacing.lg }]}>
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
      </Animated.View>

      {/* Save CTA */}
      <TouchableOpacity
        style={[styles.ctaBtn, saving && styles.ctaBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator color={Colors.white} />
          : <>
              <Text style={styles.ctaBtnText}>{isLast ? 'Finish' : 'Next Meal'}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.white} />
            </>
        }
      </TouchableOpacity>

      {/* Skip */}
      <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 3: Done ──────────────────────────────────────────────────────────────
type DoneStepProps = {
  totalCaloriesToday: number;
  dailyTarget: number;
  onClose: () => void;
};

function DoneStep({ totalCaloriesToday, dailyTarget, onClose }: DoneStepProps) {
    const message = useRef(getRandomRecapMessage()).current;
  const progress = dailyTarget > 0
    ? Math.min(totalCaloriesToday / dailyTarget, 1)
    : 0;
  const percent = Math.round(progress * 100);

  return (
    <View style={styles.doneContainer}>
      <Text style={styles.sparkles}>✦✦</Text>
      <Text style={styles.doneTitle}>All caught up</Text>

      {/* Calories card */}
      <View style={styles.doneCalCard}>
        <Text style={styles.doneCalLabel}>TODAY</Text>
        <Text style={styles.doneCalValue}>
          {totalCaloriesToday.toLocaleString()} cal
        </Text>
        <View style={styles.doneProgressTrack}>
          <View style={[styles.doneProgressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.doneCalPercent}>{percent}% of your daily target</Text>
      </View>

      {/* Supportive message */}
      <View style={styles.doneMsgCard}>
        <Ionicons name="leaf-outline" size={16} color={Colors.vividTeal} />
        <Text style={styles.doneMsgText}>{message} </Text>
      </View>

      {/* Close */}
      <TouchableOpacity
        style={styles.doneCloseBtn}
        onPress={onClose}
        activeOpacity={0.85}
      >
        <Text style={styles.doneCloseBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: Colors.lightCream },
  container: { flex: 1, backgroundColor: Colors.lightCream },
  content:   { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  headerSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },

  progressRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border,
  },
  progressActive: { backgroundColor: Colors.vividTeal },

  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  heroIconCircle: {
    width: 56, height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.tealOverlay,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  positiveCard: {
    backgroundColor: Colors.tealOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.vividTeal,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoCardTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  infoCardBody: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    lineHeight: Typography.fontSize.sm * 1.6,
  },

  missedSection:    { marginBottom: Spacing.lg },
  missedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  missedHeaderText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  missedCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.small,
  },
  missedMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  missedMealIcon: {
    width: 36, height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center', alignItems: 'center',
  },
  missedMealInfo:     { flex: 1 },
  missedMealLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  missedMealExpected: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
    marginTop: 2,
  },
  skipMealBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  skipMealText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
  },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.vividTeal,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  addMealText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  mealDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  ctaBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    fontWeight: Typography.fontWeight.medium,
    textDecorationLine: 'underline',
  },

  mealCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  mealCounterText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.steelBlue,
  },
  reflectionMealCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  reflectionMealImage: { width: '100%', height: 160 },
  reflectionMealPlaceholder: {
    width: '100%', height: 160,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center', alignItems: 'center',
  },
  reflectionMealInfo:  { padding: Spacing.md, gap: 2 },
  reflectionMealMeta: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.energyOrange,
    letterSpacing: 0.5,
  },
  reflectionMealName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  reflectionMealCal: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vividTeal,
  },
  questionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    marginBottom: Spacing.sm,
  },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
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
  satietyRow:     { flexDirection: 'row', gap: Spacing.sm },
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

  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  sparkles: {
    fontSize: 32,
    color: '#F59E0B',
  },
  doneTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  doneCalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  doneCalLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vividTeal,
    letterSpacing: 1,
  },
  doneCalValue: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
  },
  doneProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  doneProgressFill: {
    height: '100%',
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.full,
  },
  doneCalPercent: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },
  doneMsgCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.tealOverlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  doneMsgText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.vividTeal,
    fontStyle: 'italic',
    lineHeight: Typography.fontSize.sm * 1.5,
  },
  doneCloseBtn: {
    width: '100%',
    backgroundColor: Colors.graphite,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  doneCloseBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
});