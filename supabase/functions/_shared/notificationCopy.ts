
export type TimeSlot = 'morning' | 'midday' | 'evening';
export type UserState = 'baseline' | 'active';
export type BudgetState = 'on_track' | 'under' | 'over';

export interface NotificationVariety {
  variety: string;
  messages: string[];
}

// ─────────────────────────────────────────
// ACTIVE USERS
// ─────────────────────────────────────────

export const ACTIVE_MORNING: NotificationVariety[] = [
  {
    variety: 'fresh_start',
    messages: [
      'Morning. Let\'s see what today adds up to.',
      'Morning. Your weekly budget is yours to use.',
      'Log today. HAVEN does the math.',
    ],
  },
  {
    variety: 'habit_builder',
    messages: [
      'You don\'t have to nail it. Just track it.',
      'Just show up today.',
      'Every log teaches HAVEN more about you.',
    ],
  },
  {
    variety: 'friendly_checkin',
    messages: [
      'Quick check-in. What\'s on the menu today?',
      'Morning. Anything good on the menu?',
      'Log breakfast. The rest of the day gets easier.',
    ],
  },
  {
    variety: 'weekly_mindset',
    messages: [
      'Your week is still unfolding.',
      'Balance today, freedom later.',
      'One good day moves the week forward.',
    ],
  },
];

export const ACTIVE_MIDDAY: NotificationVariety[] = [
  {
    variety: 'curiosity',
    messages: [
      'What did lunch look like today?',
      'What\'s keeping you fueled today?',
      'What\'s on your plate today?',
    ],
  },
  {
    variety: 'quick_action',
    messages: [
      'Log lunch while it\'s fresh.',
      'Log it now, forget it later.',
      'One meal logged. Day\'s halfway there.',
    ],
  },
  {
    variety: 'habit_reminder',
    messages: [
      'Midday logs make evenings easier.',
      'Every meal logged is a win.',
      'Small logs. Big picture.',
    ],
  },
  {
    variety: 'light_humor',
    messages: [
      'Future you will appreciate this log.',
      'Yes, that snack counts. Log it anyway.',
      'Lunch happened… might as well log it.',
    ],
  },
];

export const ACTIVE_EVENING: NotificationVariety[] = [
  {
    variety: 'day_wrapup',
    messages: [
      'Almost there. Log dinner and you\'re done.',
      'How did today go?',
      'Close the day strong. One last log.',
    ],
  },
  {
    variety: 'streak',
    messages: [
      'You\'re on a roll. Keep it going.',
      'Every log adds to something real.',
      'One log away from another great day.',
    ],
  },
  {
    variety: 'progress_mindset',
    messages: [
      'Not every day is perfect. Every day counts.',
      'Good days and hard days both move you forward.',
      'Showing up today is enough.',
    ],
  },
  {
    variety: 'weekly_balance',
    messages: [
      'Your week is still on track.',
      'Balance today, adjust tomorrow.',
      'One day doesn\'t define the week.',
    ],
  },
];

// ─────────────────────────────────────────
// BUDGET PROGRESS (Wednesday midday only)
// ─────────────────────────────────────────

export const BUDGET_MESSAGES: Record<BudgetState, string[]> = {
  on_track: [
    'Halfway through the week, right on track. Keep going.',
    'Midweek check — you\'re exactly where you need to be.',
    'Right on pace. The week is yours.',
  ],
  under: [
    'You\'re ahead of the week. Treat yourself if you want.',
    'Good news midweek — your week has breathing room.',
    'Ahead of the week. HAVEN\'s got you covered.',
  ],
  over: [
    'This week got away a little. You\'ve still got days left.',
    'The week isn\'t done. HAVEN will help you course correct.',
    'The week bends. It doesn\'t break.',
  ],
};

// ─────────────────────────────────────────
// BASELINE WEEK USERS
// ─────────────────────────────────────────

export const BASELINE_MORNING: string[] = [
  'Morning. HAVEN is getting to know you this week.',
  'No targets this week. Just eat and log.',
  'Start simple. Log what you eat today.',
];

export const BASELINE_MIDDAY: string[] = [
  'Every meal helps HAVEN understand you better.',
  'No good or bad meals this week. Just log it.',
  'Lunch logged. HAVEN gets smarter.',
];

export const BASELINE_EVENING: string[] = [
  'Every day this week teaches HAVEN something new.',
  'However today went, it all counts.',
  'Last log of the day. You\'re building something real.',
];

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

export function getActivePool(slot: TimeSlot): NotificationVariety[] {
  switch (slot) {
    case 'morning': return ACTIVE_MORNING;
    case 'midday':  return ACTIVE_MIDDAY;
    case 'evening': return ACTIVE_EVENING;
  }
}

export function getBaselinePool(slot: TimeSlot): string[] {
  switch (slot) {
    case 'morning': return BASELINE_MORNING;
    case 'midday':  return BASELINE_MIDDAY;
    case 'evening': return BASELINE_EVENING;
  }
}