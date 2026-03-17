
import { supabase } from '@/lib/supabase';

export type UnreflectedMeal = {
  id: string;
  food_name: string;
  calories: number;
  created_at: string; // ISO timestamp
  meal_type: string | null;
  image_url: string | null;
};

/**
 * Returns the most recent meal that:
 * - Was logged 2–6 hours ago
 * - Has no satiety_response saved
 * - Is within the 8-hour hard cutoff
 *
 * Returns null if no meal qualifies.
 */
export async function getUnreflectedMeal(): Promise<UnreflectedMeal | null> {
  const now = new Date();

  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
  .from('food_logs')
  .select('id, food_name, calories, created_at, meal_type, image_url')
  .lte('created_at', twoHoursAgo)
  .gte('created_at', sixHoursAgo)
  .is('satiety_response', null)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

  if (error || !data) return null;

  return data as UnreflectedMeal;
}