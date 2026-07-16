import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
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

const MACRO_COLORS = ['#4facfe', '#a855f7', '#f5a623'];

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

  const macroData = [
    { name: 'Protein', value: Math.round(summary?.protein || 0) },
    { name: 'Carbs', value: Math.round(summary?.carbs || 0) },
    { name: 'Fat', value: Math.round(summary?.fat || 0) },
  ].filter(m => m.value > 0);

  const suggestions = getWorkoutSuggestions(user?.fitness_goal, user?.activity_level);
  const initials = getInitials(user?.name, user?.email);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <p className="greeting-text">{getGreeting()}</p>
            <h1 className="greeting-name">{user?.name || user?.email?.split('@')[0] || 'Athlete'} 👋</h1>
          </div>
          <div className="header-avatar" onClick={() => navigate('/profile')}>{initials}</div>
        </div>
      </div>

      <div className="page-scroll stagger">
        {/* Quote */}
        <div className="quote-card animate-fade-in">
          <div className="quote-icon">💬</div>
          <p className="quote-text">"{getDailyQuote()}"</p>
        </div>

        {/* Calories */}
        <div className="calories-card animate-slide-up">
          <div className="calories-main">
            <div className="calories-remaining">
              <p className="calories-remaining-label">Calories remaining</p>
              <div className={`calories-remaining-value ${remaining < 0 ? 'over' : ''}`}>
                {Math.abs(Math.round(remaining))}
              </div>
              {remaining < 0 && <p style={{ fontSize: 12, color: 'var(--accent-coral)', marginTop: 4 }}>Over goal by {Math.abs(Math.round(remaining))} kcal</p>}
            </div>
            <div className="calories-formula">
              <div className="formula-row"><span className="label">Goal</span><span className="value goal">{Math.round(summary?.calories_target || 0)}</span></div>
              <div className="formula-row"><span className="label">Food</span><span className="op">−</span><span className="value">{Math.round(summary?.calories_consumed || 0)}</span></div>
              <div className="formula-row"><span className="label">Exercise</span><span className="op">+</span><span className="value">{Math.round(summary?.calories_burned || 0)}</span></div>
            </div>
          </div>
          <div className="calories-progress">
            <div className="progress-label">
              <span>0</span>
              <span>{Math.round(progress)}% of goal</span>
              <span>{Math.round(summary?.calories_target || 0)}</span>
            </div>
            <div className="progress-bar">
              <div className={`progress-bar-fill ${progress >= 100 ? 'danger' : progress >= 80 ? 'warning' : 'success'}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Calorie Streak */}
        {calorieStreak && (
          <div className="animate-slide-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-lg)' }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <h2 className="section-title">🎯 Calorie Streak</h2>
              <span className="badge badge-lime">Within goal</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'var(--accent-lime)', lineHeight: 1 }}>{calorieStreak.current_streak}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current streak</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{calorieStreak.current_streak === 1 ? 'day' : 'days'} 🔥</div>
              </div>
              <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'var(--accent-amber)', lineHeight: 1 }}>{calorieStreak.best_streak}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Best streak</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{calorieStreak.best_streak === 1 ? 'day' : 'days'} 🏆</div>
              </div>
            </div>
          </div>
        )}

        {/* Macros */}
        {(summary?.protein > 0 || summary?.carbs > 0 || summary?.fat > 0) ? (
          <div className="macros-card animate-slide-up">
            <div className="section-header">
              <h2 className="section-title">Macros</h2>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Today</span>
            </div>
            <div className="macros-chart-wrapper">
              <div style={{ width: 120, height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={macroData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                      {macroData.map((_, i) => <Cell key={i} fill={MACRO_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="macros-legend">
                {[
                  { name: 'Protein', val: summary?.protein, color: MACRO_COLORS[0], target: user?.protein_target },
                  { name: 'Carbs', val: summary?.carbs, color: MACRO_COLORS[1], target: user?.carbs_target },
                  { name: 'Fat', val: summary?.fat, color: MACRO_COLORS[2], target: user?.fat_target },
                ].map(m => (
                  <div key={m.name} className="macro-legend-item">
                    <div className="macro-legend-dot" style={{ background: m.color }} />
                    <span className="macro-legend-label">{m.name}</span>
                    <span className="macro-legend-value">{Math.round(m.val || 0)}g{m.target ? ` / ${Math.round(m.target)}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="macros-card animate-slide-up">
            <div className="section-header"><h2 className="section-title">Macros</h2></div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Log food to see your macro breakdown</p>
          </div>
        )}

        {/* Water Tracker */}
        <div className="water-card animate-slide-up">
          <div className="water-header">
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Water intake</p>
              <div className="water-count">{summary?.water_glasses || 0}</div>
              <p className="water-target">of {waterGoal} glasses</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💧</div>
              <div style={{ fontSize: 13, color: 'var(--accent-blue)' }}>
                {(Math.min((summary?.water_glasses || 0) / waterGoal, 1) * 100).toFixed(0)}%
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, fontSize: 11 }} onClick={() => setShowHydrationModal(true)}>⚙️ Goal</button>
            </div>
          </div>
          <div className="water-glasses">
            {Array.from({ length: waterGoal }).map((_, i) => (
              <div key={i} className={`water-glass ${i < (summary?.water_glasses || 0) ? 'filled' : ''}`}>💧</div>
            ))}
          </div>
          <button className="btn btn-secondary water-add-btn btn-full btn-sm" onClick={handleAddGlass} disabled={(summary?.water_glasses || 0) >= waterGoal}>
            + Add Glass
          </button>
        </div>

        {suggestionsData && (
          <div className="meal-suggestions-card animate-slide-up">
            <div className="section-header">
              <h2 className="section-title">AI Meal Suggestions</h2>
              <button className="btn btn-ghost btn-sm" onClick={loadSuggestions}>Refresh</button>
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

        {/* Quick Actions */}
        <div>
          <div className="section-header"><h2 className="section-title">Quick Actions</h2></div>
          <div className="quick-actions">
            {[
              { icon: '🍽️', label: 'Log Food', color: 'rgba(168,85,247,0.12)', action: () => setModal('food') },
              { icon: '🏋️', label: 'Log Workout', color: 'rgba(245,166,35,0.1)', action: () => setModal('workout') },
              { icon: '⚖️', label: 'Log Weight', color: 'rgba(79,172,254,0.1)', action: () => setModal('weight') },
              { icon: '📚', label: 'Planner', color: 'rgba(192,132,252,0.12)', action: () => setShowPlanner(true) },
            ].map(a => (
              <button key={a.label} className="quick-action-btn tap-feedback" onClick={a.action}>
                <div className="quick-action-icon" style={{ background: a.color }}>{a.icon}</div>
                <span className="quick-action-label">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Workout Suggestions */}
        <div className="workout-card animate-slide-up">
          <div className="section-header">
            <h2 className="section-title">Suggested Workouts</h2>
            <span className="badge badge-lime">{user?.fitness_goal || 'maintain'}</span>
          </div>
          {suggestions.map((s, i) => (
            <div key={i} className="workout-suggestion">
              <div className="workout-suggestion-icon">{s.icon}</div>
              <div className="workout-suggestion-info">
                <p className="workout-suggestion-name">{s.name}</p>
                <p className="workout-suggestion-detail">{s.detail}</p>
              </div>
              <span className="workout-suggestion-cal">~{s.calories} kcal</span>
            </div>
          ))}
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
