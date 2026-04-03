

import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { ModalKey, ModalPayload, OverBudgetPayload, AchievementModalKey } from '@/types/modal';

const OVER_BUDGET_STORAGE_KEY = 'over_budget_last_seen_date';

interface ModalState {
  key: ModalKey | null;
  data?: OverBudgetPayload;
}

interface ModalContextType {
  showModal: (payload: ModalPayload) => Promise<void>;
  dismissModal: () => void;
  currentModal: ModalState;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [currentModal, setCurrentModal] = useState<ModalState>({ key: null });

  const dismissModal = useCallback(() => {
    setCurrentModal({ key: null });
  }, []);

  const showModal = useCallback(async (payload: ModalPayload) => {
    // --- Over budget: check AsyncStorage for today ---
    if (payload.key === 'over_budget') {
      const today = new Date().toISOString().split('T')[0];
      const lastSeen = await AsyncStorage.getItem(OVER_BUDGET_STORAGE_KEY);
      if (lastSeen === today) return; // already shown today
      await AsyncStorage.setItem(OVER_BUDGET_STORAGE_KEY, today);
      setCurrentModal({ key: 'over_budget', data: payload.data });
      return;
    }

    // --- Achievement modals: check DB ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('modals_seen')
      .eq('id', user.id)
      .single();

    const alreadySeen = profile?.modals_seen?.[payload.key as AchievementModalKey];
    if (alreadySeen) return;

    // Mark as seen in DB
    await supabase
      .from('profiles')
      .update({
        modals_seen: {
          ...profile?.modals_seen,
          [payload.key]: new Date().toISOString(),
        },
      })
      .eq('id', user.id);

    setCurrentModal({ key: payload.key });
  }, []);

  return (
    <ModalContext.Provider value={{ showModal, dismissModal, currentModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}