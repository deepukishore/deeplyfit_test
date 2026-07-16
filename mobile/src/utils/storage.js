import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'deeply_fit_diary_cache_v1';
const QUEUE_KEY = 'deeply_fit_diary_queue_v1';
const TEMP_ID_KEY = 'deeply_fit_diary_temp_id_v1';
const USER_CACHE_KEY = 'deeply_fit_user_cache_v1';

const MICRONUTRIENT_RDA = {
  fiber: 28, sugar: 50, sodium: 2300, vitamin_c: 90,
  vitamin_d: 20, vitamin_b12: 2.4, iron: 18, calcium: 1300, potassium: 4700,
};

const clone = (v) => JSON.parse(JSON.stringify(v));

export const createEmptySummary = (date, base = {}) => ({
  date,
  calories_consumed: 0,
  calories_burned: base.calories_burned || 0,
  calories_target: base.calories_target || 2000,
  protein: 0, carbs: 0, fat: 0,
  micronutrients: {
    fiber: 0, sugar: 0, sodium: 0, vitamin_c: 0, vitamin_d: 0,
    vitamin_b12: 0, iron: 0, calcium: 0, potassium: 0,
    percent_of_rda: { fiber: 0, sugar: 0, sodium: 0, vitamin_c: 0, vitamin_d: 0, vitamin_b12: 0, iron: 0, calcium: 0, potassium: 0 },
  },
  water_glasses: base.water_glasses || 0,
  food_logs: [],
  workouts: base.workouts || [],
});

export const rebuildSummaryFromLogs = (date, logs, existingSummary = {}) => {
  const micro = {};
  Object.keys(MICRONUTRIENT_RDA).forEach((k) => {
    micro[k] = Number(logs.reduce((s, i) => s + (Number(i[k]) || 0), 0).toFixed(1));
  });
  return {
    ...createEmptySummary(date, existingSummary),
    food_logs: logs,
    calories_consumed: Number(logs.reduce((s, i) => s + (Number(i.calories) || 0), 0).toFixed(1)),
    protein: Number(logs.reduce((s, i) => s + (Number(i.protein) || 0), 0).toFixed(1)),
    carbs: Number(logs.reduce((s, i) => s + (Number(i.carbs) || 0), 0).toFixed(1)),
    fat: Number(logs.reduce((s, i) => s + (Number(i.fat) || 0), 0).toFixed(1)),
    micronutrients: {
      ...micro,
      percent_of_rda: Object.fromEntries(
        Object.entries(MICRONUTRIENT_RDA).map(([k, t]) => [k, Number(((micro[k] / t) * 100).toFixed(1))])
      ),
    },
  };
};

export const readDiaryCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : { dates: {} };
  } catch { return { dates: {} }; }
};

export const writeDiaryCache = async (cache) => {
  try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
};

export const readOfflineQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const writeOfflineQueue = async (queue) => {
  try { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
};

export const nextOfflineId = async () => {
  try {
    const raw = await AsyncStorage.getItem(TEMP_ID_KEY);
    const current = parseInt(raw || '-1', 10);
    const next = Number.isNaN(current) ? -1 : current - 1;
    await AsyncStorage.setItem(TEMP_ID_KEY, String(next));
    return next;
  } catch { return -Date.now(); }
};

export const getCachedDiaryDate = async (date) => {
  const cache = await readDiaryCache();
  return clone(cache.dates?.[date] || { logs: [], summary: null, updatedAt: null });
};

export const updateCachedDiaryDate = async (date, updater) => {
  const cache = await readDiaryCache();
  const current = cache.dates?.[date] || { logs: [], summary: null, updatedAt: null };
  const next = updater(clone(current));
  cache.dates = cache.dates || {};
  cache.dates[date] = { logs: next.logs || [], summary: next.summary || null, updatedAt: new Date().toISOString() };
  await writeDiaryCache(cache);
  return clone(cache.dates[date]);
};

export const findCachedLogDate = async (logId) => {
  const cache = await readDiaryCache();
  const entry = Object.entries(cache.dates || {}).find(([, v]) => (v.logs || []).some((i) => i.id === logId));
  return entry?.[0] || null;
};

export const getToken = () => AsyncStorage.getItem('deeply_fit_token');
export const setToken = (t) => AsyncStorage.setItem('deeply_fit_token', t);
export const removeToken = () => AsyncStorage.removeItem('deeply_fit_token');

export const getCachedUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const setCachedUser = async (user) => {
  try { await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user)); } catch {}
};

export const removeCachedUser = () => AsyncStorage.removeItem(USER_CACHE_KEY);

export const getFavorites = async () => {
  try {
    const raw = await AsyncStorage.getItem('deeply_fit_favorite_foods_v1');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const setFavorites = async (favs) => {
  try { await AsyncStorage.setItem('deeply_fit_favorite_foods_v1', JSON.stringify(favs)); } catch {}
};
