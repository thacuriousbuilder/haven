// TODO: Use proper timezone library when onboarding stores user timezone
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HAS_LOGS_COPY = "How did today go? Log any missed meals and reflect on your day →"
const NO_LOGS_COPY  = "Don't forget to log today before it slips away →"

// Replace getCurrentUTCTime with this:
function getCurrentESTTime(): { hour: number; minute: number } {
    const now = new Date()
    const estOffset = -4 * 60 // UTC-5, no DST adjustment for MVP
    const estNow = new Date(now.getTime() + estOffset * 60 * 1000)
    return { hour: estNow.getUTCHours(), minute: estNow.getUTCMinutes() }
  }
  
  // Replace getTodayUTCDateString with this:
  function getTodayESTDateString(): string {
    const now = new Date()
    const estOffset = -4 * 60
    const estNow = new Date(now.getTime() + estOffset * 60 * 1000)
    return estNow.toISOString().split('T')[0]
  }

// Returns all HH:MM values within the current 15-min window
// e.g. if now is 20:07 UTC, returns ['20:00', '20:01', ..., '20:14']
function getWindowMinutes(hour: number, minute: number): string[] {
  const start = Math.floor(minute / 15) * 15
  const times: string[] = []
  for (let m = start; m < start + 15; m++) {
    const hh = String(hour).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    times.push(`${hh}:${mm}`)
  }
  return times
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { hour, minute } = getCurrentESTTime()
    const windowMinutes = getWindowMinutes(hour, minute)
    const today = getTodayESTDateString()
    console.log('EST time:', hour, minute, 'window:', getWindowMinutes(hour, minute))
console.log('today:', today)

    // ── Fetch eligible users whose recap time falls in this window ──
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        expo_push_token,
        push_notifications_enabled,
        meal_reminders_enabled,
        recap_notification_time
      `)
      .eq('push_notifications_enabled', true)
      .eq('meal_reminders_enabled', true)
      .eq('user_type', 'client')
      .not('expo_push_token', 'is', null)

    if (usersError) throw usersError
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: 'no eligible users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Filter to users whose recap_notification_time is in this window ──
    const eligibleUsers = users.filter(u => {
      if (!u.recap_notification_time) return false
      // recap_notification_time is stored as HH:MM:SS — trim to HH:MM
      const userTime = u.recap_notification_time.substring(0, 5)
      return windowMinutes.includes(userTime)
    })

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: 'no users in this window' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const notifications: {
      to: string
      title: string
      body: string
      data: Record<string, string>
    }[] = []

    const historyRows: {
      user_id: string
      time_slot: string
      variety: string
      message: string
    }[] = []

    for (const user of eligibleUsers) {
      // ── Skip if already sent recap today ──
      const { data: alreadySent } = await supabase
        .from('notification_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('time_slot', 'recap')
        .gte('sent_at', today)
        .limit(1)
        .single()

      if (alreadySent) {
        console.log(`⏭️ Skipping ${user.id} — recap already sent today`)
        continue
      }

      // ── Check if user has any food logs today ──
      const { data: logs } = await supabase
        .from('food_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .limit(1)

      const hasLogs = logs && logs.length > 0
      const message = hasLogs ? HAS_LOGS_COPY : NO_LOGS_COPY
      const variety = hasLogs ? 'recap_has_logs' : 'recap_no_logs'

      notifications.push({
        to: user.expo_push_token,
        title: 'HAVEN',
        body: message,
        data: { type: 'evening_recap' },
      })

      historyRows.push({
        user_id: user.id,
        time_slot: 'recap',
        variety,
        message,
      })
    }

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: 'all skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Send via Expo Push API ──
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifications),
    })

    const expoBody = await expoResponse.json()
    console.log('Expo response:', JSON.stringify(expoBody))

    if (!expoResponse.ok) {
      throw new Error(`Expo push failed: ${expoResponse.status} — ${JSON.stringify(expoBody)}`)
    }

    // ── Log to notification_history ──
    if (historyRows.length > 0) {
      const { error: historyError } = await supabase
        .from('notification_history')
        .insert(historyRows)

      if (historyError) {
        console.error('History insert error:', historyError)
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('sendEveningRecap error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})