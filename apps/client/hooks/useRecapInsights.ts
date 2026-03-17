
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatLocalDate, getMonday } from '@/utils/timezone';

export type Insight = {
    id: 'sweet_spot' | 'flex_day';
    label: string;
    value: string;       
    subtitle: string;    
    icon: string;
    variant: 'teal' | 'orange';
  };

export type RecapInsightsResult = {
  insights: Insight[];
  weeksLogged: number;     // distinct weeks with any data
  hasEnoughData: boolean;  // true when weeksLogged >= 2
  loading: boolean;
};

type FoodLogRow = {
  log_date: string;        // YYYY-MM-DD
  calories: number;
  satiety_response: string | null;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MIN_WEEKS = 2;
const MIN_SATIETY_MEALS = 5;

export function useRecapInsights(): RecapInsightsResult {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [weeksLogged, setWeeksLogged] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);

      // 28-day window from today
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 27);
      const fromStr = formatLocalDate(from);
      const toStr = formatLocalDate(today);

      const { data, error } = await supabase
        .from('food_logs')
        .select('log_date, calories, satiety_response')
        .gte('log_date', fromStr)
        .lte('log_date', toStr)
        .order('log_date', { ascending: true });

      if (error || !data) {
        setLoading(false);
        return;
      }

      const rows = data as FoodLogRow[];

      // Count distinct weeks (Mon-Sun buckets)
      const weekKeys = new Set(
        rows.map(r => formatLocalDate(getMonday(new Date(r.log_date + 'T12:00:00'))))
      );
      const weeks = weekKeys.size;
      setWeeksLogged(weeks);

      if (weeks < MIN_WEEKS) {
        setInsights([]);
        setLoading(false);
        return;
      }

      const result: Insight[] = [];

      // --- Insight 1: Sweet Spot ---
      const satietyYes = rows.filter(r => r.satiety_response === 'yes');
      if (satietyYes.length >= MIN_SATIETY_MEALS) {
        const avg = Math.round(
          satietyYes.reduce((sum, r) => sum + r.calories, 0) / satietyYes.length
        );
        result.push({
            id: 'sweet_spot',
            label: 'Your Sweet Spot',
            value: `~${avg} cal`,
            subtitle: 'Meals this size keep you full most of the time',
            icon: 'restaurant-outline',
            variant: 'teal',
          });
      }

     // --- Insight 2: Big Day ---

    // Step 1: sum calories per date
    const dailyTotals: Record<string, number> = {};
    rows.forEach(r => {
    dailyTotals[r.log_date] = (dailyTotals[r.log_date] ?? 0) + r.calories;
    });

    // Step 2: group daily totals by day of week
    const dayTotals: Record<number, number[]> = {};
    Object.entries(dailyTotals).forEach(([date, total]) => {
    const dow = new Date(date + 'T12:00:00').getDay();
    if (!dayTotals[dow]) dayTotals[dow] = [];
    dayTotals[dow].push(total);
    });

    // Step 3: average each day of week, pick highest
    const dayAvgs = Object.entries(dayTotals).map(([dow, totals]) => ({
    dow: Number(dow),
    avg: totals.reduce((s, c) => s + c, 0) / totals.length,
    }));

    if (dayAvgs.length > 0) {
    const top = dayAvgs.reduce((a, b) => (b.avg > a.avg ? b : a));
    const topAvg = Math.round(top.avg);
    result.push({
        id: 'flex_day',
        label: 'Your Big Day',
        value: DAY_NAMES[top.dow],
        subtitle: `Tends to be your biggest day at ~${topAvg.toLocaleString()} cal — worth planning for`,
        icon: 'time-outline',
        variant: 'orange',
    });
    }

      setInsights(result);
      setLoading(false);
    }

    fetch();
  }, []);

  return {
    insights,
    weeksLogged,
    hasEnoughData: weeksLogged >= MIN_WEEKS,
    loading,
  };
}