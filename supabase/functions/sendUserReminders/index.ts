

// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
import { getUserLocalTime, getWindowMinutes } from '../_shared/timezone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_DAILY_NOTIFICATIONS = 4

function parseTimeString(timeStr: string): string | null {
  if (!timeStr) return null
  try {
    const parts = timeStr.trim().split(' ')
    if (parts.length !== 2) return null
    const [hourMinute, period] = parts
    const [hours, minutes] = hourMinute.split(':').map(Number)
    let h = hours
    if (period === 'PM' && hours !== 12) h += 12
    if (period === 'AM' && hours === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  } catch {
    return null
  }
}

const MEAL_MESSAGES: Record<string, { withLogs: string; noLogs: string }> = {
  breakfast: {
    withLogs: "Good morning! Time to log your breakfast 🌅",
    noLogs: "Good morning! Don't forget to log breakfast 🌅",
  },
  lunch: {
    withLogs: "Lunchtime! Log your meal while it's fresh 🍽️",
    noLogs: "Lunchtime! Don't forget to log your meal 🍽️",
  },
  dinner: {
    withLogs: "Dinner time! Log your last meal of the day 🌙",
    noLogs: "Dinner time! Don't forget to log your meal 🌙",
  },
}

const RECAP_MESSAGES = {
  withLogs: "How did today go? Log any missed meals and reflect on your day →",
  noLogs: "Don't forget to log today before it slips away →",
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

    const utcNow = new Date()
    console.log('🌍 UTC time:', utcNow.toISOString())

    // Fetch all eligible users with reminders enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        expo_push_token,
        push_notifications_enabled,
        meal_times_enabled,
        breakfast_time,
        lunch_time,
        dinner_time,
        evening_recap_enabled,
        evening_recap_time,
        timezone
      `)
      .eq('push_notifications_enabled', true)
      .eq('user_type', 'client')
      .not('expo_push_token', 'is', null)
      .or('meal_times_enabled.eq.true,evening_recap_enabled.eq.true')

    if (usersError) throw usersError
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: 'no eligible users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userIds = users.map(u => u.id)

    // Batch fetch today's food logs — use UTC date as fallback
    // We'll filter per-user using their local date below
    const utcToday = utcNow.toISOString().split('T')[0]

    const { data: todayLogs } = await supabase
      .from('food_logs')
      .select('user_id, log_date')
      .in('user_id', userIds)
      .gte('log_date', utcToday)

    // Batch fetch recent notification history (last 24h covers any timezone)
    const oneDayAgo = new Date(utcNow.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const { data: sentRecently } = await supabase
      .from('notification_history')
      .select('user_id, time_slot')
      .in('user_id', userIds)
      .gte('sent_at', oneDayAgo)

    // Build lookup: user_id → { slots, count }
    const sentByUser = new Map<string, { slots: Set<string>; count: number }>()
    for (const row of sentRecently ?? []) {
      if (!sentByUser.has(row.user_id)) {
        sentByUser.set(row.user_id, { slots: new Set(), count: 0 })
      }
      const entry = sentByUser.get(row.user_id)!
      entry.slots.add(row.time_slot)
      entry.count++
    }

    const notifications: {
      to: string; title: string; body: string; data: Record<string, string>
    }[] = []

    const historyRows: {
      user_id: string; time_slot: string; variety: string; message: string
    }[] = []

    for (const user of users) {
      if (!user.expo_push_token) continue

      // Get user's local time using their stored timezone
      const userTz = user.timezone || 'America/New_York'
      const userLocal = getUserLocalTime(utcNow, userTz)
      const userWindow = getWindowMinutes(userLocal.hour, userLocal.minute)
      const userToday = userLocal.dateString

      console.log(`👤 ${user.id} | tz: ${userTz} | local: ${userLocal.hour}:${userLocal.minute} | date: ${userToday}`)

      const userSent = sentByUser.get(user.id) ?? { slots: new Set<string>(), count: 0 }
      const hasLogs = (todayLogs ?? []).some(
        (l: { user_id: string; log_date: string }) =>
          l.user_id === user.id && l.log_date === userToday
      )

      let queuedThisRun = 0

      // GATE: daily max
      if (userSent.count >= MAX_DAILY_NOTIFICATIONS) {
        console.log(`⛔ ${user.id} — daily max reached (${userSent.count})`)
        continue
      }

      // ── MEAL REMINDERS ──
      if (user.meal_times_enabled) {
        const mealSlots = [
          { key: 'breakfast', time: user.breakfast_time, slotId: 'meal_breakfast' },
          { key: 'lunch',     time: user.lunch_time,     slotId: 'meal_lunch' },
          { key: 'dinner',    time: user.dinner_time,    slotId: 'meal_dinner' },
        ]

        for (const slot of mealSlots) {
          if (userSent.count + queuedThisRun >= MAX_DAILY_NOTIFICATIONS) break
          if (userSent.slots.has(slot.slotId)) continue

          const parsed = parseTimeString(slot.time)
          if (!parsed || !userWindow.includes(parsed)) continue

          const msgs = MEAL_MESSAGES[slot.key]
          const message = hasLogs ? msgs.withLogs : msgs.noLogs

          notifications.push({
            to: user.expo_push_token,
            title: 'HAVEN',
            body: message,
            data: { type: 'meal_reminder', meal: slot.key },
          })

          historyRows.push({
            user_id: user.id,
            time_slot: slot.slotId,
            variety: `meal_reminder_${slot.key}`,
            message,
          })

          queuedThisRun++
          console.log(`📤 ${slot.key} → ${user.id} at ${parsed} (${userTz})`)
        }
      }

      // ── EVENING RECAP ──
      if (
        user.evening_recap_enabled &&
        !userSent.slots.has('recap') &&
        userSent.count + queuedThisRun < MAX_DAILY_NOTIFICATIONS
      ) {
        const parsed = parseTimeString(user.evening_recap_time)
        if (parsed && userWindow.includes(parsed)) {
          const message = hasLogs ? RECAP_MESSAGES.withLogs : RECAP_MESSAGES.noLogs

          notifications.push({
            to: user.expo_push_token,
            title: 'HAVEN',
            body: message,
            data: { type: 'evening_recap' },
          })

          historyRows.push({
            user_id: user.id,
            time_slot: 'recap',
            variety: hasLogs ? 'recap_has_logs' : 'recap_no_logs',
            message,
          })

          queuedThisRun++
          console.log(`📤 recap → ${user.id} at ${parsed} (${userTz})`)
        }
      }
    }

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: 'no reminders in this window' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send via Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifications),
    })

    if (!expoResponse.ok) throw new Error(`Expo push failed: ${expoResponse.status}`)
    console.log('Expo response:', JSON.stringify(await expoResponse.json()))

    // Upsert with ignoreDuplicates for race condition safety
    if (historyRows.length > 0) {
      const { error: historyError } = await supabase
        .from('notification_history')
        .upsert(historyRows, { ignoreDuplicates: true })
      if (historyError) console.error('History insert error:', historyError)
    }

    return new Response(
      JSON.stringify({ success: true, sent: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('sendUserReminders error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})