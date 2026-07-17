import React, { useState, useEffect, useCallback } from 'react';
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
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { createEmptySummary, getCachedDiaryDate } from '../utils/diaryStorage';
import {
  getGreeting, getDailyQuote, formatDate, getWorkoutSuggestions, getInitials
} from '../utils/fitness';
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
  const [form, setForm] = useState({ food_name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'breakfast', quantity: 1 });
  const [loading, setLoading] = useState(false);
  const today = formatDate(new Date());

  const handleSave = async () => {
    if (!form.food_name || !form.calories) { toast.error('Food name and calories are required'); return; }
    setLoading(true);
    try {
      await api.logFood({ ...form, date: today, calories: parseFloat(form.calories), protein: parseFloat(form.protein) || 0, carbs: parseFloat(form.carbs) || 0, fat: parseFloat(form.fat) || 0, quantity: parseFloat(form.quantity) || 1 });
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
            <input placeholder="e.g. Chicken breast" value={form.food_name} onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label>Calories</label>
              <input type="number" placeholder="0" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>Quantity</label>
              <input type="number" placeholder="1" step="0.5" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="input-group"><label>Protein (g)</label><input type="number" placeholder="0" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} /></div>
            <div className="input-group"><label>Carbs (g)</label><input type="number" placeholder="0" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} /></div>
            <div className="input-group"><label>Fat (g)</label><input type="number" placeholder="0" value={form.fat} onChange={e => setForm(f => ({ ...f, fat: e.target.value }))} /></div>
          </div>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Log Food'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LogWorkoutModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ workout_type: '', duration_minutes: '', calories_burned: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const today = formatDate(new Date());

  const handleSave = async () => {
    if (!form.workout_type || !form.duration_minutes) { toast.error('Workout type and duration are required'); return; }
    setLoading(true);
    try {
      await api.logWorkout({ ...form, date: today, duration_minutes: parseInt(form.duration_minutes), calories_burned: parseFloat(form.calories_burned) || 0 });
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
            <input placeholder="e.g. Weight Training" value={form.workout_type} onChange={e => setForm(f => ({ ...f, workout_type: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group"><label>Duration (min)</label><input type="number" placeholder="45" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} /></div>
            <div className="input-group"><label>Calories Burned</label><input type="number" placeholder="300" value={form.calories_burned} onChange={e => setForm(f => ({ ...f, calories_burned: e.target.value }))} /></div>
          </div>
          <div className="input-group">
            <label>Notes (optional)</label>
            <input placeholder="How did it go?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading}>
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

  const loadSuggestions = useCallback(async () => {
    try {
      const data = await api.getMealSuggestions(today);
      setSuggestionsData(data);
    } catch (err) {
      setSuggestionsData(null);
    }
  }, [today]);

  const loadSummary = useCallback(async () => {
    const [summaryResult, suggestionsResult, workoutResult] = await Promise.allSettled([
      api.getDailySummary(today),
      api.getMealSuggestions(today),
      api.getWorkoutHistory(3),
    ]);

    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    if (suggestionsResult.status === 'fulfilled') setSuggestionsData(suggestionsResult.value);
    if (workoutResult.status === 'fulfilled') setRecentWorkoutHistory(workoutResult.value);
  }, [today]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    api.getCalorieStreak().then(setCalorieStreak).catch(() => {});
    api.getWaterGoal().then(d => setWaterGoal(d.water_goal || 8)).catch(() => {});
  }, []);

  useRefreshRegistration(async () => {
    const [, streak, water] = await Promise.all([
      loadSummary(),
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
            <button className="header-avatar" type="button" onClick={() => navigate('/profile')} aria-label="Open profile">{initials}</button>
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
              <button className="btn btn-ghost btn-sm icon-text-btn" onClick={loadSuggestions}><RefreshCw size={14} /> Refresh</button>
            </div>
            <p className="meal-suggestions-summary">{suggestionsData.summary_text}</p>
            <div className="meal-suggestions-grid">
              {suggestionsData.suggestions.map((suggestion) => (
                <div key={suggestion.name} className="meal-suggestion-tile">
                  <div className="meal-suggestion-head">
                    <h3>{suggestion.name}</h3>
                    <span className="badge badge-lime">{Math.round(suggestion.calories)} kcal</span>
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
      {modal === 'workout' && <LogWorkoutModal onClose={() => setModal(null)} onSave={loadSummary} />}
      {modal === 'weight' && <LogWeightModal onClose={() => setModal(null)} onSave={loadSummary} />}
      {showPlanner && <WorkoutPlannerModal date={today} onClose={() => setShowPlanner(false)} onSuccess={loadSummary} />}
      {showHydrationModal && <HydrationGoalModal user={user} currentGoal={waterGoal} onClose={() => setShowHydrationModal(false)} onSave={setWaterGoal} />}
    </div>
  );
};

export default Home;
