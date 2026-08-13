export const QUOTES = [
  "The body achieves what the mind believes.",
  "Small steps every day lead to big changes.",
  "Discipline is choosing between what you want now and what you want most.",
  "Your only competition is who you were yesterday.",
  "Sweat is just fat crying.",
  "Push yourself, because no one else is going to do it for you.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Results happen over time, not overnight.",
  "Make yourself proud.",
  "Your future self is watching you right now.",
  "Fall in love with taking care of yourself.",
  "Progress, not perfection.",
];

export const getDailyQuote = () => QUOTES[new Date().getDay() % QUOTES.length];

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

export const formatDisplayDate = (dateStr) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (formatDate(today) === dateStr) return 'Today';
  if (formatDate(yesterday) === dateStr) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

export const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const getWorkoutSuggestions = (fitnessGoal) => {
  const suggestions = {
    lose: [
      { icon: '\u{1F3C3}', name: 'HIIT Cardio', detail: '30 min \u2022 High intensity', calories: 350 },
      { icon: '\u{1F6B4}', name: 'Cycling', detail: '45 min \u2022 Moderate', calories: 280 },
      { icon: '\u{1F3CA}', name: 'Swimming', detail: '30 min \u2022 Full body', calories: 300 },
    ],
    gain: [
      { icon: '\u{1F3CB}\uFE0F', name: 'Weight Training', detail: '60 min \u2022 Progressive', calories: 250 },
      { icon: '\u{1F4AA}', name: 'Push Day', detail: '45 min \u2022 Chest & triceps', calories: 200 },
      { icon: '\u{1F9B5}', name: 'Leg Day', detail: '60 min \u2022 Compound lifts', calories: 280 },
    ],
    maintain: [
      { icon: '\u{1F9D8}', name: 'Yoga Flow', detail: '45 min \u2022 Flexibility', calories: 150 },
      { icon: '\u{1F6B6}', name: 'Power Walk', detail: '30 min \u2022 Steady state', calories: 180 },
      { icon: '\u26A1', name: 'Circuit Training', detail: '40 min \u2022 Mixed', calories: 300 },
    ],
  };
  return suggestions[fitnessGoal] || suggestions.maintain;
};

export const getMealIcon = (mealType) => {
  const icons = {
    breakfast: '\u{1F305}',
    lunch: '\u2600\uFE0F',
    dinner: '\u{1F319}',
    snacks: '\u{1F34E}',
  };
  return icons[mealType] || '\u{1F37D}\uFE0F';
};

export const getInitials = (name, email) => {
  if (name) return name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);
  return email ? email[0].toUpperCase() : '?';
};

export const ACTIVE_CHALLENGES = [
  { id: 'steps-daily', name: '10K Steps Daily', icon: '\u{1F45F}', participants: 234, daysLeft: 5 },
  { id: 'sugar-free-week', name: 'Sugar-Free Week', icon: '\u{1F6AB}', participants: 128, daysLeft: 3 },
  { id: 'core-30-day', name: '30-Day Core', icon: '\u{1F4AA}', participants: 456, daysLeft: 18 },
];
