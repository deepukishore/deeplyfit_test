const DEFAULT_WEIGHT_KG = 70;

const ACTIVITY_PROFILES = [
  { name: 'HIIT / circuit training', met: 8, keywords: ['hiit', 'high intensity interval', 'circuit', 'crossfit'] },
  { name: 'Running', met: 8.3, keywords: ['running', 'run', 'jogging', 'jog', 'treadmill'] },
  { name: 'Cycling', met: 7.5, keywords: ['cycling', 'cycle', 'biking', 'bike', 'spinning'] },
  { name: 'Swimming', met: 6, keywords: ['swimming', 'swim', 'aqua'] },
  { name: 'Rowing', met: 7, keywords: ['rowing', 'rower'] },
  { name: 'Strength training', met: 5, keywords: ['weight training', 'weight lifting', 'weightlifting', 'strength', 'resistance', 'gym', 'push day', 'pull day', 'leg day', 'bench press', 'squat', 'deadlift'] },
  { name: 'Football', met: 8, keywords: ['football', 'soccer'] },
  { name: 'Basketball', met: 8, keywords: ['basketball'] },
  { name: 'Tennis / badminton', met: 7, keywords: ['tennis', 'badminton', 'squash'] },
  { name: 'Dancing', met: 6.5, keywords: ['zumba', 'dance', 'dancing', 'aerobics'] },
  { name: 'Hiking', met: 6, keywords: ['hiking', 'hike', 'trekking', 'trek'] },
  { name: 'Elliptical', met: 5, keywords: ['elliptical', 'cross trainer'] },
  { name: 'Walking', met: 3.5, keywords: ['walking', 'walk'] },
  { name: 'Yoga / Pilates', met: 3, keywords: ['yoga', 'pilates', 'stretching', 'stretch', 'mobility'] },
];

const VIGOROUS_WORDS = [
  'vigorous',
  'very hard',
  'high intensity',
  'high-intensity',
  'intense',
  'sprint',
  'heavy',
  'fast pace',
  'hiit',
];

const LIGHT_WORDS = [
  'light',
  'easy',
  'gentle',
  'recovery',
  'slow pace',
  'low intensity',
  'low-intensity',
  'warm up',
  'warm-up',
];

const normalize = (value) => String(value || '').trim().toLowerCase();

const findActivity = (workoutType, notes) => {
  const type = normalize(workoutType);
  const noteText = normalize(notes);
  return ACTIVITY_PROFILES.find(({ keywords }) => keywords.some((keyword) => type.includes(keyword)))
    || ACTIVITY_PROFILES.find(({ keywords }) => keywords.some((keyword) => noteText.includes(keyword)))
    || { name: 'General workout', met: 5 };
};

const findIntensity = (workoutType, notes) => {
  const description = `${normalize(workoutType)} ${normalize(notes)}`;
  if (VIGOROUS_WORDS.some((word) => description.includes(word))) {
    return { name: 'vigorous', multiplier: 1.25 };
  }
  if (LIGHT_WORDS.some((word) => description.includes(word))) {
    return { name: 'light', multiplier: 0.75 };
  }
  return { name: 'moderate', multiplier: 1 };
};

export const estimateWorkoutCalories = ({
  workoutType,
  durationMinutes,
  weightKg,
  notes = '',
}) => {
  if (!normalize(workoutType)) {
    throw new Error('Enter a workout type');
  }

  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration <= 0 || duration > 600) {
    throw new Error('Enter a duration from 1 to 600 whole minutes');
  }

  const parsedWeight = Number(weightKg);
  const hasProfileWeight = Number.isFinite(parsedWeight) && parsedWeight >= 30 && parsedWeight <= 300;
  const safeWeight = hasProfileWeight ? parsedWeight : DEFAULT_WEIGHT_KG;
  const activity = findActivity(workoutType, notes);
  const intensity = findIntensity(workoutType, notes);
  const met = Number(Math.min(12, Math.max(2, activity.met * intensity.multiplier)).toFixed(1));
  const calories = Math.max(1, Math.round((met * 3.5 * safeWeight * duration) / 200));

  return {
    calories,
    met,
    activity: activity.name,
    intensity: intensity.name,
    weightKg: safeWeight,
    usedDefaultWeight: !hasProfileWeight,
  };
};
