

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

const MAX_IMAGE_SIZE_MB = 5
const MAX_BASE64_LENGTH = MAX_IMAGE_SIZE_MB * 1024 * 1024 * 1.37

interface FoodAnalysis {
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
    console.log('🚀 analyzeFoodImage called')

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

    // 2. Rate limit — 10 image scans per hour
    const adminClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { allowed, remaining } = await checkRateLimit(
      adminClient,
      user.id,
      'analyzeFoodImage',
      { maxRequests: 10, windowMinutes: 60 }
    )

    if (!allowed) {
      console.warn('🚫 Rate limit exceeded for user:', user.id)
      return rateLimitResponse(corsHeaders)
    }

    console.log(`📊 Rate limit ok — ${remaining} requests remaining this hour`)

    // 3. Validate input
    const { image_base64 } = await req.json()

    const validationResponse = buildValidationResponse([
      validateString(image_base64, 'image_base64', { minLength: 1 }),
    ], corsHeaders)
    if (validationResponse) return validationResponse

    // 4. Server-side size check
    if (image_base64.length > MAX_BASE64_LENGTH) {
      console.error('❌ Image too large:', image_base64.length)
      return new Response(
        JSON.stringify({ success: false, error: `Image exceeds ${MAX_IMAGE_SIZE_MB}MB limit` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📸 Image received, length:', image_base64.length)

    //@ts-ignore
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🤖 Calling OpenAI Vision API...')

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert dietitian and nutritionist analyzing food photos for a calorie tracking app.

ANALYSIS STEPS (reason through these before responding):
1. Identify every food item visible in the image
2. Estimate portion sizes using visual cues (plate size, utensils, hands, packaging)
3. Factor in cooking method (fried, grilled, baked, raw) as it significantly affects calories
4. If multiple items, sum all calories into one total

ACCURACY RULES:
- Aim for accuracy — when uncertain, pick the midpoint estimate
- For restaurant/fast food, assume standard menu portion sizes
- For homemade food, assume standard recipe portions

Return ONLY this exact JSON structure, no extra text:
{
  "food_name": "complete description including cooking method and key ingredients",
  "calories": total estimated calories as a number,
  "protein_grams": estimated protein as a number,
  "carbs_grams": estimated carbs as a number,
  "fat_grams": estimated fat as a number,
  "confidence": "high" | "medium" | "low",
  "notes": "key assumptions made about portion size or cooking method"
}

Confidence guide:
- high: food clearly identifiable with obvious portion size
- medium: food identified but portion size estimated
- low: food unclear or partially visible`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this food image and provide nutritional information.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('❌ OpenAI API error:', errorData)
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
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

    let foodAnalysis: FoodAnalysis
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      foodAnalysis = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', content)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!foodAnalysis.food_name || typeof foodAnalysis.calories !== 'number') {
      return new Response(
        JSON.stringify({ success: false, error: 'Incomplete nutrition data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Analyzed:', foodAnalysis.food_name, '-', foodAnalysis.calories, 'cal')

    return new Response(
      JSON.stringify({ success: true, data: foodAnalysis }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in analyzeFoodImage:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})