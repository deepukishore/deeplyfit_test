import NetInfo from '@react-native-community/netinfo';
import {
  createEmptySummary, rebuildSummaryFromLogs,
  readOfflineQueue, writeOfflineQueue, nextOfflineId,
  getCachedDiaryDate, updateCachedDiaryDate, findCachedLogDate,
  getToken,
} from './storage';
import { getApiBaseUrl, getNetworkErrorMessage } from './apiBase';

const BASE_URL = getApiBaseUrl();

const todayString = () => new Date().toISOString().split('T')[0];

const normalizeApiError = (detail, status) => {
  const message = typeof detail === 'string' ? detail : `Error ${status}`;
  if (/quota|rate[- ]?limit|free_tier|resource_exhausted|generativelanguage\.googleapis\.com/i.test(message)) {
    if (/food scanner|scan/i.test(message)) {
      return 'AI food scanner quota is exhausted for now. Try again later or enter nutrition manually.';
    }
    return 'AI coach quota is exhausted for now. Try again after the quota resets.';
  }
  return message;
};

const getHeaders = async () => {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const request = async (method, path, body = null) => {
  const headers = await getHeaders();
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Network error' }));
      const detail = Array.isArray(err.detail)
        ? err.detail.map((item) => item.msg || JSON.stringify(item)).join(', ')
        : err.detail;
      throw new Error(normalizeApiError(detail, res.status));
    }
    return res.json();
  } catch (err) {
    if (/failed to fetch|network request failed|network error|connect/i.test(String(err?.message || ''))) {
      throw new Error(getNetworkErrorMessage(BASE_URL));
    }
    throw err;
  }
};

const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable !== false;
};

const isOfflineError = async (err) => {
  const online = await isOnline();
  return !online && /network|failed to fetch|load failed/i.test(err.message || '');
};

const queueDiaryOperation = async (operation) => {
  const queue = await readOfflineQueue();
  queue.push({ ...operation, queued_at: new Date().toISOString() });
  await writeOfflineQueue(queue);
};

const updateCachedLogs = async (date, logs, summary) => {
  await updateCachedDiaryDate(date, (current) => ({
    logs,
    summary: summary || rebuildSummaryFromLogs(date, logs, current.summary || createEmptySummary(date)),
  }));
};

const buildOfflineFoodLog = async (payload) => {
  const quantity = Number(payload.quantity) || 1;
  return {
    id: await nextOfflineId(),
    date: payload.date,
    meal_type: payload.meal_type,
    food_name: payload.food_name,
    calories: Number((Number(payload.calories || 0) * quantity).toFixed(1)),
    protein: Number((Number(payload.protein || 0) * quantity).toFixed(1)),
    carbs: Number((Number(payload.carbs || 0) * quantity).toFixed(1)),
    fat: Number((Number(payload.fat || 0) * quantity).toFixed(1)),
    fiber: Number((Number(payload.fiber || 0) * quantity).toFixed(1)),
    sugar: Number((Number(payload.sugar || 0) * quantity).toFixed(1)),
    sodium: Number((Number(payload.sodium || 0) * quantity).toFixed(1)),
    vitamin_c: Number((Number(payload.vitamin_c || 0) * quantity).toFixed(1)),
    vitamin_d: Number((Number(payload.vitamin_d || 0) * quantity).toFixed(1)),
    vitamin_b12: Number((Number(payload.vitamin_b12 || 0) * quantity).toFixed(1)),
    iron: Number((Number(payload.iron || 0) * quantity).toFixed(1)),
    calcium: Number((Number(payload.calcium || 0) * quantity).toFixed(1)),
    potassium: Number((Number(payload.potassium || 0) * quantity).toFixed(1)),
    quantity,
    is_offline: true,
  };
};

const diaryApi = {
  async logFood(data) {
    const online = await isOnline();
    if (online) {
      const created = await request('POST', '/food/log', data);
      const cached = await getCachedDiaryDate(data.date);
      const nextLogs = [...(cached.logs || []).filter((i) => i.id !== created.id), created];
      await updateCachedLogs(data.date, nextLogs, rebuildSummaryFromLogs(data.date, nextLogs, cached.summary || createEmptySummary(data.date)));
      return created;
    }
    const offlineLog = await buildOfflineFoodLog(data);
    const cached = await getCachedDiaryDate(data.date);
    const nextLogs = [...(cached.logs || []), offlineLog];
    await updateCachedLogs(data.date, nextLogs, rebuildSummaryFromLogs(data.date, nextLogs, cached.summary || createEmptySummary(data.date)));
    await queueDiaryOperation({ type: 'logFood', payload: data, temp_id: offlineLog.id });
    return offlineLog;
  },

  async getFoodLogs(date) {
    try {
      const logs = await request('GET', `/food/logs/${date}`);
      await updateCachedDiaryDate(date, (c) => ({ ...c, logs }));
      return logs;
    } catch (err) {
      const cached = await getCachedDiaryDate(date);
      if ((await isOfflineError(err)) && cached.logs) return cached.logs;
      throw err;
    }
  },

  async deleteFoodLog(id) {
    const cachedDate = await findCachedLogDate(id);
    const online = await isOnline();
    if (!online) {
      if (!cachedDate) throw new Error('This entry is not available offline');
      const cached = await getCachedDiaryDate(cachedDate);
      const nextLogs = (cached.logs || []).filter((i) => i.id !== id);
      await updateCachedLogs(cachedDate, nextLogs, rebuildSummaryFromLogs(cachedDate, nextLogs, cached.summary || createEmptySummary(cachedDate)));
      await queueDiaryOperation({ type: 'deleteFoodLog', payload: { id, date: cachedDate } });
      return { message: 'Removed' };
    }
    const response = await request('DELETE', `/food/log/${id}`);
    if (cachedDate) {
      const cached = await getCachedDiaryDate(cachedDate);
      const nextLogs = (cached.logs || []).filter((i) => i.id !== id);
      await updateCachedLogs(cachedDate, nextLogs, rebuildSummaryFromLogs(cachedDate, nextLogs, cached.summary || createEmptySummary(cachedDate)));
    }
    return response;
  },

  async getDailySummary(date) {
    try {
      const summary = await request('GET', `/food/summary/${date}`);
      await updateCachedDiaryDate(date, (c) => ({ ...c, logs: summary.food_logs || [], summary }));
      return summary;
    } catch (err) {
      const cached = await getCachedDiaryDate(date);
      if ((await isOfflineError(err)) && cached.summary) return cached.summary;
      throw err;
    }
  },

  async getOfflineQueueLength() {
    return (await readOfflineQueue()).length;
  },

  async syncOfflineDiary() {
    const queue = await readOfflineQueue();
    if (!queue.length) return { syncedCount: 0, pendingCount: 0 };
    const touchedDates = new Set();
    const remaining = [];
    let syncedCount = 0;
    for (const op of queue) {
      try {
        if (op.type === 'logFood') { await request('POST', '/food/log', op.payload); touchedDates.add(op.payload.date); syncedCount++; continue; }
        if (op.type === 'deleteFoodLog') { if (op.payload.id > 0) await request('DELETE', `/food/log/${op.payload.id}`); touchedDates.add(op.payload.date); syncedCount++; continue; }
        if (op.type === 'applyMealTemplate') { await request('POST', `/templates/meals/${op.payload.id}/log`, op.payload.data); touchedDates.add(op.payload.data.date); syncedCount++; continue; }
        if (op.type === 'copyMeals') { await request('POST', '/food/copy-day', op.payload); touchedDates.add(op.payload.target_date); syncedCount++; continue; }
        remaining.push(op);
      } catch { remaining.push(op); }
    }
    await writeOfflineQueue(remaining);
    for (const date of touchedDates) {
      try {
        const [logs, summary] = await Promise.all([request('GET', `/food/logs/${date}`), request('GET', `/food/summary/${date}`)]);
        await updateCachedDiaryDate(date, () => ({ logs, summary }));
      } catch {}
    }
    return { syncedCount, pendingCount: remaining.length };
  },
};

export const api = {
  forgotPassword: (email) => request('POST', '/auth/forgot-password', { email }),
  resetPassword: (token, new_password) => request('POST', '/auth/reset-password', { token, new_password }),
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  me: () => request('GET', '/auth/me'),
  getPremiumStatus: () => request('GET', '/users/premium/status'),
  activatePremium: (data) => request('POST', '/users/premium/activate', data),
  completeOnboarding: (data) => request('POST', '/users/onboarding', data),
  updateProfile: (data) => request('PUT', '/users/profile', data),
  logFood: (data) => diaryApi.logFood(data),
  getFoodLogs: (date) => diaryApi.getFoodLogs(date),
  deleteFoodLog: (id) => diaryApi.deleteFoodLog(id),
  getDailySummary: (date) => diaryApi.getDailySummary(date),
  getWeeklySummary: () => request('GET', '/food/weekly-summary'),
  lookupBarcode: (barcode) => request('GET', `/food/barcode/${barcode}`),
  searchFoods: (query, page = 1, pageSize = 12) => request('GET', `/food/search?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`),
  logBarcodeFood: (data) => request('POST', '/food/barcode/log', data),
  getMealSuggestions: (date) => request('GET', `/food/suggestions/${date}`),
  copyMealsFromDay: async (data) => {
    const online = await isOnline();
    if (online) {
      const response = await request('POST', '/food/copy-day', data);
      const [logs, summary] = await Promise.all([request('GET', `/food/logs/${data.target_date}`), request('GET', `/food/summary/${data.target_date}`)]);
      await updateCachedDiaryDate(data.target_date, () => ({ logs, summary }));
      return response;
    }
    await queueDiaryOperation({ type: 'copyMeals', payload: data });
    return { message: 'Copy queued for sync', count: 0 };
  },
  chat: (data) => request('POST', '/ai/chat', data),
  scanFood: (data) => request('POST', '/food/scan', data),
  getMealTemplates: () => request('GET', '/templates/meals'),
  createMealTemplate: (data) => request('POST', '/templates/meals', data),
  applyMealTemplate: async (id, data) => {
    const online = await isOnline();
    if (online) {
      const response = await request('POST', `/templates/meals/${id}/log`, data);
      const [logs, summary] = await Promise.all([request('GET', `/food/logs/${data.date}`), request('GET', `/food/summary/${data.date}`)]);
      await updateCachedDiaryDate(data.date, () => ({ logs, summary }));
      return response;
    }
    await queueDiaryOperation({ type: 'applyMealTemplate', payload: { id, data } });
    return { message: 'Template queued for sync' };
  },
  deleteMealTemplate: (id) => request('DELETE', `/templates/meals/${id}`),
  getWeeklyMealPlan: (startDate) => request('GET', `/meal-plans/week?start_date=${startDate}`),
  createMealPlanEntry: (data) => request('POST', '/meal-plans/entries', data),
  deleteMealPlanEntry: (id) => request('DELETE', `/meal-plans/entries/${id}`),
  getCommunityPosts: () => request('GET', '/community/posts'),
  createCommunityPost: (data) => request('POST', '/community/posts', data),
  toggleCommunityLike: (postId) => request('POST', `/community/posts/${postId}/like`),
  createCommunityComment: (postId, data) => request('POST', `/community/posts/${postId}/comments`, data),
  getCommunityChallenges: () => request('GET', '/community/challenges'),
  joinCommunityChallenge: (challengeId) => request('POST', `/community/challenges/${encodeURIComponent(challengeId)}/join`),
  getPublicProfile: (slug) => request('GET', `/users/public/${encodeURIComponent(slug)}`),
  logWorkout: (data) => request('POST', '/workouts/log', data),
  getWorkouts: (date) => request('GET', `/workouts/logs/${date}`),
  deleteWorkout: (id) => request('DELETE', `/workouts/log/${id}`),
  getWorkoutLibrary: () => request('GET', '/workouts/library'),
  logDetailedWorkout: (data) => request('POST', '/workouts/log-detailed', data),
  getWorkoutHistory: (limit = 10) => request('GET', `/workouts/history?limit=${limit}`),
  getWorkoutStreak: () => request('GET', '/workouts/streak'),
  getWorkoutCalendar: () => request('GET', '/workouts/calendar'),
  checkAllergens: (foodName) => request('POST', '/food/check-allergens', { food_name: foodName }),
  getAllergens: () => request('GET', '/users/allergens'),
  setAllergens: (allergens) => request('PUT', '/users/allergens', { allergens }),
  addGlass: () => request('POST', '/water/add-glass'),
  logWater: (data) => request('POST', '/water/log', data),
  getWaterLog: (date) => request('GET', `/water/log/${date}`),
  getWaterGoal: () => request('GET', '/water/goal'),
  setWaterGoal: (data) => request('POST', '/water/goal', data),
  getCalorieStreak: () => request('GET', '/food/calorie-streak'),
  logWeight: (data) => request('POST', '/weight/log', data),
  getWeightLogs: (limit = 30) => request('GET', `/weight/logs?limit=${limit}`),
  getBMIHistory: (limit = 30) => request('GET', `/weight/bmi-history?limit=${limit}`),
  getAchievements: () => request('GET', '/users/achievements'),
  getOfflineQueueLength: () => diaryApi.getOfflineQueueLength(),
  syncOfflineDiary: () => diaryApi.syncOfflineDiary(),
};

export const isTodayDate = (date) => date === todayString();
