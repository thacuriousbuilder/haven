
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    // Supabase webhook sends the new row under payload.record
    const message = payload.record
    if (!message) {
      console.error('❌ No record in payload')
      return new Response(JSON.stringify({ error: 'No record' }), { status: 400 })
    }

    const { sender_id, recipient_id, message_text } = message
    console.log('📨 New message from:', sender_id, '→ to:', recipient_id)

    // @ts-ignore
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get recipient's push token and name
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('expo_push_token, first_name, push_notifications_enabled')
      .eq('id', recipient_id)
      .single()

    if (recipientError || !recipient) {
      console.error('❌ Could not find recipient:', recipientError?.message)
      return new Response(JSON.stringify({ error: 'Recipient not found' }), { status: 404 })
    }

    if (!recipient.expo_push_token) {
      console.log('⚠️ Recipient has no push token, skipping')
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    if (!recipient.push_notifications_enabled) {
      console.log('⚠️ Recipient has push notifications disabled, skipping')
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    // Get sender's name
    const { data: sender } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', sender_id)
      .single()

    const senderName = sender
      ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim()
      : 'Someone'

    // Send via Expo Push API
    const expoPushPayload = {
      to: recipient.expo_push_token,
      title: senderName,
      body: message_text?.length > 100
        ? message_text.substring(0, 97) + '...'
        : message_text,
      data: {
        type: 'message',
        sender_id,
      },
      sound: 'default',
    }

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expoPushPayload),
    })

    const expoResult = await expoResponse.json()
    console.log('✅ Expo push result:', JSON.stringify(expoResult))

    return new Response(JSON.stringify({ success: true, result: expoResult }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
})