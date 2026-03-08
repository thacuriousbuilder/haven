
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  TimeSlot,
  BudgetState,
  getActivePool,
  getBaselinePool,
  BUDGET_MESSAGES,
  ACTIVE_MORNING,
} from '../_shared/notificationCopy.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

interface UserRow {
  id: string
  baseline_complete: boolean
  push_notifications_enabled: boolean
  meal_reminders_enabled: boolean
  expo_push_token: string | null
  weekly_calorie_bank: number
  baseline_avg_daily_calories: number
}

interface NotificationHistoryRow {
  variety: string
  message: string
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function getTodayEST(): Date {
  const now = new Date()
  // UTC-5 for EST (no DST adjustment for MVP)
  const estOffset = -5 * 60
  const estNow = new Date(now.getTime() + estOffset * 60 * 1000)
  return estNow
}

function isMonday(): boolean {
  return getTodayEST().getUTCDay() === 1
}

function isWednesday(): boolean {
  return getTodayEST().getUTCDay() === 3
}

function pickMessage(
  pool: string[],
  lastMessage: string | null
): string {
  // Filter out the last sent message for recency check
  const filtered = pool.filter((m) => m !== lastMessage)
  const candidates = filtered.length > 0 ? filtered : pool
  const idx = Math.floor(Math.random() * candidates.length)
  return candidates[idx]
}

function getBudgetState(
  weeklyBudget: number,
  caloriesConsumed: number,
  dayOfWeek: number // 1=Mon, 3=Wed
): BudgetState {
  // Expected consumption by Wednesday = (3/7) of weekly budget
  const expectedByNow = (weeklyBudget / 7) * 3
  const tolerance = weeklyBudget * 0.05 // 5% tolerance band

  if (caloriesConsumed > expectedByNow + tolerance) return 'over'
  if (caloriesConsumed < expectedByNow - tolerance) return 'under'
  return 'on_track'
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { time_slot } = await req.json() as { time_slot: TimeSlot }

    if (!['morning', 'midday', 'evening'].includes(time_slot)) {
      return new Response(
        JSON.stringify({ error: 'Invalid time_slot' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service role client — needed to read all users
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── Fetch all eligible users ──
 
        const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select(`
        id,
        baseline_complete,
        push_notifications_enabled,
        meal_reminders_enabled,
        expo_push_token,
        weekly_calorie_bank,
        baseline_avg_daily_calories
        `)
        .eq('push_notifications_enabled', true)
        .eq('meal_reminders_enabled', true)
        .eq('user_type', 'client')
        .not('expo_push_token', 'is', null)

    if (usersError) throw usersError
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const wednesday = isWednesday()
    const monday = isMonday()
    const isBudgetSlot = wednesday && time_slot === 'midday'

    const notifications: { to: string; title: string; body: string }[] = []
    const historyRows: { user_id: string; time_slot: string; variety: string; message: string }[] = []

    for (const user of users as UserRow[]) {
      if (!user.expo_push_token) continue

      let variety = ''
      let message = ''

      // ── Fetch last notification for this user + slot ──
      const { data: lastHistory } = await supabase
        .from('notification_history')
        .select('variety, message')
        .eq('user_id', user.id)
        .eq('time_slot', isBudgetSlot ? 'budget' : time_slot)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single()

      const lastMsg = (lastHistory as NotificationHistoryRow | null)?.message ?? null
      const lastVariety = (lastHistory as NotificationHistoryRow | null)?.variety ?? null

      // ── BASELINE users ──
      if (!user.baseline_complete) {
        variety = 'baseline'
        const pool = getBaselinePool(time_slot)
        message = pickMessage(pool, lastMsg)

      // ── WEDNESDAY MIDDAY — budget progress ──
      } else if (isBudgetSlot) {
        // Fetch calories consumed this week so far
        const weekStart = getTodayEST()
        weekStart.setUTCDate(weekStart.getUTCDate() - 2) // Wed - 2 = Mon
        const weekStartStr = weekStart.toISOString().split('T')[0]

        const { data: summaries } = await supabase
          .from('daily_summaries')
          .select('calories_consumed')
          .eq('user_id', user.id)
          .gte('summary_date', weekStartStr)

        const totalConsumed = (summaries ?? []).reduce(
          (sum: number, s: { calories_consumed: number }) => sum + s.calories_consumed,
          0
        )

        const budgetState = getBudgetState(
          user.weekly_calorie_bank,
          totalConsumed,
          3
        )

        variety = `budget_${budgetState}`
        const pool = BUDGET_MESSAGES[budgetState]
        message = pickMessage(pool, lastMsg)

      // ── MONDAY MORNING — always weekly mindset ──
      } else if (monday && time_slot === 'morning') {
        const weeklyMindset = ACTIVE_MORNING.find((v) => v.variety === 'weekly_mindset')!
        variety = 'weekly_mindset'
        message = pickMessage(weeklyMindset.messages, lastMsg)

      // ── ACTIVE users — round robin variety ──
      } else {
        const pool = getActivePool(time_slot)

        // Pick next variety (round-robin: avoid last used variety)
        const filtered = pool.filter((v) => v.variety !== lastVariety)
        const candidates = filtered.length > 0 ? filtered : pool
        const picked = candidates[Math.floor(Math.random() * candidates.length)]

        variety = picked.variety
        message = pickMessage(picked.messages, lastMsg)
      }

      notifications.push({
        to: user.expo_push_token,
        title: 'HAVEN',
        body: message,
      })

      historyRows.push({
        user_id: user.id,
        time_slot: isBudgetSlot ? 'budget' : time_slot,
        variety,
        message,
      })
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
    console.error('sendDailyNotification error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})