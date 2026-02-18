
//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  validateString,
  validateUUID,
  buildValidationResponse,
} from '../_shared/validate.ts'

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
    console.log('🔔 Send push notification request received')

    const { user_id, title, body } = await req.json()

    // Validate inputs
    const validationResponse = buildValidationResponse([
      validateUUID(user_id, 'user_id'),
      validateString(title, 'title', { minLength: 1, maxLength: 100 }),
      validateString(body, 'body', { minLength: 1, maxLength: 500 }),
    ], corsHeaders)

    if (validationResponse) return validationResponse

    const adminClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: tokens, error } = await adminClient
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id)

    if (error || !tokens || tokens.length === 0) {
      console.error('❌ Tokens not found for user:', user_id)
      return new Response(
        JSON.stringify({ error: 'Push tokens not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📤 Sending notification to ${tokens.length} device(s)`)

    const notifications = tokens.map((t: { token: string }) => ({
      to: t.token,
      title,
      body,
      sound: 'default',
      channelId: 'default',
    }))

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(notifications),
    })

    const result = await expoResponse.json()
    console.log('✅ Notification sent')

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in sendPushNotification:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})