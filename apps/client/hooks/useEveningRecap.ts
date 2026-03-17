
import { useState, useEffect } from 'react';
import { supabase } from '@haven/shared-utils';
import { getLocalDateString } from '@/utils/timezone';

export type MissedMeal = 'breakfast' | 'lunch' | 'dinner';

export type UnreflectedLog = {
  id: string;
  food_name: string;
  calories: number;
  meal_type: string | null;
  image_url: string | null;
};

export type EveningRecapData = {
  missedMeals: MissedMeal[];
  unreflectedLogs: UnreflectedLog[];
  totalCaloriesToday: number;
  dailyTarget: number;
  loading: boolean;
};

const MEAL_TYPES: MissedMeal[] = ['breakfast', 'lunch', 'dinner'];

export function useEveningRecap(): EveningRecapData {
  const [missedMeals, setMissedMeals]           = useState<MissedMeal[]>([]);
  const [unreflectedLogs, setUnreflectedLogs]   = useState<UnreflectedLog[]>([]);
  const [totalCaloriesToday, setTotalCalories]  = useState(0);
  const [dailyTarget, setDailyTarget]           = useState(0);
  const [loading, setLoading]                   = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const today = getLocalDateString();
      console.log('🌙 useEveningRecap — today:', today);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('🌙 user:', user?.id, 'authError:', authError);
      if (!user) { setLoading(false); return; }

      const { data: logs, error: logsError } = await supabase
        .from('food_logs')
        .select('id, food_name, calories, meal_type, image_url, satiety_response')
        .eq('user_id', user.id)
        .eq('log_date', today);

      console.log('🌙 logs:', JSON.stringify(logs));
      console.log('🌙 logsError:', logsError);

      if (logs) {
        const loggedMealTypes = new Set(logs.map(l => l.meal_type));
        console.log('🌙 loggedMealTypes:', [...loggedMealTypes]);

        const missed = MEAL_TYPES.filter(m => !loggedMealTypes.has(m));
        console.log('🌙 missedMeals:', missed);

        const unreflected = logs.filter(l => l.satiety_response === null);
        console.log('🌙 unreflectedLogs:', unreflected.length);

        setMissedMeals(missed);
        setUnreflectedLogs(unreflected.map(l => ({
          id: l.id,
          food_name: l.food_name,
          calories: l.calories,
          meal_type: l.meal_type,
          image_url: l.image_url,
        })));

        const total = logs.reduce((sum, l) => sum + (l.calories ?? 0), 0);
        console.log('🌙 totalCal:', total);
        setTotalCalories(total);
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('daily_target')
        .eq('id', user.id)
        .single();

      console.log('🌙 dailyTarget:', profile?.daily_target, 'profileError:', profileError);
      setDailyTarget(profile?.daily_target ?? 0);
      setLoading(false);
    }

    fetch();
  }, []);

  return { missedMeals, unreflectedLogs, totalCaloriesToday, dailyTarget, loading };
}