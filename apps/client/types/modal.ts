

export type AchievementModalKey =
  | 'first_meal'
  | 'budget_personalized'
  | 'knowledge_unlocked'
  | 'treat_day_planned';

export type ModalKey = AchievementModalKey | 'over_budget';

// Stored in profiles.modals_seen (DB)
export type ModalsSeen = Partial<Record<AchievementModalKey, string>>; // value = ISO timestamp

// Over budget modal payload
export interface OverBudgetPayload {
  target: number;
  consumed: number;
  over: number;
}

// Union type for what gets passed to showModal()
export type ModalPayload =
  | { key: AchievementModalKey }
  | { key: 'over_budget'; data: OverBudgetPayload };