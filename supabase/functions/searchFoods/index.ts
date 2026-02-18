

//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  validateString,
  sanitizeString,
  buildValidationResponse,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/validate.ts'

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

    // 1. Validate input
    const validationResponse = buildValidationResponse([
      validateString(query, 'query', { minLength: 1, maxLength: 100 }),
    ], corsHeaders)
    if (validationResponse) return validationResponse

    const safeQuery = sanitizeString(query)
    console.log('🔍 Searching for:', safeQuery)

    // 2. Verify JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Rate limit — 60 searches per hour
    const { allowed, remaining } = await checkRateLimit(
      adminClient,
      user.id,
      'searchFoods',
      { maxRequests: 60, windowMinutes: 60 }
    )

    if (!allowed) {
      console.warn('🚫 Rate limit exceeded for user:', user.id)
      return rateLimitResponse(corsHeaders)
    }

    console.log(`📊 Rate limit ok — ${remaining} searches remaining this hour`)

    // 4. Check cache first
    const { data: cachedFoods } = await adminClient
      .from('food_cache')
      .select('*')
      .or(`name.ilike.%${safeQuery}%,brand.ilike.%${safeQuery}%`)
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

    // 5. Search USDA + Open Food Facts in parallel
    //@ts-ignore
    const usdaKey = Deno.env.get('USDA_API_KEY') ?? ''

    const [usdaResponse, offResponse] = await Promise.allSettled([
      fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(safeQuery)}&pageSize=10&api_key=${usdaKey}`),
      fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(safeQuery)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,nutriments,serving_size`)
    ])

    const results: FoodResult[] = []

    // USDA first — raw/whole foods
    if (usdaResponse.status === 'fulfilled' && usdaResponse.value.ok) {
      const usdaData = await usdaResponse.value.json()
      const foods = usdaData.foods || []

      for (const food of foods) {
        const getNutrient = (id: number) =>
          food.foodNutrients?.find((n: any) => n.nutrientId === id)?.value || 0

        const calories = getNutrient(1008)
        if (calories === 0) continue

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

    // Open Food Facts second — branded/packaged foods
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

    // Deduplicate
    const seen = new Set<string>()
    const deduped = results.filter(r => {
      const key = r.food_name.toLowerCase().slice(0, 20)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Cache new results
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