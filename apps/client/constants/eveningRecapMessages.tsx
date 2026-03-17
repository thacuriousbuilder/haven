

export const EVENING_RECAP_MESSAGES = [
    "You're building a great habit. See you tomorrow.",
    "Every check-in counts. Keep showing up.",
    "Progress isn't perfect — it's consistent. Well done.",
    "Small steps every day add up to big changes.",
    "You showed up for yourself today. That matters.",
    "Awareness is the first step. You're doing the work.",
    "One day at a time. You've got this.",
    "Logging today means a smarter plan tomorrow.",
    "Consistency beats perfection every time.",
    "Your future self will thank you for this habit.",
    "Another day of data helping HAVEN learn what works for you.",
    "Rest well — tomorrow is a fresh start.",
  ];
  
  export function getRandomRecapMessage(lastMessage?: string | null): string {
    const filtered = lastMessage
      ? EVENING_RECAP_MESSAGES.filter(m => m !== lastMessage)
      : EVENING_RECAP_MESSAGES;
    const pool = filtered.length > 0 ? filtered : EVENING_RECAP_MESSAGES;
    return pool[Math.floor(Math.random() * pool.length)];
  }