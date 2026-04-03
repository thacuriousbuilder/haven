

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
import { getESTTime, isMonday, isWednesday } from '../_shared/timezone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_DAILY_NOTIFICATIONS = 4

const SLOT_REMINDER_MAP: Record<TimeSlot, string[]> = {
  morning: ['meal_breakfast'],
  midday:  ['meal_lunch'],
  evening: ['meal_dinner', 'recap'],
}

interface UserRow {
  id: string
  baseline_complete: boolean
  push_notifications_enabled: boolean
  meal_times_enabled: boolean
  evening_recap_enabled: boolean
  expo_push_token: string | null
  weekly_budget: number
  baseline_avg_daily_calories: number
}

interface NotificationHistoryRow {
  variety: string
  message: string
}

function pickMessage(pool: string[], lastMessage: string | null): string {
  const filtered = pool.filter((m) => m !== lastMessage)
  const candidates = filtered.length > 0 ? filtered : pool
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function getBudgetState(
  weeklyBudget: number,
  caloriesConsumed: number,
): BudgetState {
  const expectedByNow = (weeklyBudget / 7) * 3
  const tolerance = weeklyBudget * 0.05
  if (caloriesConsumed > expectedByNow + tolerance) return 'over'
  if (caloriesConsumed < expectedByNow - tolerance) return 'under'
  return 'on_track'
}

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

    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Use shared timezone utility
    const { dateString: today } = getESTTime()
    const todayStart = `${today}T00:00:00.000Z`
    const monday = isMonday(today)
    const wednesday = isWednesday(today)
    const isBudgetSlot = wednesday && time_slot === 'midday'

    console.log(`📅 EST date: ${today} | slot: ${time_slot} | monday: ${monday} | wednesday: ${wednesday}`)

    // Fetch users WITHOUT reminders enabled
    // Those users handled by sendUserReminders
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        baseline_complete,
        push_notifications_enabled,
        meal_times_enabled,
        evening_recap_enabled,
        expo_push_token,
        weekly_budget,
        baseline_avg_daily_calories
      `)
      .eq('push_notifications_enabled', true)
      .eq('user_type', 'client')
      .not('expo_push_token', 'is', null)
      .or('meal_times_enabled.eq.false,meal_times_enabled.is.null')
      .or('evening_recap_enabled.eq.false,evening_recap_enabled.is.null')

    if (usersError) throw usersError
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userIds = users.map(u => u.id)

    // Batch fetch today's notification history
    const { data: sentToday } = await supabase
      .from('notification_history')
      .select('user_id, time_slot, variety, message')
      .in('user_id', userIds)
      .gte('sent_at', todayStart)

    // Build per-user history lookup
    const sentByUser = new Map<string, {
      slots: Set<string>
      count: number
      lastMsg: string | null
      lastVariety: string | null
    }>()

    for (const row of sentToday ?? []) {
      if (!sentByUser.has(row.user_id)) {
        sentByUser.set(row.user_id, {
          slots: new Set(),
          count: 0,
          lastMsg: null,
          lastVariety: null,
        })
      }
      const entry = sentByUser.get(row.user_id)!
      entry.slots.add(row.time_slot)
      entry.count++
      entry.lastMsg = row.message
      entry.lastVariety = row.variety
    }

    const notifications: { to: string; title: string; body: string }[] = []
    const historyRows: {
      user_id: string; time_slot: string; variety: string; message: string
    }[] = []

    for (const user of users as UserRow[]) {
      if (!user.expo_push_token) continue

      const userHistory = sentByUser.get(user.id) ?? {
        slots: new Set<string>(),
        count: 0,
        lastMsg: null,
        lastVariety: null,
      }

      // GATE 1: Daily max
      if (userHistory.count >= MAX_DAILY_NOTIFICATIONS) {
        console.log(`⛔ ${user.id} — daily max reached`)
        continue
      }

      // GATE 2: Skip if reminder already sent for this slot
      const conflictingSlots = SLOT_REMINDER_MAP[time_slot]
      if (conflictingSlots.some(s => userHistory.slots.has(s))) {
        console.log(`⏭️ ${user.id} — reminder already covers ${time_slot}`)
        continue
      }

      // GATE 3: Skip if motivational already sent for this slot
      if (userHistory.slots.has(time_slot)) {
        console.log(`⏭️ ${user.id} — motivational already sent for ${time_slot}`)
        continue
      }

      let variety = ''
      let message = ''

      if (!user.baseline_complete) {
        variety = 'baseline'
        message = pickMessage(getBaselinePool(time_slot), userHistory.lastMsg)

      } else if (isBudgetSlot) {
        // Get Monday date string (today - 2 days)
        const weekStartDate = new Date(today + 'T00:00:00Z')
        weekStartDate.setUTCDate(weekStartDate.getUTCDate() - 2)
        const weekStartStr = weekStartDate.toISOString().split('T')[0]

        const { data: summaries } = await supabase
          .from('daily_summaries')
          .select('calories_consumed')
          .eq('user_id', user.id)
          .gte('summary_date', weekStartStr)

        const totalConsumed = (summaries ?? []).reduce(
          (sum: number, s: { calories_consumed: number }) => sum + s.calories_consumed, 0
        )

        const budgetState = getBudgetState(user.weekly_budget ?? 14000, totalConsumed)
        variety = `budget_${budgetState}`
        message = pickMessage(BUDGET_MESSAGES[budgetState], userHistory.lastMsg)

      } else if (monday && time_slot === 'morning') {
        const weeklyMindset = ACTIVE_MORNING.find(v => v.variety === 'weekly_mindset')!
        variety = 'weekly_mindset'
        message = pickMessage(weeklyMindset.messages, userHistory.lastMsg)

      } else {
        const pool = getActivePool(time_slot)
        const filtered = pool.filter(v => v.variety !== userHistory.lastVariety)
        const candidates = filtered.length > 0 ? filtered : pool
        const picked = candidates[Math.floor(Math.random() * candidates.length)]
        variety = picked.variety
        message = pickMessage(picked.messages, userHistory.lastMsg)
      }

      notifications.push({ to: user.expo_push_token, title: 'HAVEN', body: message })
      historyRows.push({ user_id: user.id, time_slot, variety, message })
      console.log(`📤 ${time_slot} motivational → ${user.id}`)
    }

    if (notifications.length > 0) {
      const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications),
      })
      if (!expoResponse.ok) throw new Error(`Expo push failed: ${expoResponse.status}`)
      console.log('✅ Sent:', notifications.length)
    }

    if (historyRows.length > 0) {
      await supabase
        .from('notification_history')
        .upsert(historyRows, { ignoreDuplicates: true })
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