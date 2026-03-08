

//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Basis = 'per_serving' | 'estimated_from_100g' | 'mixed' | 'unknown'
type Confidence = 'high' | 'medium' | 'low'

interface NutrientResult {
  value: number | null
  basis: 'per_serving' | 'estimated_from_100g' | 'unknown'
}

interface BarcodeResult {
  food_name: string
  brand?: string
  calories: number | null
  protein_grams: number | null
  carbs_grams: number | null
  fat_grams: number | null
  serving_description: string
  barcode: string
  source: 'open_food_facts'
  basis: Basis
  confidence: Confidence
}

// Two-tier only: _serving → _100g + valid qty → null
const getNutrient = (
  nutriments: Record<string, any>,
  key: string,
  servingQty: number | null
): NutrientResult => {
  const serving = parseFloat(nutriments[`${key}_serving`] ?? '')
  if (!Number.isNaN(serving)) {
    return { value: Math.round(serving * 10) / 10, basis: 'per_serving' }
  }

  const per100 = parseFloat(nutriments[`${key}_100g`] ?? '')
  if (!Number.isNaN(per100) && servingQty !== null && servingQty > 0) {
    return {
      value: Math.round((per100 * servingQty) / 100 * 10) / 10,
      basis: 'estimated_from_100g',
    }
  }

  return { value: null, basis: 'unknown' }
}

const getCalories = (
  nutriments: Record<string, any>,
  servingQty: number | null
): NutrientResult => {
  const serving = parseFloat(nutriments['energy-kcal_serving'] ?? '')
  if (!Number.isNaN(serving)) {
    return { value: Math.round(serving), basis: 'per_serving' }
  }

  const per100 = parseFloat(nutriments['energy-kcal_100g'] ?? '')
  if (!Number.isNaN(per100) && servingQty !== null && servingQty > 0) {
    return {
      value: Math.round((per100 * servingQty) / 100),
      basis: 'estimated_from_100g',
    }
  }

  return { value: null, basis: 'unknown' }
}

const deriveConfidence = (
  bases: Array<'per_serving' | 'estimated_from_100g' | 'unknown'>,
  nutritionDataPer: string | undefined
): { basis: Basis; confidence: Confidence } => {
  const hasUnknown = bases.some(b => b === 'unknown')
  const allServing = bases.every(b => b === 'per_serving')
  const all100g = bases.every(b => b === 'estimated_from_100g')
  const allKnown = !hasUnknown

  // Log a warning if nutrition_data_per is ambiguous
  if (nutritionDataPer && nutritionDataPer !== '100g') {
    console.warn(`⚠️ nutrition_data_per is "${nutritionDataPer}" — 100g conversion may be unreliable`)
  }

  if (allServing) {
    return { basis: 'per_serving', confidence: 'high' }
  }

  if (all100g) {
    // Downgrade to low if the per-100g basis is not clearly confirmed
    const confidence = nutritionDataPer === '100g' || nutritionDataPer === undefined
      ? 'medium'
      : 'low'
    return { basis: 'estimated_from_100g', confidence }
  }

  if (allKnown) {
    // Mixed per_serving and estimated_from_100g
    return { basis: 'mixed', confidence: 'medium' }
  }

  if (hasUnknown && bases.some(b => b !== 'unknown')) {
    // Some resolved, some not
    return { basis: 'mixed', confidence: 'low' }
  }

  return { basis: 'unknown', confidence: 'low' }
}

//@ts-ignore
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('❌ Auth failed:', userError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // ── Request body ──────────────────────────────────────────────────────────
    const { barcode } = await req.json()

    if (!barcode || typeof barcode !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'barcode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sanitized = barcode.replace(/[^0-9]/g, '').slice(0, 14)
    if (!sanitized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid barcode format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Looking up barcode:', sanitized)

    // ── Open Food Facts lookup ────────────────────────────────────────────────
    const fields = 'product_name,brands,nutriments,serving_size,serving_quantity,nutrition_data_per,quantity'
    const url = `https://world.openfoodfacts.net/api/v2/product/${sanitized}?fields=${fields}`

    const offResponse = await fetch(url, {
      headers: {
        'User-Agent': 'HAVEN/1.0 (Supabase Edge; https://tryhaven.co; contact: tryhaven1@gmail.com)',
        'Accept': 'application/json',
      },
    })

    if (!offResponse.ok) {
      console.error('❌ Open Food Facts returned:', offResponse.status)
      throw new Error(`Open Food Facts returned ${offResponse.status}`)
    }

    const json = await offResponse.json()

    if (json.status !== 1 || !json.product) {
      console.error('❌ Product not found for barcode:', sanitized)
      return new Response(
        JSON.stringify({ success: false, error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const p = json.product
    const n: Record<string, any> = p.nutriments || {}
    const nutritionDataPer: string | undefined = p.nutrition_data_per

    console.log('📦 Product found:', p.product_name, '| nutrition_data_per:', nutritionDataPer ?? 'not set')

    // ── Serving quantity ──────────────────────────────────────────────────────
    const rawServingQty = parseFloat(p.serving_quantity ?? '')
    const servingQty = !Number.isNaN(rawServingQty) && rawServingQty > 0 ? rawServingQty : null

    if (servingQty === null) {
      console.warn('⚠️ No valid serving_quantity — 100g calculations unavailable')
    }

    // ── Extract nutrients ─────────────────────────────────────────────────────
    const calResult     = getCalories(n, servingQty)
    const proteinResult = getNutrient(n, 'proteins', servingQty)
    const carbsResult   = getNutrient(n, 'carbohydrates', servingQty)
    const fatResult     = getNutrient(n, 'fat', servingQty)

    const allBases = [calResult.basis, proteinResult.basis, carbsResult.basis, fatResult.basis]
    const { basis, confidence } = deriveConfidence(allBases, nutritionDataPer)

    const result: BarcodeResult = {
      food_name: p.product_name || 'Unknown Product',
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      calories: calResult.value,
      protein_grams: proteinResult.value,
      carbs_grams: carbsResult.value,
      fat_grams: fatResult.value,
      serving_description: p.serving_size || (servingQty ? `${servingQty}g` : 'Unknown serving'),
      barcode: sanitized,
      source: 'open_food_facts',
      basis,
      confidence,
    }

    console.log(`✅ Mapped: ${result.food_name} — ${result.calories ?? '?'} cal | basis: ${basis} | confidence: ${confidence}`)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in lookupBarcode:', error)
    return new Response(
      JSON.stringify({
        success: false,
        //@ts-ignore
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})