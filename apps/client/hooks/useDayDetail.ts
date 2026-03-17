
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DaySummary } from '@/types/recap';
import { getSunday, formatLocalDate, formatDateDisplay, parseDateString } from '@/utils/timezone';

type RawLog = {
  log_date: string;
  calories: number;
  meal_type: string;
};

export function useDayDetail(startISO: string) {
  const [days, setDays]       = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetchDays();
  }, [startISO]);

  async function fetchDays() {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      
      const monday = parseDateString(startISO);
      const endISO = formatLocalDate(getSunday(monday));

      const { data, error: queryError } = await supabase
        .from('food_logs')
        .select('log_date, calories, meal_type')
        .eq('user_id', user.id)
        .gte('log_date', startISO)
        .lte('log_date', endISO)
        .order('log_date', { ascending: true });

      if (queryError) throw queryError;

      setDays(data && data.length > 0 ? groupIntoDays(data) : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { days, loading, error };
}

function groupIntoDays(logs: RawLog[]): DaySummary[] {
  const dayMap = new Map<string, RawLog[]>();

  for (const log of logs) {
    if (!dayMap.has(log.log_date)) dayMap.set(log.log_date, []);
    dayMap.get(log.log_date)!.push(log);
  }

  const result: DaySummary[] = [];

  for (const [dateStr, dayLogs] of dayMap) {
    const totalCal = dayLogs.reduce((sum, l) => sum + l.calories, 0);

   
    const date = parseDateString(dateStr);

    result.push({
      id:          dateStr,
      date:        formatDateDisplay(dateStr),
      fullDate:    dateStr,
      dayLabel:    date.toLocaleDateString('en-US', { weekday: 'short' }),
      mealsLogged: dayLogs.length,
      totalCal,
    });
  }

  return result;
}