import {
  createEmptySummary,
  emitDiaryCacheEvent,
  emitDiaryQueueEvent,
  emitDiarySyncEvent,
  findCachedLogDate,
  getCachedDiaryDate,
  nextOfflineId,
  readOfflineQueue,
  rebuildSummaryFromLogs,
  updateCachedDiaryDate,
  writeOfflineQueue,
} from './diaryStorage';

const BASE_URL = process.env.REACT_APP_API_URL || '';

const todayString = () => new Date().toISOString().split('T')[0];

const getHeaders = () => {
  const token = localStorage.getItem('deeply_fit_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const request = async (method, path, body = null) => {
  const options = {
    method,
    headers: getHeaders(),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, options);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network error' }));
    const detail = Array.isArray(err.detail)
      ? err.detail.map((item) => item.msg || JSON.stringify(item)).join(', ')
      : err.detail;
    throw new Error(typeof detail === 'string' ? detail : `Error ${res.status}`);
  }

  return res.json();
};

const isOfflineError = (err) => (
  typeof navigator !== 'undefined' &&
  !navigator.onLine &&
  /network|failed to fetch|load failed/i.test(err.message || '')
);

const queueDiaryOperation = (operation) => {
  const queue = readOfflineQueue();
  queue.push({
    ...operation,
    queued_at: new Date().toISOString(),
  });
  writeOfflineQueue(queue);
  emitDiaryQueueEvent({ pendingCount: queue.length });
};

const updateCachedLogs = (date, logs, summary) => {
  updateCachedDiaryDate(date, (current) => ({
    logs,
    summary: summary || rebuildSummaryFromLogs(date, logs, current.summary || createEmptySummary(date)),
  }));
  emitDiaryCacheEvent({ date });
};

const cacheDiaryResponse = (date, logs = null, summary = null) => {
  updateCachedDiaryDate(date, (current) => {
    const nextLogs = logs || current.logs || [];
    const nextSummary = summary || current.summary || rebuildSummaryFromLogs(date, nextLogs, createEmptySummary(date));
    return {
      logs: nextLogs,
      summary: rebuildSummaryFromLogs(date, nextLogs, nextSummary),
    };
  });
  emitDiaryCacheEvent({ date });
};

const buildOfflineFoodLog = (payload) => {
  const quantity = Number(payload.quantity) || 1;
  return {
    id: nextOfflineId(),
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

const removeQueuedCreateForTempId = (tempId) => {
  const queue = readOfflineQueue();
  const nextQueue = queue.filter((item) => !(item.type === 'logFood' && item.temp_id === tempId));
  if (nextQueue.length !== queue.length) {
    writeOfflineQueue(nextQueue);
    emitDiaryQueueEvent({ pendingCount: nextQueue.length });
    return true;
  }
  return false;
};

const getCachedSummaryOrFallback = (date) => {
  const cached = getCachedDiaryDate(date);
  if (cached.summary) return cached.summary;
  if (cached.logs?.length) return rebuildSummaryFromLogs(date, cached.logs, createEmptySummary(date));
  return null;
};

const diaryApi = {
  async logFood(data) {
    if (navigator.onLine) {
      const created = await request('POST', '/food/log', data);
      const cached = getCachedDiaryDate(data.date);
      updateCachedLogs(
        data.date,
        [...(cached.logs || []).filter((item) => item.id !== created.id), created],
        rebuildSummaryFromLogs(data.date, [...(cached.logs || []).filter((item) => item.id !== created.id), created], cached.summary || createEmptySummary(data.date))
      );
      return created;
    }

    const offlineLog = buildOfflineFoodLog(data);
    const cached = getCachedDiaryDate(data.date);
    const nextLogs = [...(cached.logs || []), offlineLog];
    updateCachedLogs(data.date, nextLogs, rebuildSummaryFromLogs(data.date, nextLogs, cached.summary || createEmptySummary(data.date)));
    queueDiaryOperation({ type: 'logFood', payload: data, temp_id: offlineLog.id });
    return offlineLog;
  },

  async getFoodLogs(date) {
    try {
      const logs = await request('GET', `/food/logs/${date}`);
      cacheDiaryResponse(date, logs, null);
      return logs;
    } catch (err) {
      const cached = getCachedDiaryDate(date);
      if (isOfflineError(err) && cached.logs) {
        return cached.logs;
      }
      throw err;
    }
  },

  async deleteFoodLog(id) {
    const cachedDate = findCachedLogDate(id);

    if (!navigator.onLine) {
      if (!cachedDate) {
        throw new Error('This entry is not available offline');
      }

      const cached = getCachedDiaryDate(cachedDate);
      const nextLogs = (cached.logs || []).filter((item) => item.id !== id);
      updateCachedLogs(cachedDate, nextLogs, rebuildSummaryFromLogs(cachedDate, nextLogs, cached.summary || createEmptySummary(cachedDate)));

      if (id < 0 && removeQueuedCreateForTempId(id)) {
        return { message: 'Removed' };
      }

      queueDiaryOperation({ type: 'deleteFoodLog', payload: { id, date: cachedDate } });
      return { message: 'Removed' };
    }

    const response = await request('DELETE', `/food/log/${id}`);
    if (cachedDate) {
      const cached = getCachedDiaryDate(cachedDate);
      const nextLogs = (cached.logs || []).filter((item) => item.id !== id);
      updateCachedLogs(cachedDate, nextLogs, rebuildSummaryFromLogs(cachedDate, nextLogs, cached.summary || createEmptySummary(cachedDate)));
    }
    return response;
  },

  async getDailySummary(date) {
    try {
      const summary = await request('GET', `/food/summary/${date}`);
      cacheDiaryResponse(date, summary.food_logs || [], summary);
      return summary;
    } catch (err) {
      const cached = getCachedSummaryOrFallback(date);
      if (isOfflineError(err) && cached) {
        return cached;
      }
      throw err;
    }
  },

  getOfflineQueueLength() {
    return readOfflineQueue().length;
  },

  async syncOfflineDiary() {
    const queue = readOfflineQueue();
    if (!queue.length) {
      return { syncedCount: 0, pendingCount: 0 };
    }

    const touchedDates = new Set();
    const remaining = [];
    let syncedCount = 0;

    for (const operation of queue) {
      try {
        if (operation.type === 'logFood') {
          await request('POST', '/food/log', operation.payload);
          touchedDates.add(operation.payload.date);
          syncedCount += 1;
          continue;
        }

        if (operation.type === 'deleteFoodLog') {
          if (operation.payload.id > 0) {
            await request('DELETE', `/food/log/${operation.payload.id}`);
          }
          touchedDates.add(operation.payload.date);
          syncedCount += 1;
          continue;
        }

        if (operation.type === 'applyMealTemplate') {
          await request('POST', `/templates/meals/${operation.payload.id}/log`, operation.payload.data);
          touchedDates.add(operation.payload.data.date);
          syncedCount += 1;
          continue;
        }

        if (operation.type === 'copyMeals') {
          await request('POST', '/food/copy-day', operation.payload);
          touchedDates.add(operation.payload.target_date);
          syncedCount += 1;
          continue;
        }

        remaining.push(operation);
      } catch (err) {
        remaining.push(operation);
      }
    }

    writeOfflineQueue(remaining);
    emitDiaryQueueEvent({ pendingCount: remaining.length });

    for (const date of touchedDates) {
      try {
        const [logs, summary] = await Promise.all([
          request('GET', `/food/logs/${date}`),
          request('GET', `/food/summary/${date}`),
        ]);
        cacheDiaryResponse(date, logs, summary);
      } catch (err) {
        // Keep the last cached snapshot if refresh fails.
      }
    }

    if (touchedDates.size > 0) {
      emitDiarySyncEvent({ dates: Array.from(touchedDates) });
    }

    return {
      syncedCount,
      pendingCount: remaining.length,
    };
  },
};

export const api = {
  // Low-level helpers
  get: (path) => request('GET', path),
  post: (path, data) => request('POST', path, data),
  put: (path, data) => request('PUT', path, data),
  delete: (path) => request('DELETE', path),

  // Auth
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  me: () => request('GET', '/auth/me'),
  forgotPassword: (data) => request('POST', '/auth/forgot-password', data),
  resetPassword: (data) => request('POST', '/auth/reset-password', data),

  // Onboarding
  completeOnboarding: (data) => request('POST', '/users/onboarding', data),

  // Profile
  updateProfile: (data) => request('PUT', '/users/profile', data),
  getPremiumStatus: () => request('GET', '/users/premium/status'),
  activatePremium: (data) => request('POST', '/users/premium/activate', data),

  // Food
  logFood: diaryApi.logFood,
  getFoodLogs: diaryApi.getFoodLogs,
  deleteFoodLog: diaryApi.deleteFoodLog,
  getDailySummary: diaryApi.getDailySummary,
  getWeeklySummary: () => request('GET', '/food/weekly-summary'),
  lookupBarcode: (barcode) => request('GET', `/food/barcode/${barcode}`),
  searchFoods: (query, page = 1, pageSize = 12) => request('GET', `/food/search?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`),
  logBarcodeFood: (data) => request('POST', '/food/barcode/log', data),
  getMealSuggestions: (date) => request('GET', `/food/suggestions/${date}`),
  copyMealsFromDay: async (data) => {
    if (navigator.onLine) {
      const response = await request('POST', '/food/copy-day', data);
      const targetDate = data.target_date;
      const [logs, summary] = await Promise.all([
        request('GET', `/food/logs/${targetDate}`),
        request('GET', `/food/summary/${targetDate}`),
      ]);
      cacheDiaryResponse(targetDate, logs, summary);
      return response;
    }

    queueDiaryOperation({ type: 'copyMeals', payload: data });
    const targetCached = getCachedDiaryDate(data.target_date);
    return {
      message: 'Copy queued for sync',
      count: targetCached.logs?.length || 0,
    };
  },

  // AI Coach
  chat: (data) => request('POST', '/ai/chat', data),

  // Scan
  scanFood: (data) => request('POST', '/food/scan', data),

  // Meal templates
  getMealTemplates: () => request('GET', '/templates/meals'),
  createMealTemplate: (data) => request('POST', '/templates/meals', data),
  applyMealTemplate: async (id, data) => {
    if (navigator.onLine) {
      const response = await request('POST', `/templates/meals/${id}/log`, data);
      const [logs, summary] = await Promise.all([
        request('GET', `/food/logs/${data.date}`),
        request('GET', `/food/summary/${data.date}`),
      ]);
      cacheDiaryResponse(data.date, logs, summary);
      return response;
    }

    queueDiaryOperation({ type: 'applyMealTemplate', payload: { id, data } });
    return { message: 'Template queued for sync' };
  },
  deleteMealTemplate: (id) => request('DELETE', `/templates/meals/${id}`),

  // Meal plans
  getWeeklyMealPlan: (startDate) => request('GET', `/meal-plans/week?start_date=${startDate}`),
  createMealPlanEntry: (data) => request('POST', '/meal-plans/entries', data),
  deleteMealPlanEntry: (id) => request('DELETE', `/meal-plans/entries/${id}`),

  // Community
  getCommunityPosts: () => request('GET', '/community/posts'),
  createCommunityPost: (data) => request('POST', '/community/posts', data),
  toggleCommunityLike: (postId) => request('POST', `/community/posts/${postId}/like`),
  createCommunityComment: (postId, data) => request('POST', `/community/posts/${postId}/comments`, data),
  getCommunityChallenges: () => request('GET', '/community/challenges'),
  joinCommunityChallenge: (challengeId) => request('POST', `/community/challenges/${encodeURIComponent(challengeId)}/join`),

  // Public profiles
  getPublicProfile: (slug) => request('GET', `/users/public/${encodeURIComponent(slug)}`),

  // Workouts
  logWorkout: (data) => request('POST', '/workouts/log', data),
  getWorkouts: (date) => request('GET', `/workouts/logs/${date}`),
  deleteWorkout: (id) => request('DELETE', `/workouts/log/${id}`),
  getWorkoutLibrary: () => request('GET', '/workouts/library'),
  logDetailedWorkout: (data) => request('POST', '/workouts/log-detailed', data),
  getWorkoutHistory: (limit = 10) => request('GET', `/workouts/history?limit=${limit}`),
  getWorkoutStreak: () => request('GET', '/workouts/streak'),
  getWorkoutCalendar: () => request('GET', '/workouts/calendar'),

  // Food allergens
  checkAllergens: (foodName) => request('POST', '/food/check-allergens', { food_name: foodName }),
  getAllergens: () => request('GET', '/users/allergens'),
  setAllergens: (allergens) => request('PUT', '/users/allergens', { allergens }),

  // Water
  addGlass: () => request('POST', '/water/add-glass'),
  logWater: (data) => request('POST', '/water/log', data),
  getWaterLog: (date) => request('GET', `/water/log/${date}`),
  getWaterGoal: () => request('GET', '/water/goal'),
  setWaterGoal: (data) => request('POST', '/water/goal', data),

  // Calorie streak
  getCalorieStreak: () => request('GET', '/food/calorie-streak'),

  // Weight
  logWeight: (data) => request('POST', '/weight/log', data),
  getWeightLogs: (limit = 30) => request('GET', `/weight/logs?limit=${limit}`),
  getBMIHistory: (limit = 30) => request('GET', `/weight/bmi-history?limit=${limit}`),

  // Achievements
  getAchievements: () => request('GET', '/users/achievements'),

  // Offline helpers
  getOfflineQueueLength: diaryApi.getOfflineQueueLength,
  syncOfflineDiary: diaryApi.syncOfflineDiary,
};

export const isTodayDate = (date) => date === todayString();
