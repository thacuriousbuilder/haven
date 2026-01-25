

export type ClientStatus = 'in_baseline' | 'on_track' | 'need_followup';

export interface CoachDashboardClient {
  id: string;
  full_name: string;
  avatar_url?: string;
  last_active: string;
  status: ClientStatus;
  
  // Baseline specific
  baseline_start_date?: string;
  baseline_complete?: boolean;
  baseline_days_completed?: number;
  baseline_days_remaining?: number;
  baseline_avg_daily_calories?: number;
  
  // Active user metrics
  current_streak?: number;
  meals_logged_today?: number;
  
  // Follow-up specific
  days_inactive?: number;
}

export interface CoachDashboardStats {
  total_clients: number;
  on_track_count: number;
  need_followup_count: number;
  in_baseline_count: number;
  unread_messages_count: number;
}