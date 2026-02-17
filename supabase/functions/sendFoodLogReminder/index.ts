

//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserWithToken {
    id: string
    expo_push_token: string
  }

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🍽️ Food log reminder job started')

    const adminClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD in UTC

    // Get all users with a push token who have NOT logged food today
    const { data: users, error } = await adminClient
      .from('profiles')
      .select('id, expo_push_token')
      .not('expo_push_token', 'is', null)

    if (error) {
      console.error('❌ Failed to fetch users:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find users who have NOT logged today
    const { data: loggedUserIds, error: logError } = await adminClient
      .from('food_logs')
      .select('user_id')
      .eq('log_date', today)

    if (logError) {
      console.error('❌ Failed to fetch food logs:', logError)
      return new Response(
        JSON.stringify({ success: false, error: logError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const loggedIds = new Set(loggedUserIds.map((l: { user_id: string }) => l.user_id))

    const usersToNotify = (users as UserWithToken[]).filter(
        (u) => !loggedIds.has(u.id)
      )

    console.log(`📋 ${usersToNotify.length} users haven't logged today`)

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build notifications
    const notifications = usersToNotify.map((u) => ({
        to: u.expo_push_token,
        title: "Don't forget to log! 🍽️",
        body: "You haven't tracked any food yet today. Keep your streak going!",
        sound: 'default',
        channelId: 'default',
      }))

    // Send in batches of 100
    const batchSize = 100
    const results: any[] = []

    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(batch),
      })
      const result = await response.json()
      results.push(result)
      console.log(`✅ Batch ${i / batchSize + 1} sent`)
    }

    return new Response(
      JSON.stringify({ success: true, notified: usersToNotify.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in sendFoodLogReminder:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})