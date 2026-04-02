

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatLocalDate, getMonday, getSunday, parseDateString } from '@/utils/timezone';

export type DayPlan = {
  date: string;
  dayLabel: string;
  shortDate: string;
  dayNumber: number;
  target: number;
  eaten: number;
  isTreatDay: boolean;
  isToday: boolean;
  isPast: boolean;
  isAdjusted: boolean;
  baseTarget: number;
  adjustedCalories: number | null;
};

export type PlanData = {
  weeklyBudget: number;
  totalEaten: number;
  remaining: number;
  isOverBudget: boolean;
  overageAmount: number;
  days: DayPlan[];
  weeklyPeriodId: string;
  userGoal: string;
  userGender: string;
};

export function usePlanData() {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetchPlanData();
  }, []);

  async function fetchPlanData() {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today  = formatLocalDate(new Date());
      const monday = formatLocalDate(getMonday(new Date()));
      const sunday = formatLocalDate(getSunday(getMonday(new Date())));

      // 1. Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('goal, gender')
        .eq('id', user.id)
        .single();

      const userGoal   = profile?.goal   ?? 'maintain';
      const userGender = profile?.gender ?? 'male';

      // 2. Fetch current weekly period
      const { data: period } = await supabase
        .from('weekly_periods')
        .select('id, weekly_budget, week_start_date, week_end_date')
        .eq('user_id', user.id)
        .eq('week_start_date', monday)
        .maybeSingle();

      if (!period) {
        setError('baseline');
        setLoading(false);
        return;
      }

      // 3. Fetch food logs for this week
      const { data: logs, error: logsError } = await supabase
        .from('food_logs')
        .select('log_date, calories')
        .eq('user_id', user.id)
        .gte('log_date', monday)
        .lte('log_date', sunday);

      if (logsError) throw logsError;

      // 4. Fetch treat days for this week
      const { data: treatDays, error: treatError } = await supabase
        .from('planned_cheat_days')
        .select('cheat_date, planned_calories')
        .eq('user_id', user.id)
        .gte('cheat_date', monday)
        .lte('cheat_date', sunday);

      if (treatError) throw treatError;

      // 5. Fetch manual adjustments for this week
      const { data: adjustments, error: adjError } = await supabase
        .from('daily_target_adjustments')
        .select('target_date, adjusted_calories')
        .eq('user_id', user.id)
        .eq('weekly_period_id', period.id);

      if (adjError) throw adjError;

      // --- Build lookup maps
      const eatenByDay = new Map<string, number>();
      for (const log of logs ?? []) {
        eatenByDay.set(
          log.log_date,
          (eatenByDay.get(log.log_date) ?? 0) + log.calories
        );
      }

      const treatDaySet = new Set((treatDays ?? []).map((t) => t.cheat_date));
      const treatCalMap = new Map(
        (treatDays ?? []).map((t) => [t.cheat_date, t.planned_calories])
      );
      const adjMap = new Map(
        (adjustments ?? []).map((a) => [a.target_date, a.adjusted_calories])
      );

      // --- Build days array (Mon → Sun)
      const baseTarget      = Math.round(period.weekly_budget / 7);
      const days: DayPlan[] = [];
      const start           = parseDateString(monday);

      for (let i = 0; i < 7; i++) {
        const d       = new Date(start);
        d.setDate(start.getDate() + i);
        const dateStr = formatLocalDate(d);
        const isTreat = treatDaySet.has(dateStr);
        const isToday = dateStr === today;
        const isPast  = dateStr < today;

        let target: number;
        if (isTreat) {
          target = treatCalMap.get(dateStr) ?? baseTarget;
        } else if (adjMap.has(dateStr)) {
          target = adjMap.get(dateStr)!;
        } else {
          target = baseTarget;
        }

        days.push({
          date:            dateStr,
          dayLabel:        d.toLocaleDateString('en-US', { weekday: 'short' }),
          shortDate:       d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dayNumber:       d.getDate(),
          target,
          eaten:           eatenByDay.get(dateStr) ?? 0,
          isTreatDay:      isTreat,
          isToday,
          isPast,
          isAdjusted:      adjMap.has(dateStr),
          baseTarget,
          adjustedCalories: adjMap.get(dateStr) ?? null,
        });
      }

      // --- Daily based overage (today only)
      const todayPlan     = days.find(d => d.isToday);
      const isOverBudget  = todayPlan ? todayPlan.eaten > todayPlan.target : false;
      const overageAmount = todayPlan ? Math.max(todayPlan.eaten - todayPlan.target, 0) : 0;

      // --- Weekly totals (for hero card display only)
      const totalEaten   = days.reduce((sum, d) => sum + d.eaten, 0);
      const weeklyBudget = period.weekly_budget;
      const remaining    = weeklyBudget - totalEaten;

      setPlanData({
        weeklyBudget,
        totalEaten,
        remaining,
        isOverBudget,
        overageAmount,
        days,
        weeklyPeriodId: period.id,
        userGoal,
        userGender,
      });
    } catch (err: any) {
      console.log('usePlanData error:', err.message, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { planData, loading, error, refetch: fetchPlanData };
}