
//@ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WeeklyLimitPayload {
  user_id: string
  calories_consumed: number
  weekly_budget: number
}

//@ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('⚠️ Weekly limit warning check started')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { user_id, calories_consumed, weekly_budget }: WeeklyLimitPayload = await req.json()

    if (!user_id || !calories_consumed || !weekly_budget) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const percentage = calories_consumed / weekly_budget
    if (percentage < 0.90) {
      console.log(`✅ User ${user_id} at ${Math.round(percentage * 100)}% — no warning needed`)
      return new Response(
        JSON.stringify({ success: true, warned: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if we already warned this user this week
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('expo_push_token, weekly_limit_warned')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Failed to fetch profile:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (profile.weekly_limit_warned) {
      console.log(`⏭️ User ${user_id} already warned this week`)
      return new Response(
        JSON.stringify({ success: true, warned: false, reason: 'already_warned' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.expo_push_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'No push token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send the notification
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title: "Heads up! ⚠️",
        body: `You've used ${Math.round(percentage * 100)}% of your weekly calorie budget.`,
        sound: 'default',
        channelId: 'default',
      }),
    })

    const result = await response.json()
    console.log('📤 Notification sent:', result)

    // Mark as warned
    await adminClient
      .from('profiles')
      .update({
        weekly_limit_warned: true,
        weekly_limit_warned_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    return new Response(
      JSON.stringify({ success: true, warned: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in sendWeeklyLimitWarning:', error)
    return new Response(
      //@ts-ignore
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})