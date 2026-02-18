// supabase/functions/searchFoods/index.ts

//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FoodResult {
  food_id: string
  food_name: string
  brand_name?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  source: 'cache' | 'usda' | 'openfoodfacts'
}

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()

    if (!query?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing query' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Searching for:', query)

    const adminClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Check cache first
    const { data: cachedFoods } = await adminClient
      .from('food_cache')
      .select('*')
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(10)

    if (cachedFoods && cachedFoods.length >= 5) {
      console.log('✅ Cache hit:', cachedFoods.length, 'results')
      const results: FoodResult[] = cachedFoods.map((f: any) => ({
        food_id: f.food_id,
        food_name: f.name,
        brand_name: f.brand || undefined,
        calories: f.calories,
        protein: f.protein_grams,
        carbs: f.carbs_grams,
        fat: f.fat_grams,
        source: 'cache',
      }))
      return new Response(
        JSON.stringify({ success: true, data: results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Search USDA + Open Food Facts in parallel
    //@ts-ignore
    const usdaKey = Deno.env.get('USDA_API_KEY') ?? ''

    const [usdaResponse, offResponse] = await Promise.allSettled([
      fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${usdaKey}`),
      fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,nutriments,serving_size`)
    ])

    const results: FoodResult[] = []

    // USDA first — raw/whole foods (higher priority)
    if (usdaResponse.status === 'fulfilled' && usdaResponse.value.ok) {
      const usdaData = await usdaResponse.value.json()
      const foods = usdaData.foods || []

      for (const food of foods) {
        const getNutrient = (id: number) =>
          food.foodNutrients?.find((n: any) => n.nutrientId === id)?.value || 0

        const calories = getNutrient(1008)
        if (calories === 0) continue

        // Clean up USDA ALL CAPS names
        const cleanName = food.description
          ?.toLowerCase()
          .replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Unknown'

        results.push({
          food_id: `usda_${food.fdcId}`,
          food_name: cleanName,
          brand_name: food.brandOwner || food.brandName || undefined,
          calories: Math.round(calories),
          protein: Math.round(getNutrient(1003)),
          carbs: Math.round(getNutrient(1005)),
          fat: Math.round(getNutrient(1004)),
          source: 'usda',
        })
      }
      console.log('🇺🇸 USDA results:', results.length)
    }

    // Open Food Facts second — branded/packaged foods (lower priority)
    if (offResponse.status === 'fulfilled' && offResponse.value.ok) {
      const offData = await offResponse.value.json()
      const products = offData.products || []

      for (const product of products) {
        const name = product.product_name?.trim()
        const calories = product.nutriments?.['energy-kcal_serving']
          || product.nutriments?.['energy-kcal_100g']
          || 0

        if (!name || calories === 0) continue

        results.push({
          food_id: `off_${product.code || Math.random().toString(36).slice(2)}`,
          food_name: name,
          brand_name: product.brands?.split(',')[0]?.trim() || undefined,
          calories: Math.round(calories),
          protein: Math.round(product.nutriments?.proteins_serving || product.nutriments?.proteins_100g || 0),
          carbs: Math.round(product.nutriments?.carbohydrates_serving || product.nutriments?.carbohydrates_100g || 0),
          fat: Math.round(product.nutriments?.fat_serving || product.nutriments?.fat_100g || 0),
          source: 'openfoodfacts',
        })
      }
      console.log('🌍 Open Food Facts results:', results.length)
    }

    // Deduplicate by name similarity
    const seen = new Set<string>()
    const deduped = results.filter(r => {
      const key = r.food_name.toLowerCase().slice(0, 20)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Cache new results for next time
    const toCache = deduped.filter(r => r.source !== 'cache').slice(0, 10)
    if (toCache.length > 0) {
      await adminClient.from('food_cache').upsert(
        toCache.map(f => ({
          food_id: f.food_id,
          name: f.food_name,
          brand: f.brand_name || null,
          serving_description: 'per serving',
          calories: f.calories,
          protein_grams: f.protein,
          carbs_grams: f.carbs,
          fat_grams: f.fat,
          source: f.source,
        })),
        { onConflict: 'food_id' }
      )
      console.log('💾 Cached', toCache.length, 'new foods')
    }

    console.log('✅ Returning', deduped.length, 'results')
    return new Response(
      JSON.stringify({ success: true, data: deduped.slice(0, 20) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in searchFoods:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})