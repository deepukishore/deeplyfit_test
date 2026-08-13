import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BookOpenText,
  Droplets,
  Dumbbell,
  Flame,
  Play,
  RefreshCw,
  Scale,
  Settings,
  Target,
  Utensils,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { createEmptySummary, getCachedDiaryDate } from '../utils/diaryStorage';
import {
  getGreeting, getDailyQuote, formatDate, getWorkoutSuggestions, getInitials
} from '../utils/fitness';
import { formatFoodAmount, scaleNutrition } from '../utils/nutrition';
import { estimateWorkoutCalories } from '../utils/workoutCalories';
import WorkoutPlannerModal from '../components/WorkoutPlannerModal';
import '../styles/dashboard.css';
import '../styles/animations.css';

const MACRO_COLORS = ['var(--accent-blue)', 'var(--accent-lime)', 'var(--accent-amber)'];

const getInitialHomeSummary = (date, user) => (
  getCachedDiaryDate(date).summary || createEmptySummary(date, {
    calories_target: user?.calorie_target || 2000,
    water_glasses: 0,
    workouts: [],
  })
);

const HydrationGoalModal = ({ user, currentGoal, onClose, onSave }) => {
  const weight = user?.current_weight || 70;
  const activityMultiplier = { sedentary: 1, lightly_active: 1.1, moderately_active: 1.2, very_active: 1.3, extra_active: 1.4 }[user?.activity_level] || 1;
  const suggested = Math.round((weight * 35 * activityMultiplier) / 250); // 250ml per glass
  const [goal, setGoal] = useState(currentGoal);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.setWaterGoal({ water_goal: goal });
      toast.success(`Hydration goal set to ${goal} glasses 💧`);
      onSave(goal);
      onClose();
    } catch { toast.error('Failed to update goal'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">💧 Hydration Goal</h3>
        <div className="modal-form">
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Calculated for you:</p>
            {[
              { label: 'Based on weight', val: `${weight}kg × 35ml = ${Math.round(weight * 35)}ml/day` },
              { label: 'Activity boost', val: `×${activityMultiplier.toFixed(1)} (${user?.activity_level?.replace('_', ' ') || 'moderate'})` },
              { label: 'Suggested glasses', val: `${suggested} glasses (250ml each)`, highlight: true },
            ].map(r => (
              <div key={r.label} className="stat-row">
                <span className="stat-label">{r.label}</span>
                <span className="stat-value" style={r.highlight ? { color: 'var(--accent-lime)' } : {}}>{r.val}</span>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: '100%' }} onClick={() => setGoal(suggested)}>
              Use suggested ({suggested} glasses)
            </button>
          </div>
          <div className="input-group">
            <label>Daily Goal (glasses)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setGoal(g => Math.max(1, g - 1))} style={{ fontSize: 20, padding: '4px 12px' }}>−</button>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--accent-blue)', minWidth: 48, textAlign: 'center' }}>{goal}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setGoal(g => Math.min(30, g + 1))} style={{ fontSize: 20, padding: '4px 12px' }}>+</button>
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Set Goal'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LogFoodModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    food_name: '',
    meal_type: 'breakfast',
    amount: '100',
    amount_unit: 'grams',
  });
  const [results, setResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const today = formatDate(new Date());

  const calculation = useMemo(() => {
    if (!selectedFood) return { nutrition: null, error: null };
    try {
      return {
        nutrition: scaleNutrition(selectedFood, form.amount, form.amount_unit),
        error: null,
      };
    } catch (err) {
      return { nutrition: null, error: err.message };
    }
  }, [selectedFood, form.amount, form.amount_unit]);

  const selectFood = (food) => {
    setSelectedFood(food);
    setForm((current) => ({ ...current, food_name: food.name }));
  };

  const handleFoodNameChange = (value) => {
    setForm((current) => ({ ...current, food_name: value }));
    setSelectedFood(null);
    setResults([]);
    setSearched(false);
  };

  const handleUnitChange = (unit) => {
    setForm((current) => ({
      ...current,
      amount_unit: unit,
      amount: unit === 'grams' ? '100' : '1',
    }));
  };

  const handleCalculate = async () => {
    const query = form.food_name.trim();
    if (query.length < 2) {
      toast.error('Enter at least 2 characters of the food name');
      return;
    }

    setSearching(true);
    setSearched(true);
    try {
      const data = await api.searchFoods(query, 1, 12);
      const matches = (data.results || []).filter((food) => Number(food.calories) > 0);
      setResults(matches);
      if (matches.length) selectFood(matches[0]);
      else setSelectedFood(null);
    } catch (err) {
      setResults([]);
      setSelectedFood(null);
      toast.error(err.message || 'Could not calculate nutrition');
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFood || !calculation.nutrition) {
      toast.error(calculation.error || 'Calculate and select a food match first');
      return;
    }

    const amountLabel = formatFoodAmount(form.amount, form.amount_unit, selectedFood);
    setLoading(true);
    try {
      await api.logFood({
        date: today,
        meal_type: form.meal_type,
        food_name: `${selectedFood.name} (${amountLabel})`,
        ...calculation.nutrition,
        quantity: 1,
      });
      toast.success('Food logged! 🍽️');
      onSave();
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">🍽️ Log Food</h3>
        <div className="modal-form">
          <div className="input-group">
            <label>Meal</label>
            <select value={form.meal_type} onChange={e => setForm(f => ({ ...f, meal_type: e.target.value }))}>
              {['breakfast', 'lunch', 'dinner', 'snacks'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Food Name</label>
            <div className="auto-nutrition-search">
              <input
                placeholder="e.g. dosa, chutney, allam pachadi, sambar"
                value={form.food_name}
                onChange={(event) => handleFoodNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCalculate();
                }}
                autoFocus
              />
              <button className="btn btn-secondary" type="button" onClick={handleCalculate} disabled={searching}>
                {searching ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
          </div>
          <div className="amount-entry-grid">
            <div className="input-group">
              <label>Amount</label>
              <input
                type="number"
                min="0.1"
                step={form.amount_unit === 'grams' ? '1' : '0.5'}
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              />
            </div>
            <div className="input-group">
              <label>Measure</label>
              <div className="measure-toggle" role="group" aria-label="Food amount unit">
                {[
                  ['grams', 'Grams'],
                  ['portions', 'Portions'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={form.amount_unit === value ? 'active' : ''}
                    onClick={() => handleUnitChange(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {results.length > 0 && (
            <div className="food-search-results compact-results">
              <p className="food-match-help">Choose the closest match:</p>
              {results.slice(0, 12).map((result) => (
                <button
                  key={`${result.code}-${result.name}`}
                  type="button"
                  className={`food-search-result ${selectedFood === result ? 'selected' : ''}`}
                  onClick={() => selectFood(result)}
                >
                  <span>
                    <span className="food-search-result-name">{result.name}</span>
                    <span className="food-search-result-meta">
                      {result.brand || 'Nutrition estimate'} · {result.nutrition_basis}
                    </span>
                  </span>
                  <span className="badge badge-amber">{Math.round(result.calories || 0)} kcal</span>
                </button>
              ))}
            </div>
          )}

          {searched && !searching && results.length === 0 && (
            <p className="nutrition-message">No nutrition match was found. Try a simpler food name.</p>
          )}

          {calculation.error && <p className="nutrition-message error">{calculation.error}</p>}

          {calculation.nutrition && (
            <div className="nutrition-preview">
              <div className="nutrition-preview-head">
                <div>
                  <p className="nutrition-preview-title">Estimated nutrition</p>
                  <p className="nutrition-preview-basis">
                    {selectedFood.name} · {formatFoodAmount(form.amount, form.amount_unit, selectedFood)}
                  </p>
                </div>
                <strong>{Math.round(calculation.nutrition.calories)} kcal</strong>
              </div>
              <div className="nutrition-macro-grid">
                <div><span>Protein</span><strong>{calculation.nutrition.protein} g</strong></div>
                <div><span>Carbs</span><strong>{calculation.nutrition.carbs} g</strong></div>
                <div><span>Fat</span><strong>{calculation.nutrition.fat} g</strong></div>
              </div>
              <p className="nutrition-disclaimer">Estimated from the selected database match; recipes and preparation can change the values.</p>
            </div>
          )}

          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading || !calculation.nutrition}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Log Food'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LogWorkoutModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({ workout_type: '', duration_minutes: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const today = formatDate(new Date());

  const estimate = useMemo(() => {
    if (!form.workout_type.trim() || !form.duration_minutes) return { value: null, error: null };
    try {
      return {
        value: estimateWorkoutCalories({
          workoutType: form.workout_type,
          durationMinutes: form.duration_minutes,
          weightKg: user?.current_weight,
          notes: form.notes,
        }),
        error: null,
      };
    } catch (err) {
      return { value: null, error: err.message };
    }
  }, [form.workout_type, form.duration_minutes, form.notes, user?.current_weight]);

  const handleSave = async () => {
    if (!estimate.value) {
      toast.error(estimate.error || 'Workout type and duration are required');
      return;
    }
    setLoading(true);
    try {
      await api.logWorkout({
        ...form,
        date: today,
        duration_minutes: Number(form.duration_minutes),
        calories_burned: estimate.value.calories,
      });
      toast.success('Workout logged! 💪');
      onSave();
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">💪 Log Workout</h3>
        <div className="modal-form">
          <div className="input-group">
            <label>Workout Type</label>
            <input
              list="workout-type-options"
              placeholder="e.g. Weight Training"
              value={form.workout_type}
              onChange={e => setForm(f => ({ ...f, workout_type: e.target.value }))}
              autoFocus
            />
            <datalist id="workout-type-options">
              {['Walking', 'Running', 'Cycling', 'Weight Training', 'HIIT', 'Yoga', 'Swimming', 'Football', 'Badminton'].map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>
          <div className="input-group">
            <label>Duration (min)</label>
            <input
              type="number"
              min="1"
              max="600"
              step="1"
              placeholder="45"
              value={form.duration_minutes}
              onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label>Notes (optional)</label>
            <input
              placeholder="e.g. Easy pace, heavy sets, very intense"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {estimate.error && <p className="nutrition-message error">{estimate.error}</p>}

          {estimate.value && (
            <div className="workout-calorie-preview" aria-live="polite">
              <div className="workout-calorie-preview-head">
                <div>
                  <p className="workout-calorie-title">Estimated calories burned</p>
                  <p className="workout-calorie-basis">
                    {estimate.value.activity} · {estimate.value.intensity} intensity · {estimate.value.weightKg} kg
                  </p>
                </div>
                <strong>{estimate.value.calories} kcal</strong>
              </div>
              <p className="workout-calorie-disclaimer">
                Automatically estimated from duration, workout type, profile weight, and intensity clues in your note.
                {estimate.value.usedDefaultWeight ? ' Add your current weight in Profile for a more personal estimate.' : ' Actual burn may vary.'}
              </p>
            </div>
          )}

          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading || !estimate.value}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Log Workout'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LogWeightModal = ({ onClose, onSave }) => {
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const today = formatDate(new Date());

  const handleSave = async () => {
    if (!weight || parseFloat(weight) < 30 || parseFloat(weight) > 300) { toast.error('Enter a valid weight (30–300 kg)'); return; }
    setLoading(true);
    try {
      await api.logWeight({ date: today, weight: parseFloat(weight) });
      toast.success('Weight logged! ⚖️');
      onSave();
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">⚖️ Log Weight</h3>
        <div className="modal-form">
          <div className="input-group">
            <label>Today's Weight</label>
            <div className="input-with-unit">
              <input type="number" placeholder="75.0" step="0.1" min="30" max="300" value={weight} onChange={e => setWeight(e.target.value)} />
              <span className="input-unit">kg</span>
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Log Weight'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = formatDate(new Date());
  const [summary, setSummary] = useState(() => getInitialHomeSummary(today, user));
  const [suggestionsData, setSuggestionsData] = useState(null);
  const [recentWorkoutHistory, setRecentWorkoutHistory] = useState([]);
  const [calorieStreak, setCalorieStreak] = useState(null);
  const [waterGoal, setWaterGoal] = useState(8);
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  const [modal, setModal] = useState(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const [suggestionsRefreshing, setSuggestionsRefreshing] = useState(false);
  const suggestionVariantRef = useRef(0);

  const refreshSuggestions = useCallback(async () => {
    if (suggestionsRefreshing) return;
    const nextVariant = suggestionVariantRef.current + 1;
    const currentNames = (suggestionsData?.suggestions || []).map(({ name }) => name);
    setSuggestionsRefreshing(true);
    try {
      const data = await api.getMealSuggestions(today, {
        variant: nextVariant,
        exclude: currentNames,
      });
      suggestionVariantRef.current = nextVariant;
      setSuggestionsData(data);
    } catch (err) {
      toast.error(err.message || 'Could not refresh meal suggestions');
    } finally {
      setSuggestionsRefreshing(false);
    }
  }, [suggestionsData, suggestionsRefreshing, today]);

  const loadSummary = useCallback(async ({ rotateSuggestions = false } = {}) => {
    const variant = rotateSuggestions
      ? suggestionVariantRef.current + 1
      : suggestionVariantRef.current;
    const [summaryResult, suggestionsResult, workoutResult] = await Promise.allSettled([
      api.getDailySummary(today),
      api.getMealSuggestions(today, { variant }),
      api.getWorkoutHistory(3),
    ]);

    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    if (suggestionsResult.status === 'fulfilled') {
      suggestionVariantRef.current = variant;
      setSuggestionsData(suggestionsResult.value);
    }
    if (workoutResult.status === 'fulfilled') setRecentWorkoutHistory(workoutResult.value);
  }, [today]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    api.getCalorieStreak().then(setCalorieStreak).catch(() => {});
    api.getWaterGoal().then(d => setWaterGoal(d.water_goal || 8)).catch(() => {});
  }, []);

  useRefreshRegistration(async () => {
    const [, streak, water] = await Promise.all([
      loadSummary({ rotateSuggestions: true }),
      api.getCalorieStreak().catch(() => null),
      api.getWaterGoal().catch(() => null),
    ]);

    if (streak) setCalorieStreak(streak);
    if (water) setWaterGoal(water.water_goal || 8);
  });

  useEffect(() => {
    const handleDiarySync = (event) => {
      if ((event.detail?.dates || []).includes(today)) {
        loadSummary();
      }
    };

    window.addEventListener('deeplyfit:diary-sync-complete', handleDiarySync);
    return () => window.removeEventListener('deeplyfit:diary-sync-complete', handleDiarySync);
  }, [loadSummary, today]);

  const handleAddGlass = async () => {
    try {
      await api.addGlass();
      setSummary(s => ({ ...s, water_glasses: (s?.water_glasses || 0) + 1 }));
      toast.success('Hydration tracked! 💧');
    } catch (err) {
      toast.error('Failed to log water');
    }
  };

  const remaining = (summary?.calories_target || 0) - (summary?.calories_consumed || 0) + (summary?.calories_burned || 0);
  const progress = Math.min(((summary?.calories_consumed || 0) / (summary?.calories_target || 2000)) * 100, 100);
  const hour = new Date().getHours();
  const timeTheme = hour >= 6 && hour < 12
    ? 'morning'
    : hour >= 12 && hour < 17
      ? 'afternoon'
      : hour >= 17 && hour < 21
        ? 'evening'
        : 'night';
  const displayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const macroRows = [
    { name: 'Protein', value: summary?.protein || 0, target: user?.protein_target || 140, color: MACRO_COLORS[0] },
    { name: 'Carbs', value: summary?.carbs || 0, target: user?.carbs_target || 200, color: MACRO_COLORS[1] },
    { name: 'Fat', value: summary?.fat || 0, target: user?.fat_target || 65, color: MACRO_COLORS[2] },
  ];
  const streakDays = Math.min(calorieStreak?.current_streak || 0, 7);

  const suggestions = getWorkoutSuggestions(user?.fitness_goal, user?.activity_level);
  const initials = getInitials(user?.name, user?.email);

  return (
    <div className="page-content">
      <div className={`page-header home-hero home-hero-${timeTheme}`}>
        <div className="page-header-inner">
          <div>
            <p className="greeting-text">{getGreeting()}</p>
            <h1 className="greeting-name">{user?.name || user?.email?.split('@')[0] || 'Athlete'}</h1>
            <p className="home-streak-subtitle">
              {calorieStreak?.current_streak
                ? `You're ${calorieStreak.current_streak} days into your streak.`
                : 'Make today count.'}
            </p>
          </div>
          <div className="home-hero-actions">
            <span className="home-date-pill">{displayDate}</span>
            <button className="header-avatar" type="button" onClick={() => navigate('/profile')} aria-label="Open profile">
              <UserAvatar value={user?.profile_picture} initials={initials} className="header-avatar-visual" />
            </button>
          </div>
        </div>
      </div>

      <div className="page-scroll stagger">
        <div className="quote-card animate-fade-in">
          <span className="quote-mark" aria-hidden="true">&ldquo;</span>
          <p className="quote-text">{getDailyQuote()}</p>
        </div>

        <section className="calories-card calorie-command-card animate-slide-up">
          <div className="calorie-ring-wrap">
            <svg className="calorie-ring" viewBox="0 0 200 200" role="img" aria-label={`${Math.round(progress)} percent of calorie goal`}>
              <defs>
                <linearGradient id="homeLimeGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent-lime)" />
                  <stop offset="100%" stopColor="var(--accent-amber)" />
                </linearGradient>
              </defs>
              <circle className="calorie-ring-track" cx="100" cy="100" r="80" />
              <circle
                className="calorie-ring-progress"
                cx="100"
                cy="100"
                r="80"
                style={{ strokeDashoffset: 502 - (502 * progress) / 100 }}
              />
            </svg>
            <div className="calorie-ring-copy">
              <strong className={remaining < 0 ? 'over' : ''}>{Math.abs(Math.round(remaining)).toLocaleString()}</strong>
              <span>{remaining < 0 ? 'kcal over goal' : 'kcal remaining'}</span>
            </div>
          </div>
          <div className="calorie-mini-stats">
            <span><Utensils size={15} /><strong>{Math.round(summary?.calories_consumed || 0).toLocaleString()}</strong> eaten</span>
            <span><Dumbbell size={15} /><strong>{Math.round(summary?.calories_burned || 0).toLocaleString()}</strong> burned</span>
            <span><Target size={15} /><strong>{Math.round(summary?.calories_target || 0).toLocaleString()}</strong> goal</span>
          </div>
        </section>

        {calorieStreak && (
          <section className="streak-command-card animate-slide-up">
            <div className="streak-command-head">
              <span className={`streak-fire ${calorieStreak.current_streak >= 3 ? 'is-hot' : ''}`}><Flame size={30} fill="currentColor" /></span>
              <div>
                <h2>{calorieStreak.current_streak}-Day Streak</h2>
                <p>Best run: {calorieStreak.best_streak} days</p>
              </div>
              <strong>{streakDays}/7</strong>
            </div>
            <div className="streak-progress"><span style={{ width: `${(streakDays / 7) * 100}%` }} /></div>
            <div className="streak-week" aria-label={`${streakDays} completed days this week`}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day, index) => (
                <span key={day} className={index < streakDays ? 'complete' : ''}>
                  <i>{index < streakDays ? '\u2713' : ''}</i>{day}
                </span>
              ))}
            </div>
            <p className="streak-nudge">
              {streakDays === 7 ? 'Week Warrior unlocked.' : `Keep going. ${7 - streakDays} more ${7 - streakDays === 1 ? 'day' : 'days'} to unlock Week Warrior.`}
            </p>
          </section>
        )}

        <section className="macros-card macro-bars-card animate-slide-up">
          <div className="section-header">
            <h2 className="section-title">Macro balance</h2>
            <span className="section-kicker">Today</span>
          </div>
          <div className="macro-bars">
            {macroRows.map((macro) => {
              const macroProgress = Math.min((macro.value / macro.target) * 100, 100);
              return (
                <div className="macro-bar-row" key={macro.name}>
                  <div className="macro-bar-copy">
                    <span><i style={{ background: macro.color }} />{macro.name}</span>
                    <strong>{Math.round(macro.value)}g <small>/ {Math.round(macro.target)}g</small></strong>
                  </div>
                  <div className="macro-bar-track">
                    <span style={{ width: `${macroProgress}%`, background: macro.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {!macroRows.some((macro) => macro.value > 0) && (
            <p className="macro-empty">Log food to start building your macro picture.</p>
          )}
        </section>

        <section className="water-card water-command-card animate-slide-up">
          <div className="water-command-copy">
            <span className="section-kicker">Hydration</span>
            <h2>Water balance</h2>
            <p>Small sips. Better energy. Sharper recovery.</p>
            <button className="water-goal-btn" type="button" onClick={() => setShowHydrationModal(true)}>
              <Settings size={15} /> Set goal
            </button>
          </div>
          <div className="water-bottle" aria-label={`${summary?.water_glasses || 0} of ${waterGoal} glasses`}>
            <div
              className="water-bottle-fill"
              style={{ height: `${Math.min(((summary?.water_glasses || 0) / waterGoal) * 100, 100)}%` }}
            >
              <span />
            </div>
            <div className="water-bottle-copy">
              <strong>{summary?.water_glasses || 0}/{waterGoal}</strong>
              <span>glasses</span>
            </div>
          </div>
          <button
            className="btn btn-secondary water-add-btn"
            type="button"
            onClick={handleAddGlass}
            disabled={(summary?.water_glasses || 0) >= waterGoal}
          >
            <Droplets size={17} /> Add Glass
          </button>
        </section>

        {suggestionsData && (
          <div className="meal-suggestions-card animate-slide-up">
            <div className="section-header">
              <h2 className="section-title">AI Meal Suggestions</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm icon-text-btn"
                onClick={refreshSuggestions}
                disabled={suggestionsRefreshing}
                aria-label="Refresh meal suggestions"
              >
                <RefreshCw className={suggestionsRefreshing ? 'suggestions-refresh-icon is-spinning' : 'suggestions-refresh-icon'} size={14} />
                {suggestionsRefreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            <p className="meal-suggestions-summary">{suggestionsData.summary_text}</p>
            <div className="meal-suggestions-grid" aria-live="polite" aria-busy={suggestionsRefreshing}>
              {suggestionsData.suggestions.map((suggestion) => (
                <div key={suggestion.name} className="meal-suggestion-tile">
                  <div className="meal-suggestion-head">
                    <h3>{suggestion.name}</h3>
                    <div className="meal-suggestion-badges">
                      {suggestion.cuisine === 'south_indian' && <span className="badge badge-purple">South Indian</span>}
                      <span className={`badge ${suggestion.diet_type === 'vegetarian' ? 'badge-lime' : 'badge-amber'}`}>
                        {suggestion.diet_type === 'vegetarian' ? 'Veg' : 'Non-veg'}
                      </span>
                      <span className="badge badge-blue">{Math.round(suggestion.calories)} kcal</span>
                    </div>
                  </div>
                  <p className="meal-suggestion-portion">{suggestion.portion_hint}</p>
                  <p className="meal-suggestion-reason">{suggestion.reason}</p>
                  <div className="meal-suggestion-macros">
                    <span>P {Math.round(suggestion.protein)}g</span>
                    <span>C {Math.round(suggestion.carbs)}g</span>
                    <span>F {Math.round(suggestion.fat)}g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="quick-actions-section">
          <div className="section-header"><h2 className="section-title">Quick Actions</h2></div>
          <div className="quick-actions">
            {[
              { icon: Utensils, label: 'Log Food', tone: 'lime', action: () => setModal('food') },
              { icon: Dumbbell, label: 'Workout', tone: 'amber', action: () => setModal('workout') },
              { icon: Scale, label: 'Weight', tone: 'blue', action: () => setModal('weight') },
              { icon: BookOpenText, label: 'Planner', tone: 'purple', action: () => setShowPlanner(true) },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} className={`quick-action-btn quick-action-${action.tone} tap-feedback`} onClick={action.action}>
                  <span className="quick-action-icon"><Icon size={23} /></span>
                  <span className="quick-action-label">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="workout-card animate-slide-up">
          <div className="section-header">
            <h2 className="section-title">Suggested Workouts</h2>
            <span className="badge badge-lime">{user?.fitness_goal || 'maintain'}</span>
          </div>
          <div className="workout-suggestions-scroll">
            {suggestions.map((suggestion, index) => (
              <article key={suggestion.name} className={`workout-suggestion workout-tone-${index % 4}`}>
                <div className="workout-suggestion-icon">{suggestion.icon}</div>
                <div className="workout-suggestion-info">
                  <p className="workout-suggestion-name">{suggestion.name}</p>
                  <p className="workout-suggestion-detail">{suggestion.detail}</p>
                  <span className="workout-suggestion-cal">~{suggestion.calories} kcal</span>
                </div>
                <button type="button" className="workout-start-btn" onClick={() => setShowPlanner(true)} aria-label={`Start ${suggestion.name}`}>
                  <Play size={14} fill="currentColor" /> Start
                </button>
              </article>
            ))}
          </div>
        </div>

        {recentWorkoutHistory.length > 0 && (
          <div className="workout-card animate-slide-up">
            <div className="section-header">
              <h2 className="section-title">Recent Planned Sessions</h2>
              <span className="badge badge-blue">{recentWorkoutHistory.length} logged</span>
            </div>
            {recentWorkoutHistory.map((session) => (
              <div key={session.id} className="workout-history-card">
                <div className="workout-history-head">
                  <div>
                    <p className="workout-suggestion-name">{session.workout_type}</p>
                    <p className="workout-suggestion-detail">
                      {session.duration_minutes} min · {Math.round(session.calories_burned || 0)} kcal
                    </p>
                  </div>
                  <span className="badge badge-lime">{session.exercises.length} exercises</span>
                </div>
                <div className="workout-history-tags">
                  {session.exercises.slice(0, 4).map((exercise) => (
                    <span key={exercise.name} className="badge badge-blue">{exercise.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'food' && <LogFoodModal onClose={() => setModal(null)} onSave={loadSummary} />}
      {modal === 'workout' && <LogWorkoutModal user={user} onClose={() => setModal(null)} onSave={loadSummary} />}
      {modal === 'weight' && <LogWeightModal onClose={() => setModal(null)} onSave={loadSummary} />}
      {showPlanner && <WorkoutPlannerModal user={user} date={today} onClose={() => setShowPlanner(false)} onSuccess={loadSummary} />}
      {showHydrationModal && <HydrationGoalModal user={user} currentGoal={waterGoal} onClose={() => setShowHydrationModal(false)} onSave={setWaterGoal} />}
    </div>
  );
};

export default Home;
