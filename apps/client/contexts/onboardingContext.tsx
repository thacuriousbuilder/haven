

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingData, initialOnboardingData } from '../types/onboarding';

const STORAGE_KEY = '@haven_onboarding_data';

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  resetData: () => void;
  isRestoring: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore from AsyncStorage on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setData({ ...initialOnboardingData, ...parsed });
          console.log('✅ Onboarding data restored from storage');
        }
      } catch (error) {
        console.error('Error restoring onboarding data:', error);
      } finally {
        setIsRestoring(false);
      }
    };
    restore();
  }, []);

  const updateData = async (updates: Partial<OnboardingData>) => {
    setData(prev => {
      const next = { ...prev, ...updates };
      // Persist to AsyncStorage on every update
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(err =>
        console.error('Error persisting onboarding data:', err)
      );
      return next;
    });
  };

  const resetData = async () => {
    setData(initialOnboardingData);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('✅ Onboarding data cleared');
    } catch (error) {
      console.error('Error clearing onboarding data:', error);
    }
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData, resetData, isRestoring }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

export { STORAGE_KEY as ONBOARDING_STORAGE_KEY };