

//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NutritionEstimate {
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 estimateNutrition called!')

    // Get authorization header and extract token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 Token received')

    // Create Supabase client
    const supabaseClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify user with token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      console.error('❌ Auth failed:', userError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Get request body
    const { food_description, meal_type } = await req.json()
    
    if (!food_description || !food_description.trim()) {
      console.error('❌ No food description provided')
      return new Response(
        JSON.stringify({ success: false, error: 'No food description provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 Estimating nutrition for:', food_description, '| Meal:', meal_type)

    // Call OpenAI API
    //@ts-ignore
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🤖 Calling OpenAI (GPT-4o-mini)...')

    // Build context-aware prompt based on meal type
    const mealContext = meal_type 
      ? `This is for ${meal_type}. Consider typical ${meal_type} portion sizes.`
      : 'Consider standard portion sizes.';

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

Return ONLY a JSON object with this exact structure:
{
  "food_name": "cleaned up version of the food description",
  "calories": estimated total calories (number),
  "protein_grams": estimated protein in grams (number),
  "carbs_grams": estimated carbs in grams (number),
  "fat_grams": estimated fat in grams (number),
  "confidence": "high" | "medium" | "low",
  "notes": "any assumptions about portions or ingredients"
}

Confidence guidelines:
- "high": Very specific description with portion sizes (e.g., "8oz grilled chicken breast")
- "medium": Good description but some assumptions needed (e.g., "chicken salad")
- "low": Vague description requiring many assumptions (e.g., "salad")

Be realistic about portions. If no portion size is mentioned, assume a standard restaurant serving.`
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
      console.error('❌ No response from OpenAI')
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 Raw OpenAI response:', content)

    // Parse the JSON response
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

    // Validate the response
    if (!nutritionEstimate.food_name || typeof nutritionEstimate.calories !== 'number') {
      console.error('❌ Incomplete nutrition data:', nutritionEstimate)
      return new Response(
        JSON.stringify({ success: false, error: 'Incomplete nutrition data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Successfully estimated:', nutritionEstimate.food_name, '-', nutritionEstimate.calories, 'cal')

    // Log the AI usage for future analytics
    try {
    //@ts-ignore
    await supabaseClient
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
    // Don't fail the request if logging fails
    console.warn('⚠️ Failed to log AI usage:', logError)
  }

    // Return the estimate
    return new Response(
      JSON.stringify({ 
        success: true,
        data: nutritionEstimate 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in estimateNutrition:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        //@ts-ignore
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})