
import { supabase } from '@/lib/supabase'

interface WeeklyLimitCheckParams {
  userId: string
  caloriesConsumed: number
  weeklyBudget: number
}

export async function checkWeeklyLimit({
  userId,
  caloriesConsumed,
  weeklyBudget,
}: WeeklyLimitCheckParams): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const response = await supabase.functions.invoke('sendWeeklyLimitWarning', {
      body: {
        user_id: userId,
        calories_consumed: caloriesConsumed,
        weekly_budget: weeklyBudget,
      },
    })

    if (response.error) {
      console.error('❌ Weekly limit check failed:', response.error)
      return
    }

    console.log('✅ Weekly limit check complete:', response.data)
  } catch (error) {
    console.error('❌ Error checking weekly limit:', error)
  }
}