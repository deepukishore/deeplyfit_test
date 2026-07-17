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

export const getDailyQuote = () => {
  const day = new Date().getDay();
  return QUOTES[day % QUOTES.length];
};

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
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export const formatDisplayDate = (dateStr) => {
  const today = new Date();
  const date = new Date(dateStr);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatDate(today) === dateStr) return 'Today';
  if (formatDate(yesterday) === dateStr) return 'Yesterday';

  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

export const addDays = (dateStr, days) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const getWorkoutSuggestions = (fitnessGoal, activityLevel) => {
  const suggestions = {
    lose: [
      { icon: '🏃', name: 'HIIT Cardio', detail: '30 min • High Intensity', calories: 350 },
      { icon: '🚴', name: 'Cycling', detail: '45 min • Moderate', calories: 280 },
      { icon: '🏊', name: 'Swimming', detail: '30 min • Full Body', calories: 300 },
    ],
    gain: [
      { icon: '🏋️', name: 'Weight Training', detail: '60 min • Progressive', calories: 250 },
      { icon: '💪', name: 'Push Day', detail: '45 min • Chest & Triceps', calories: 200 },
      { icon: '🦵', name: 'Leg Day', detail: '60 min • Compound Lifts', calories: 280 },
    ],
    maintain: [
      { icon: '🧘', name: 'Yoga Flow', detail: '45 min • Flexibility', calories: 150 },
      { icon: '🚶', name: 'Power Walk', detail: '30 min • Steady State', calories: 180 },
      { icon: '⚡', name: 'Circuit Training', detail: '40 min • Mixed', calories: 300 },
    ],
  };
  return suggestions[fitnessGoal] || suggestions.maintain;
};

export const getMealIcon = (mealType) => {
  const icons = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snacks: '🍎',
  };
  return icons[mealType] || '🍽️';
};

export const caloriesProgress = (consumed, target) => {
  if (!target) return 0;
  return Math.min((consumed / target) * 100, 100);
};

export const getInitials = (name, email) => {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email ? email[0].toUpperCase() : '?';
};

export const COMMUNITY_POSTS = [
  {
    id: 1,
    user: 'Alex R.',
    initials: 'AR',
    color: '#a855f7',
    time: '2h ago',
    content: '🔥 Just crushed a new PR on deadlift — 180kg! Three months of consistency paying off. The grind never lies.',
    likes: 24,
    comments: 7,
    badge: '🏆 PR',
  },
  {
    id: 2,
    user: 'Maya S.',
    initials: 'MS',
    color: '#f5a623',
    time: '4h ago',
    content: '✅ Week 8 of my cutting phase complete! Down 6kg total and feeling stronger than ever. Protein is life 🥩',
    likes: 38,
    comments: 12,
    badge: '📉 Progress',
  },
  {
    id: 3,
    user: 'Jordan K.',
    initials: 'JK',
    color: '#4facfe',
    time: '6h ago',
    content: '🏃 Completed my first 10k run this morning in 52 minutes! Started from barely running 1km six months ago. Never give up!',
    likes: 61,
    comments: 19,
    badge: '🏅 Achievement',
  },
  {
    id: 4,
    user: 'Sam T.',
    initials: 'ST',
    color: '#c084fc',
    time: '1d ago',
    content: '💧 30-day hydration challenge complete! 8 glasses every single day. My skin is glowing and energy levels are through the roof.',
    likes: 45,
    comments: 8,
    badge: '💧 Challenge',
  },
  {
    id: 5,
    user: 'Priya N.',
    initials: 'PN',
    color: '#ff6b6b',
    time: '1d ago',
    content: '🧘 Finally nailed the crow pose after 3 months of practice! Yoga has transformed not just my body but my mindset.',
    likes: 52,
    comments: 14,
    badge: '🌟 Milestone',
  },
];

export const ACTIVE_CHALLENGES = [
  { id: 'steps-daily', name: '10K Steps Daily', icon: '👟', participants: 234, daysLeft: 5 },
  { id: 'sugar-free-week', name: 'Sugar-Free Week', icon: '🚫', participants: 128, daysLeft: 3 },
  { id: 'core-30-day', name: '30-Day Core', icon: '💪', participants: 456, daysLeft: 18 },
];
