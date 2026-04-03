
import React from 'react';
import { router } from 'expo-router';
import { useModal } from '@/contexts/modalContext';
import { AchievementModal } from './achievementModal';
import { OverBudgetModal } from './overBudgetModal';
import { Colors } from '@/constants/colors';

const MODAL_CONFIG = {
  budget_personalized: {
    backgroundColor: Colors.vividTeal,
    iconName: 'radio-button-on-outline' as const,
    headline: 'Budget',
    subtitle: 'personalized!',
    body: 'HAVEN adapts to you, not the other way around. Your plan is uniquely yours.',
    ctaLabel: 'keep going',
    ctaIconName: 'sparkles-outline' as const,
    ctaRoute: '/(tabs)/weekly?tab=plan',
  },
  knowledge_unlocked: {
    backgroundColor: Colors.vividTeal,
    iconName: 'bulb-outline' as const,
    headline: 'Knowledge',
    subtitle: 'unlocked!',
    body: 'The more you learn about weekly budgeting, the easier it becomes to live it.',
    ctaLabel: 'Keep Learning',
    ctaIconName: 'book-outline' as const,
    ctaRoute: '/(tabs)/weekly?tab=discovery',
  },
  first_meal: {
    backgroundColor: Colors.vividTeal,
    iconName: 'restaurant-outline' as const,
    headline: 'First meal',
    subtitle: 'logged!',
    body: "You're building the foundation of your weekly budget. Keep logging!",
    ctaLabel: 'Keep Going',
    ctaIconName: 'sparkles-outline' as const,
    ctaRoute: '/(tabs)/home',
  },
  treat_day_planned: {
    backgroundColor: Colors.energyOrange,
    iconName: 'gift-outline' as const,
    headline: 'Treat day',
    subtitle: 'planned!',
    body: "Life is meant to be enjoyed. Your treat day is now part of your plan.",
    ctaLabel: 'Keep Going',
    ctaIconName: 'sparkles-outline' as const,
    ctaRoute: '/(tabs)/weekly?tab=plan',
  },
};

export function ModalRenderer() {
  const { currentModal, dismissModal } = useModal();

  if (!currentModal.key) return null;

  // Over budget modal
  if (currentModal.key === 'over_budget' && currentModal.data) {
    return (
      <OverBudgetModal
        visible={true}
        data={currentModal.data}
        onManage={() => {
          dismissModal();
          router.push('/(tabs)/weekly?tab=plan&refreshPlan=true');
        }}
        onDismiss={dismissModal}
      />
    );
  }

  // Achievement modals
  const config = MODAL_CONFIG[currentModal.key as keyof typeof MODAL_CONFIG];
  if (!config) return null;

  return (
    <AchievementModal
      visible={true}
      {...config}
      onCta={() => {
        dismissModal();
        router.push(config.ctaRoute as any);
      }}
      onDismiss={dismissModal}
    />
  );
}