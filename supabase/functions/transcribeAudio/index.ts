

//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse body
    const { audio_base64, mime_type } = await req.json()

    if (!audio_base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing audio_base64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Convert base64 to blob for Whisper
    const audioBytes = Uint8Array.from(atob(audio_base64), c => c.charCodeAt(0))
    const audioBlob = new Blob([audioBytes], { type: mime_type || 'audio/m4a' })

    // 4. Build multipart form for Whisper API
    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.m4a')
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')
    formData.append('prompt', 
      'Food description including meal names, portion sizes, ingredients, ' +
      'restaurant names, and cooking methods.'
    )

    // 5. Call Whisper
    //@ts-ignore
    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('❌ Whisper error:', errorText)
      return new Response(
        JSON.stringify({ success: false, error: 'Transcription failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const whisperData = await whisperResponse.json()
    const transcript = whisperData.text?.trim()

    if (!transcript) {
      return new Response(
        JSON.stringify({ success: false, error: 'No speech detected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Transcript:', transcript)

    return new Response(
      JSON.stringify({ success: true, transcript }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ transcribeAudio error:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})