const CACHE_KEY = 'deeply_fit_diary_cache_v1';
const QUEUE_KEY = 'deeply_fit_diary_queue_v1';
const TEMP_ID_KEY = 'deeply_fit_diary_temp_id_v1';
const MICRONUTRIENT_RDA = {
  fiber: 28,
  sugar: 50,
  sodium: 2300,
  vitamin_c: 90,
  vitamin_d: 20,
  vitamin_b12: 2.4,
  iron: 18,
  calcium: 1300,
  potassium: 4700,
};

const hasWindow = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export const createEmptySummary = (date, base = {}) => ({
  date,
  calories_consumed: 0,
  calories_burned: base.calories_burned || 0,
  calories_target: base.calories_target || 2000,
  protein: 0,
  carbs: 0,
  fat: 0,
  micronutrients: {
    fiber: 0,
    sugar: 0,
    sodium: 0,
    vitamin_c: 0,
    vitamin_d: 0,
    vitamin_b12: 0,
    iron: 0,
    calcium: 0,
    potassium: 0,
    percent_of_rda: {
      fiber: 0,
      sugar: 0,
      sodium: 0,
      vitamin_c: 0,
      vitamin_d: 0,
      vitamin_b12: 0,
      iron: 0,
      calcium: 0,
      potassium: 0,
    },
  },
  water_glasses: base.water_glasses || 0,
  food_logs: [],
  workouts: base.workouts || [],
});

export const rebuildSummaryFromLogs = (date, logs, existingSummary = {}) => {
  const micronutrients = {
    fiber: Number(logs.reduce((sum, item) => sum + (Number(item.fiber) || 0), 0).toFixed(1)),
    sugar: Number(logs.reduce((sum, item) => sum + (Number(item.sugar) || 0), 0).toFixed(1)),
    sodium: Number(logs.reduce((sum, item) => sum + (Number(item.sodium) || 0), 0).toFixed(1)),
    vitamin_c: Number(logs.reduce((sum, item) => sum + (Number(item.vitamin_c) || 0), 0).toFixed(1)),
    vitamin_d: Number(logs.reduce((sum, item) => sum + (Number(item.vitamin_d) || 0), 0).toFixed(1)),
    vitamin_b12: Number(logs.reduce((sum, item) => sum + (Number(item.vitamin_b12) || 0), 0).toFixed(1)),
    iron: Number(logs.reduce((sum, item) => sum + (Number(item.iron) || 0), 0).toFixed(1)),
    calcium: Number(logs.reduce((sum, item) => sum + (Number(item.calcium) || 0), 0).toFixed(1)),
    potassium: Number(logs.reduce((sum, item) => sum + (Number(item.potassium) || 0), 0).toFixed(1)),
  };

  return {
    ...createEmptySummary(date, existingSummary),
    food_logs: logs,
    calories_consumed: Number(logs.reduce((sum, item) => sum + (Number(item.calories) || 0), 0).toFixed(1)),
    protein: Number(logs.reduce((sum, item) => sum + (Number(item.protein) || 0), 0).toFixed(1)),
    carbs: Number(logs.reduce((sum, item) => sum + (Number(item.carbs) || 0), 0).toFixed(1)),
    fat: Number(logs.reduce((sum, item) => sum + (Number(item.fat) || 0), 0).toFixed(1)),
    micronutrients: {
      ...micronutrients,
      percent_of_rda: Object.fromEntries(
        Object.entries(MICRONUTRIENT_RDA).map(([key, target]) => [
          key,
          Number(((micronutrients[key] / target) * 100).toFixed(1)),
        ])
      ),
    },
  };
};

export const readDiaryCache = () => {
  if (!hasWindow()) return { dates: {} };
  return safeParse(window.localStorage.getItem(CACHE_KEY), { dates: {} });
};

export const writeDiaryCache = (cache) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

export const readOfflineQueue = () => {
  if (!hasWindow()) return [];
  return safeParse(window.localStorage.getItem(QUEUE_KEY), []);
};

export const writeOfflineQueue = (queue) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const nextOfflineId = () => {
  if (!hasWindow()) return -Date.now();
  const current = parseInt(window.localStorage.getItem(TEMP_ID_KEY) || '-1', 10);
  const next = Number.isNaN(current) ? -1 : current - 1;
  window.localStorage.setItem(TEMP_ID_KEY, String(next));
  return next;
};

export const getCachedDiaryDate = (date) => {
  const cache = readDiaryCache();
  return clone(cache.dates?.[date] || { logs: [], summary: null, updatedAt: null });
};

export const updateCachedDiaryDate = (date, updater) => {
  const cache = readDiaryCache();
  const current = cache.dates?.[date] || { logs: [], summary: null, updatedAt: null };
  const next = updater(clone(current));
  cache.dates = cache.dates || {};
  cache.dates[date] = {
    logs: next.logs || [],
    summary: next.summary || null,
    updatedAt: new Date().toISOString(),
  };
  writeDiaryCache(cache);
  return clone(cache.dates[date]);
};

export const findCachedLogDate = (logId) => {
  const cache = readDiaryCache();
  return Object.entries(cache.dates || {}).find(([, value]) =>
    (value.logs || []).some((item) => item.id === logId)
  )?.[0] || null;
};

export const emitDiaryCacheEvent = (detail = {}) => {
  if (!hasWindow()) return;
  window.dispatchEvent(new window.CustomEvent('deeplyfit:diary-cache-updated', { detail }));
};

export const emitDiaryQueueEvent = (detail = {}) => {
  if (!hasWindow()) return;
  window.dispatchEvent(new window.CustomEvent('deeplyfit:offline-queue-changed', { detail }));
};

export const emitDiarySyncEvent = (detail = {}) => {
  if (!hasWindow()) return;
  window.dispatchEvent(new window.CustomEvent('deeplyfit:diary-sync-complete', { detail }));
};
