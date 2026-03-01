
//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  validateString,
  buildValidationResponse,
  checkRateLimit,
  rateLimitResponse,
} from '../_shared/validate.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

interface NutritionEstimate {
  food_name: string
  calories: number
  protein_grams: number
  carbs_grams: number
  fat_grams: number
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 estimateNutrition called')

    // 1. Verify JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
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
      console.error('❌ Auth failed:', userError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // 2. Rate limit — 20 estimates per hour
    const adminClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { allowed, remaining } = await checkRateLimit(
      adminClient,
      user.id,
      'estimateNutrition',
      { maxRequests: 20, windowMinutes: 60 }
    )

    if (!allowed) {
      console.warn('🚫 Rate limit exceeded for user:', user.id)
      return rateLimitResponse(corsHeaders)
    }

    console.log(`📊 Rate limit ok — ${remaining} requests remaining this hour`)

    // 3. Validate inputs
    const { food_description, meal_type } = await req.json()

    const validationResponse = buildValidationResponse([
      validateString(food_description, 'food_description', { minLength: 3, maxLength: 500 }),
    ], corsHeaders)
    if (validationResponse) return validationResponse

    if (meal_type && !VALID_MEAL_TYPES.includes(meal_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `meal_type must be one of: ${VALID_MEAL_TYPES.join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 Estimating nutrition for:', food_description, '| Meal:', meal_type)

    //@ts-ignore
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mealContext = meal_type
      ? `This is for ${meal_type}. Use typical ${meal_type} portion sizes as your reference.`
      : 'Use standard restaurant portion sizes as your reference.'

    console.log('🤖 Calling OpenAI (GPT-4o-mini)...')

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a nutrition expert estimating nutritional values from food descriptions. ${mealContext}

RULES:
- If multiple foods are described, sum ALL items into one total
- If a weight or volume is given (e.g. 200g, 1 cup), use it precisely
- If no portion is given, assume a standard restaurant serving for that meal type
- Aim for accuracy — when uncertain, pick the midpoint estimate
- Never guess wildly — if description is too vague, reflect that in confidence level

Return ONLY valid JSON, no extra text:
{
  "food_name": "cleaned up version of the full description",
  "calories": estimated total calories as a number,
  "protein_grams": estimated protein in grams as a number,
  "carbs_grams": estimated carbs in grams as a number,
  "fat_grams": estimated fat in grams as a number,
  "confidence": "high" | "medium" | "low",
  "notes": "brief explanation of portion assumptions made"
}

Confidence guide:
- "high": specific description with portion size (e.g. "8oz grilled chicken breast")
- "medium": food identified but portion assumed (e.g. "grilled chicken breast")
- "low": vague description with many unknowns (e.g. "chicken dish")`
          },
          {
            role: 'user',
            content: `Estimate the nutritional information for: ${food_description}`
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('❌ OpenAI API error:', errorData)
      return new Response(
        JSON.stringify({ success: false, error: 'AI estimation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let nutritionEstimate: NutritionEstimate
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      nutritionEstimate = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', content)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!nutritionEstimate.food_name || typeof nutritionEstimate.calories !== 'number') {
      return new Response(
        JSON.stringify({ success: false, error: 'Incomplete nutrition data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Estimated:', nutritionEstimate.food_name, '-', nutritionEstimate.calories, 'cal')

    // Log AI usage
    try {
      await userClient
        .from('ai_usage_logs')
        .insert({
          user_id: user.id,
          feature: 'text_nutrition_estimate',
          input_data: { food_description, meal_type },
          output_data: nutritionEstimate,
          model_used: 'gpt-4o-mini',
          cost_estimate: 0.00015,
        })
      console.log('📊 Usage logged')
    } catch (logError) {
      console.warn('⚠️ Failed to log AI usage:', logError)
    }

    return new Response(
      JSON.stringify({ success: true, data: nutritionEstimate }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in estimateNutrition:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})