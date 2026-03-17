
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { WeekSummary } from '@/types/recap';
import { getMonday, formatLocalDate, formatDateDisplay, parseDateString } from '@/utils/timezone';


type RawLog = { log_date: string; calories: number };

export function useWeeklyRecap() {
  const [weeks, setWeeks]     = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetchWeeks();
  }, []);

  async function fetchWeeks() {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: queryError } = await supabase
        .from('food_logs')
        .select('log_date, calories')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false });

      if (queryError) throw queryError;

      setWeeks(data && data.length > 0 ? groupIntoWeeks(data) : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { weeks, loading, error, refetch: fetchWeeks };
}

function groupIntoWeeks(logs: RawLog[]): WeekSummary[] {
  const weekMap = new Map<string, RawLog[]>();

  for (const log of logs) {
    const monday = formatLocalDate(getMonday(parseDateString(log.log_date)));
    if (!weekMap.has(monday)) weekMap.set(monday, []);
    weekMap.get(monday)!.push(log);
  }

  const result: WeekSummary[] = [];
  let weekNumber = weekMap.size;

  for (const [monday, weekLogs] of weekMap) {
    const start = parseDateString(monday);
    const end   = parseDateString(monday);
    end.setDate(end.getDate() + 6);

    const uniqueDays = new Set(weekLogs.map((l) => l.log_date)).size;
    const totalCal   = weekLogs.reduce((sum, l) => sum + l.calories, 0);

    result.push({
      id:         monday,
      weekNumber,
      startDate:  formatDateDisplay(formatLocalDate(start)),
      endDate:    formatDateDisplay(formatLocalDate(end)),
      startISO:   monday,
      daysLogged: uniqueDays,
      avgPerDay:  Math.round(totalCal / uniqueDays),
      totalCal,
    });

    weekNumber--;
  }

  return result;
}