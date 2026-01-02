

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Function called!')

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
    const { image_base64 } = await req.json()
    
    if (!image_base64) {
      console.error('❌ No image provided')
      return new Response(
        JSON.stringify({ success: false, error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📸 Image received, length:', image_base64.length)

    // Call OpenAI Vision API
    //@ts-ignore
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not configured')
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
            content: `You are a nutrition expert analyzing food images. Return ONLY a JSON object with this exact structure:
{
  "food_name": "descriptive name of the food",
  "calories": estimated total calories (number),
  "protein_grams": estimated protein in grams (number),
  "carbs_grams": estimated carbs in grams (number),
  "fat_grams": estimated fat in grams (number),
  "confidence": "high" | "medium" | "low",
  "notes": "any relevant details about portion size or assumptions"
}

Be realistic about portions. If you can't identify the food clearly, set confidence to "low" and make your best estimate.`
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
      console.error('❌ No response from OpenAI')
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📝 Raw OpenAI response:', content)

    // Parse the JSON response
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

    // Validate the response
    if (!foodAnalysis.food_name || typeof foodAnalysis.calories !== 'number') {
      console.error('❌ Incomplete nutrition data:', foodAnalysis)
      return new Response(
        JSON.stringify({ success: false, error: 'Incomplete nutrition data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Successfully analyzed:', foodAnalysis.food_name, '-', foodAnalysis.calories, 'cal')

    // Return the analysis
    return new Response(
      JSON.stringify({ 
        success: true,
        data: foodAnalysis 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in analyzeFoodImage:', error)
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