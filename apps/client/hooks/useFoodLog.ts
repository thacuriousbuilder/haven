
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FoodLogItem } from '@/components/weekly//recap/dayDetailView';

export function useFoodLog(dateStr: string) {
  const [foodLogs, setFoodLogs] = useState<FoodLogItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetchFoodLogs();
  }, [dateStr]);

  async function fetchFoodLogs() {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: queryError } = await supabase
        .from('food_logs')
        .select(`
          id,
          meal_type,
          meal_time,
          food_name,
          calories,
          food_tag,
          image_url,
          protein_grams,
          carbs_grams,
          fat_grams,
          is_favorite,
          eat_reason,
          satiety_response
        `)
        .eq('user_id', user.id)
        .eq('log_date', dateStr)
        .order('meal_time', { ascending: true, nullsFirst: false });

      if (queryError) throw queryError;

      setFoodLogs(data ? data.map(mapToFoodLogItem) : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { foodLogs, loading, error, refetch: fetchFoodLogs };
}

function mapToFoodLogItem(row: any): FoodLogItem {
  return {
    id:              row.id,
    mealTime:        row.meal_time ?? '',
    mealType:        (row.meal_type as string).toUpperCase(),
    foodName:        row.food_name,
    calories:        row.calories,
    foodTag:         row.food_tag ?? null,
    imageUrl:        row.image_url ?? null,
    proteinGrams:    row.protein_grams ?? null,
    carbsGrams:      row.carbs_grams ?? null,
    fatGrams:        row.fat_grams ?? null,
    isFavorite:      row.is_favorite ?? false,
    eatReason:       row.eat_reason ?? [],
    satietyResponse: row.satiety_response ?? null,
  };
}