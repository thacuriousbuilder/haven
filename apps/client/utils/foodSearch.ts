


import { supabase } from '@haven/shared-utils';

interface FoodSearchResult {
  food_id: string;
  food_name: string;
  brand_name?: string;
  food_description: string;
}

interface FoodDetails {
  food_id: string;
  name: string;
  brand?: string;
  serving_description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

interface RecentFood {
  food_name: string;
  calories: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  meal_type: string;
}

// Use environment variable if available, otherwise use DEMO_KEY
const USDA_API_KEY =process.env.EXPO_PUBLIC_USDA_API_KEY
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';

/**
 * Search for foods using USDA FoodData Central API
 * @param query - Search term (e.g., "pizza", "banana", "chicken breast")
 * @returns Array of food search results
 */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  try {
    if (!query.trim()) {
      console.log('⚠️ Empty search query');
      return [];
    }

    console.log('🔍 Searching USDA for:', query);
    
    const params = new URLSearchParams({
      query: query,
      pageSize: '20',
      api_key: USDA_API_KEY,
    });

    const url = `${USDA_API_URL}/foods/search?${params}`;
    
    const response = await fetch(url);
    
    console.log('📥 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ USDA API error:', errorText);
      throw new Error('USDA search failed');
    }

    const data = await response.json();
    
    if (!data.foods || data.foods.length === 0) {
      console.log('⚠️ No foods found for:', query);
      return [];
    }

    console.log('📦 Found', data.foods.length, 'foods');

    // Transform USDA format to our format
    const foods: FoodSearchResult[] = data.foods.map((food: any) => {
      // Helper function to find nutrient by ID
      const getNutrientValue = (nutrientId: number): number => {
        const nutrient = food.foodNutrients?.find(
          (n: any) => n.nutrientId === nutrientId
        );
        return nutrient?.value || 0;
      };

      const calories = getNutrientValue(1008); // Energy (kcal)
      const protein = getNutrientValue(1003); // Protein
      const carbs = getNutrientValue(1005); // Carbohydrate
      const fat = getNutrientValue(1004); // Total lipid (fat)

      // Build description string
      const description = `Calories: ${Math.round(calories)} | Protein: ${protein.toFixed(1)}g | Carbs: ${carbs.toFixed(1)}g | Fat: ${fat.toFixed(1)}g`;

      return {
        food_id: food.fdcId.toString(),
        food_name: food.description || 'Unknown Food',
        brand_name: food.brandOwner || food.brandName || undefined,
        food_description: description,
      };
    });

    console.log('✅ Returning', foods.length, 'transformed foods');
    return foods;
  } catch (error) {
    console.error('💥 Error searching foods:', error);
    return [];
  }
}

/**
 * Get detailed nutrition information for a specific food
 * @param foodId - USDA FDC ID
 * @returns Detailed food nutrition data
 */
export async function getFoodDetails(foodId: string): Promise<FoodDetails | null> {
  try {
    console.log('📋 Getting details for food ID:', foodId);
    
    const url = `${USDA_API_URL}/food/${foodId}?api_key=${USDA_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to get food details:', errorText);
      return null;
    }

    const food = await response.json();
    console.log('📦 Got food details:', food.description);

    // Helper function to extract nutrient by ID
    const getNutrient = (nutrientId: number): number => {
      const nutrient = food.foodNutrients?.find(
        (n: any) => n.nutrient?.id === nutrientId || n.nutrientId === nutrientId
      );
      return nutrient?.amount || nutrient?.value || 0;
    };

    const calories = getNutrient(1008); // Energy (kcal)
    const protein = getNutrient(1003); // Protein
    const carbs = getNutrient(1005); // Carbohydrate, by difference
    const fat = getNutrient(1004); // Total lipid (fat)
    const fiber = getNutrient(1079); // Fiber, total dietary

    // Determine serving size
    let servingDescription = '100g'; // Default
    
    if (food.servingSize && food.servingSizeUnit) {
      servingDescription = `${food.servingSize}${food.servingSizeUnit}`;
    } else if (food.householdServingFullText) {
      servingDescription = food.householdServingFullText;
    }

    const details: FoodDetails = {
      food_id: food.fdcId.toString(),
      name: food.description || 'Unknown Food',
      brand: food.brandOwner || food.brandName || undefined,
      serving_description: servingDescription,
      calories: Math.round(calories),
      protein: parseFloat(protein.toFixed(1)),
      carbs: parseFloat(carbs.toFixed(1)),
      fat: parseFloat(fat.toFixed(1)),
      fiber: fiber > 0 ? parseFloat(fiber.toFixed(1)) : undefined,
    };

    console.log('✅ Nutrition details:', details);
    return details;
  } catch (error) {
    console.error('💥 Error getting food details:', error);
    return null;
  }
}

/**
 * Get user's recently logged foods
 * @param userId - User ID
 * @param limit - Number of unique foods to return
 * @returns Array of recent foods
 */
export async function getRecentFoods(userId: string, limit: number = 10): Promise<RecentFood[]> {
  try {
    console.log('📋 Fetching recent foods for user:', userId);
    
    const { data, error } = await supabase
      .from('food_logs')
      .select('food_name, calories, protein_grams, carbs_grams, fat_grams, meal_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit * 3); // Get more to allow for deduplication

    if (error) {
      console.error('❌ Error fetching recent foods:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No recent foods found');
      return [];
    }

    // Deduplicate by food_name (case-insensitive), keep most recent
    const uniqueFoods = new Map<string, RecentFood>();
    
    data.forEach(food => {
      const normalizedName = food.food_name.toLowerCase().trim();
      
      if (!uniqueFoods.has(normalizedName)) {
        uniqueFoods.set(normalizedName, {
          food_name: food.food_name,
          calories: food.calories || 0,
          protein_grams: food.protein_grams || undefined,
          carbs_grams: food.carbs_grams || undefined,
          fat_grams: food.fat_grams || undefined,
          meal_type: food.meal_type,
        });
      }
    });

    const recentFoods = Array.from(uniqueFoods.values()).slice(0, limit);
    
    console.log('✅ Returning', recentFoods.length, 'unique recent foods');
    return recentFoods;
  } catch (error) {
    console.error('💥 Error in getRecentFoods:', error);
    return [];
  }
}

/**
 * Cache a food from API to local database for faster future access
 * @param food - Food details to cache
 */
export async function cacheFoodToDatabase(food: FoodDetails): Promise<void> {
  try {
    console.log('💾 Caching food to database:', food.name);
    
    const { error } = await supabase
      .from('food_cache')
      .upsert({
        food_id: food.food_id,
        name: food.name,
        brand: food.brand || null,
        serving_description: food.serving_description,
        calories: food.calories,
        protein_grams: food.protein,
        carbs_grams: food.carbs,
        fat_grams: food.fat,
        fiber_grams: food.fiber || null,
        source: 'usda',
      }, {
        onConflict: 'food_id',
      });

    if (error) {
      console.error('❌ Error caching food:', error);
    } else {
      console.log('✅ Food cached successfully');
    }
  } catch (error) {
    console.error('💥 Error in cacheFoodToDatabase:', error);
  }
}

/**
 * Search cached foods locally before hitting API
 * @param query - Search term
 * @returns Array of cached food results
 */
export async function searchCachedFoods(query: string): Promise<FoodSearchResult[]> {
  try {
    console.log('🔍 Searching cached foods for:', query);
    
    const { data, error } = await supabase
      .from('food_cache')
      .select('*')
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('❌ Error searching cache:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No cached foods found');
      return [];
    }

    const results: FoodSearchResult[] = data.map(food => ({
      food_id: food.food_id,
      food_name: food.name,
      brand_name: food.brand || undefined,
      food_description: `Calories: ${food.calories} | Protein: ${food.protein_grams}g | Carbs: ${food.carbs_grams}g | Fat: ${food.fat_grams}g`,
    }));

    console.log('✅ Found', results.length, 'cached foods');
    return results;
  } catch (error) {
    console.error('💥 Error in searchCachedFoods:', error);
    return [];
  }
}