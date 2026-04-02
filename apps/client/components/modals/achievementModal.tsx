

import React from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/colors';

interface AchievementModalProps {
  visible: boolean;
  backgroundColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  headline: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  ctaIconName: keyof typeof Ionicons.glyphMap;
  onCta: () => void;
  onDismiss: () => void;
}

export function AchievementModal({
  visible, backgroundColor, iconName,
  headline, subtitle, body,
  ctaLabel, ctaIconName, onCta, onDismiss,
}: AchievementModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={[styles.card, { backgroundColor }]}>

          {/* Icon circle */}
          <View style={styles.iconCircle}>
            <Ionicons name={iconName} size={28} color={Colors.white} />
          </View>

          {/* Text */}
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.body}>{body}</Text>

          {/* CTA */}
          <TouchableOpacity style={styles.ctaButton} onPress={onCta} activeOpacity={0.85}>
            <Ionicons name={ctaIconName} size={16} color={Colors.graphite} />
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity onPress={onDismiss} style={styles.dismissWrapper}>
            <Text style={styles.dismissText}>Not now</Text>
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
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headline: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: Typography.fontSize.xxxl,
    color: Colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.fontSize.lg,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xxl,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
    width: '100%',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  ctaText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: Typography.fontSize.base,
    color: Colors.graphite,
  },
  dismissWrapper: { paddingVertical: Spacing.sm },
  dismissText: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
  },
});