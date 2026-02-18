//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FoodAnalysis {
  food_name: string;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Function called!')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      console.error('❌ Auth failed:', userError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User authenticated:', user.id)

    const { image_base64 } = await req.json()
    if (!image_base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'No image provided' }),
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
- Be conservative with portions — most people underestimate
- When uncertain between two estimates, pick the higher calorie option
- For restaurant/fast food, assume larger portions
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
- high: food is clearly identifiable with obvious portion size
- medium: food identified but portion size is estimated
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
                  detail: 'low'
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

    console.log('📝 Raw OpenAI response:', content)

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
      console.error('❌ Incomplete nutrition data:', foodAnalysis)
      return new Response(
        JSON.stringify({ success: false, error: 'Incomplete nutrition data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Successfully analyzed:', foodAnalysis.food_name, '-', foodAnalysis.calories, 'cal')

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