

import { supabase } from '@/lib/supabase';

export type UnreflectedMeal = {
  id: string;
  food_name: string;
  calories: number;
  created_at: string;
  meal_type: string | null;
  image_url: string | null;
};

// Module-level session guard — resets when app restarts
let hasShownReflectionThisSession = false;

export async function getUnreflectedMeal(): Promise<UnreflectedMeal | null> {
  if (hasShownReflectionThisSession) return null;

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
    .maybeSingle(); 

  if (error || !data) return null;

  hasShownReflectionThisSession = true;
  return data as UnreflectedMeal;
}