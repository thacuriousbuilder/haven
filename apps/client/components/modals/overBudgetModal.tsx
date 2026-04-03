

import React from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/colors';
import { OverBudgetPayload } from '@/types/modal';

interface OverBudgetModalProps {
  visible: boolean;
  data: OverBudgetPayload;
  onManage: () => void;
  onDismiss: () => void;
}

export function OverBudgetModal({
  visible, data, onManage, onDismiss
}: OverBudgetModalProps) {
  const overPercent = Math.round((data.over / data.target) * 100);

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card}>

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
            <Ionicons name="close" size={20} color={Colors.white} />
          </TouchableOpacity>

          {/* Warning icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="warning-outline" size={28} color={Colors.energyOrange} />
          </View>

          {/* Heading */}
          <Text style={styles.headline}>You're over budget</Text>
          <Text style={styles.overAmount}>+{data.over} <Text style={styles.calLabel}>cal</Text></Text>
          <Text style={styles.subtext}>
            That's {overPercent}% over your daily target of {data.target} cal
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Target</Text>
              <Text style={styles.statValue}>{data.target}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Consumed</Text>
              <Text style={styles.statValue}>{data.consumed}</Text>
            </View>
            <View style={[styles.statDivider, styles.statDividerOrange]} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Over</Text>
              <Text style={[styles.statValue, styles.statOver]}>+{data.over}</Text>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.ctaButton} onPress={onManage} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Manage Budget</Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity onPress={onDismiss} style={styles.dismissWrapper}>
            <Text style={styles.dismissText}>Dismiss for now</Text>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    padding: Spacing.xs,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headline: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: Typography.fontSize.xl,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  overAmount: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: Typography.fontSize.huge,
    color: Colors.energyOrange,
  },
  calLabel: {
    fontSize: Typography.fontSize.xxl,
  },
  subtext: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  statValue: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: Typography.fontSize.lg,
    color: Colors.white,
  },
  statOver: {
    color: Colors.energyOrange,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statDividerOrange: {
    backgroundColor: 'rgba(239,120,40,0.4)',
  },
  ctaButton: {
    backgroundColor: Colors.energyOrange,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  ctaText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: Typography.fontSize.base,
    color: Colors.white,
  },
  dismissWrapper: { paddingVertical: Spacing.sm },
  dismissText: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
  },
});