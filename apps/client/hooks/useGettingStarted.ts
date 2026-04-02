
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'haven_getting_started';

export type GettingStartedItem = 
  | 'log_first_meal'
  | 'adjust_budget'
  | 'plan_treat_day'
  | 'read_why_weekly';

interface GettingStartedState {
  completed: Record<GettingStartedItem, boolean>;
  dismissed: boolean;
}

const DEFAULT_STATE: GettingStartedState = {
  completed: {
    log_first_meal: false,
    adjust_budget: false,
    plan_treat_day: false,
    read_why_weekly: false,
  },
  dismissed: false,
};

export function useGettingStarted() {
  const [state, setState] = useState<GettingStartedState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch (e) {
      console.error('GettingStarted load error:', e);
    } finally {
      setLoaded(true);
    }
  };

  const save = async (next: GettingStartedState) => {
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const markComplete = (item: GettingStartedItem) => {
    const next = {
      ...state,
      completed: { ...state.completed, [item]: true },
    };
    save(next);
  };

  const dismiss = () => save({ ...state, dismissed: true });

  const completedCount = Object.values(state.completed).filter(Boolean).length;
  const totalCount = 4;
  const allDone = completedCount === totalCount;
  const visible = loaded && !state.dismissed;

  return { state, markComplete, dismiss, completedCount, totalCount, allDone, visible };
}