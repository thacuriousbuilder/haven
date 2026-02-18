
import { supabase } from '@haven/shared-utils'

export interface FoodSearchResult {
  food_id: string
  food_name: string
  brand_name?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  source: 'cache' | 'usda' | 'openfoodfacts'
}

export interface FoodDetails {
  food_id: string
  name: string
  brand?: string
  serving_description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

export interface RecentFood {
  food_name: string
  calories: number
  protein_grams?: number
  carbs_grams?: number
  fat_grams?: number
  meal_type: string
}

/**
 * Search foods via Edge Function (USDA + Open Food Facts + cache)
 */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  try {
    if (!query.trim()) return []

    console.log('🔍 Searching for:', query)

    const { data, error } = await supabase.functions.invoke('searchFoods', {
      body: { query },
    })

    if (error) {
      console.error('❌ Search error:', error)
      return []
    }

    if (!data?.success) {
      console.error('❌ Search failed:', data?.error)
      return []
    }

    console.log('✅ Got', data.data.length, 'results')
    return data.data as FoodSearchResult[]
  } catch (error) {
    console.error('💥 Error in searchFoods:', error)
    return []
  }
}

/**
 * Get food details directly from search result
 * No extra API call needed — Edge Function returns full nutrition data
 */
export function getFoodDetailsFromResult(result: FoodSearchResult): FoodDetails {
  return {
    food_id: result.food_id,
    name: result.food_name,
    brand: result.brand_name,
    serving_description: 'per serving',
    calories: result.calories,
    protein: result.protein,
    carbs: result.carbs,
    fat: result.fat,
  }
}

/**
 * Get user's recently logged foods
 */
export async function getRecentFoods(userId: string, limit: number = 10): Promise<RecentFood[]> {
  try {
    const { data, error } = await supabase
      .from('food_logs')
      .select('food_name, calories, protein_grams, carbs_grams, fat_grams, meal_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit * 3)

    if (error || !data || data.length === 0) return []

    const uniqueFoods = new Map<string, RecentFood>()

    data.forEach(food => {
      const key = food.food_name.toLowerCase().trim()
      if (!uniqueFoods.has(key)) {
        uniqueFoods.set(key, {
          food_name: food.food_name,
          calories: food.calories || 0,
          protein_grams: food.protein_grams || undefined,
          carbs_grams: food.carbs_grams || undefined,
          fat_grams: food.fat_grams || undefined,
          meal_type: food.meal_type,
        })
      }
    })

    return Array.from(uniqueFoods.values()).slice(0, limit)
  } catch (error) {
    console.error('💥 Error in getRecentFoods:', error)
    return []
  }
}