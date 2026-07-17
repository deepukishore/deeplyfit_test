import React, { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import { Flame, Lock, Scale, Target, TrendingDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { formatDate } from '../utils/fitness';
import '../styles/dashboard.css';
import '../styles/animations.css';

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ color: 'var(--accent-lime)', fontWeight: 700 }}>{payload[0].value}{unit}</p>
    </div>
  );
};

const LogWeightModal = ({ onClose, onSave }) => {
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const today = formatDate(new Date());

  const handleSave = async () => {
    if (!weight || parseFloat(weight) < 30 || parseFloat(weight) > 300) {
      toast.error('Enter a valid weight between 30 and 300 kg');
      return;
    }
    setLoading(true);
    try {
      await api.logWeight({ date: today, weight: parseFloat(weight) });
      toast.success('Weight logged');
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">Log Today&apos;s Weight</h3>
        <div className="modal-form">
          <div className="input-group">
            <label>Weight</label>
            <div className="input-with-unit">
              <input
                type="number"
                placeholder="75.0"
                step="0.1"
                min="30"
                max="300"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                autoFocus
              />
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

const BmiGauge = ({ value, category }) => {
  const percent = value ? Math.min(Math.max(((value - 15) / 20) * 100, 0), 100) : 0;
  const angle = -90 + (percent * 1.8);

  return (
    <div className="bmi-gauge">
      <svg viewBox="0 0 240 135" role="img" aria-label={`BMI ${value?.toFixed(1) || 'not available'}, ${category || ''}`}>
        <path className="bmi-arc bmi-under" pathLength="100" d="M30 110 A90 90 0 0 1 210 110" />
        <path className="bmi-arc bmi-normal" pathLength="100" d="M30 110 A90 90 0 0 1 210 110" />
        <path className="bmi-arc bmi-overweight" pathLength="100" d="M30 110 A90 90 0 0 1 210 110" />
        <path className="bmi-arc bmi-obese" pathLength="100" d="M30 110 A90 90 0 0 1 210 110" />
        <line className="bmi-needle" x1="120" y1="110" x2="120" y2="42" transform={`rotate(${angle} 120 110)`} />
        <circle className="bmi-needle-hub" cx="120" cy="110" r="8" />
      </svg>
      <div className="bmi-gauge-copy">
        <strong>{value?.toFixed(1) || '-'}</strong>
        <span>{category || 'Add your body stats'}</span>
      </div>
      <div className="bmi-gauge-labels"><span>Under</span><span>Normal</span><span>Over</span><span>Obese</span></div>
    </div>
  );
};

const Progress = () => {
  const { user } = useAuth();
  const [weightLogs, setWeightLogs] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [bmiHistory, setBmiHistory] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const canLoadBmiHistory = Boolean(user?.height);
      const [weights, weekly, bmi, achievementData] = await Promise.all([
        api.getWeightLogs(30),
        api.getWeeklySummary(),
        canLoadBmiHistory ? api.getBMIHistory(30).catch(() => null) : Promise.resolve(null),
        api.getAchievements().catch(() => []),
      ]);
      setWeightLogs(weights);
      setWeeklyData(weekly);
      setBmiHistory(bmi);
      setAchievements(achievementData);
    } catch (err) {
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  }, [user?.height]);

  useEffect(() => { loadData(); }, [loadData]);
  useRefreshRegistration(loadData);

  const weightData = weightLogs.map((log) => ({
    date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: log.weight,
  }));

  const bmiData = (bmiHistory?.history || []).map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    bmi: point.bmi,
  }));

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : user?.current_weight;
  const startWeight = weightLogs.length > 0 ? weightLogs[0].weight : user?.current_weight;
  const weightChange = latestWeight && startWeight ? (latestWeight - startWeight).toFixed(1) : 0;
  const kgToGoal = latestWeight && user?.goal_weight ? Math.abs(latestWeight - user.goal_weight).toFixed(1) : '-';
  const latestBmi = bmiHistory?.latest_bmi;

  const streak = Math.min(weightLogs.length, 7);
  const currentWeek = weeklyData.slice(-7);
  const previousWeek = weeklyData.length >= 14 ? weeklyData.slice(-14, -7) : [];
  const averageCalories = (rows) => rows.length
    ? Math.round(rows.reduce((sum, row) => sum + (row.calories || 0), 0) / rows.length)
    : null;
  const currentAverage = averageCalories(currentWeek);
  const previousAverage = averageCalories(previousWeek);
  const averageChange = currentAverage !== null && previousAverage !== null ? currentAverage - previousAverage : null;

  const stats = [
    { icon: Flame, label: 'Day Streak', value: streak, color: 'var(--accent-amber)' },
    { icon: Scale, label: 'kg to Goal', value: kgToGoal, color: 'var(--accent-lime)' },
    { icon: TrendingDown, label: 'Weight Change', value: `${weightChange > 0 ? '+' : ''}${weightChange}kg`, color: weightChange < 0 ? 'var(--accent-lime)' : weightChange > 0 ? 'var(--accent-coral)' : 'var(--text-primary)' },
    { icon: Target, label: 'Goal Weight', value: `${user?.goal_weight || '-'}kg`, color: 'var(--accent-blue)' },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Progress</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowWeightModal(true)}>+ Weight</button>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
          </div>
        ) : (
          <>
            <section className="progress-hero animate-slide-up">
              <div>
                <span className="section-kicker">Latest weight</span>
                <h2>{latestWeight ? `${latestWeight} kg` : 'Start tracking'}</h2>
                <p className={Number(weightChange) <= 0 ? 'positive' : 'negative'}>
                  {weightLogs.length >= 2
                    ? `${Number(weightChange) > 0 ? '+' : ''}${weightChange} kg across your logged period`
                    : 'Log another entry to reveal your trend.'}
                </p>
              </div>
              <div className="progress-hero-mark"><Scale size={30} /></div>
            </section>

            <div className="progress-stats-grid animate-slide-up" style={{ marginBottom: 16 }}>
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="stat-card">
                    <div className="stat-card-icon"><Icon size={19} /></div>
                    <div className="stat-card-value" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="stat-card-label">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            {bmiHistory && (
              <div className="chart-container animate-slide-up" style={{ marginBottom: 16 }}>
                <div className="section-header">
                  <p className="chart-title" style={{ marginBottom: 0 }}>BMI Tracker</p>
                  <span className="badge badge-lime">{bmiHistory.bmi_category}</span>
                </div>
                <BmiGauge value={latestBmi} category={bmiHistory.bmi_category} />
                <p className="bmi-healthy-copy">Healthy weight range: <strong>{bmiHistory.healthy_weight_min} - {bmiHistory.healthy_weight_max} kg</strong></p>
                {bmiData.length >= 2 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={bmiData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={18.5} stroke="var(--accent-blue)" strokeDasharray="4 4" />
                      <ReferenceLine y={24.9} stroke="var(--accent-blue)" strokeDasharray="4 4" />
                      <Line
                        type="monotone"
                        dataKey="bmi"
                        stroke="var(--accent-lime)"
                        strokeWidth={2.5}
                        dot={{ fill: 'var(--accent-lime)', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: 'var(--accent-lime)', strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            <div className="chart-container animate-slide-up" style={{ marginBottom: 16 }}>
              <p className="chart-title">Weight Trend</p>
              {weightData.length < 2 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⚖️</div>
                  <h3>Not enough data yet</h3>
                  <p>Log your weight daily to see your trend.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weightData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="kg" />} />
                    {user?.goal_weight && (
                      <ReferenceLine y={user.goal_weight} stroke="var(--accent-lime)" strokeDasharray="4 4" label={{ value: 'Goal', fill: 'var(--accent-lime)', fontSize: 11 }} />
                    )}
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="var(--accent-blue)"
                      strokeWidth={2.5}
                      dot={{ fill: 'var(--accent-blue)', r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: 'var(--accent-blue)', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="chart-container animate-slide-up" style={{ marginBottom: 16 }}>
              <p className="chart-title">Weekly Calories vs Goal</p>
              {weeklyData.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <h3>No data yet</h3>
                  <p>Start logging meals to see your weekly trend.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="calGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-lime)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--accent-lime)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit=" kcal" />} />
                    {weeklyData[0]?.target && (
                      <ReferenceLine y={weeklyData[0].target} stroke="var(--accent-amber)" strokeDasharray="4 4" label={{ value: 'Target', fill: 'var(--accent-amber)', fontSize: 11 }} />
                    )}
                    <Area
                      type="monotone"
                      dataKey="calories"
                      stroke="var(--accent-lime)"
                      strokeWidth={2.5}
                      fill="url(#calGradient)"
                      dot={{ fill: 'var(--accent-lime)', r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: 'var(--accent-lime)', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <section className="comparison-card animate-slide-up">
              <div className="section-header">
                <div>
                  <span className="section-kicker">Comparison</span>
                  <h2 className="section-title">Daily calorie average</h2>
                </div>
                {averageChange !== null && (
                  <span className={`comparison-change ${averageChange <= 0 ? 'positive' : 'negative'}`}>
                    {averageChange > 0 ? '+' : ''}{averageChange} kcal
                  </span>
                )}
              </div>
              <div className="comparison-grid">
                <div><span>This week</span><strong>{currentAverage !== null ? currentAverage.toLocaleString() : '-'}</strong><small>kcal per day</small></div>
                <div><span>Last week</span><strong>{previousAverage !== null ? previousAverage.toLocaleString() : '-'}</strong><small>{previousAverage !== null ? 'kcal per day' : 'Keep logging'}</small></div>
              </div>
            </section>

            {achievements.length > 0 && (
              <section className="achievement-wall animate-slide-up">
                <div className="section-header">
                  <div>
                    <span className="section-kicker">Milestones</span>
                    <h2 className="section-title">Achievement wall</h2>
                  </div>
                  <span className="badge badge-lime">{achievements.filter((item) => item.unlocked).length} unlocked</span>
                </div>
                <div className="achievement-wall-grid">
                  {achievements.slice(0, 8).map((achievement, index) => (
                    <article
                      className={`progress-achievement ${achievement.unlocked ? 'unlocked animate-badge-unlock' : 'locked'}`}
                      key={achievement.key}
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <span className="progress-achievement-icon">{achievement.unlocked ? achievement.icon : <Lock size={20} />}</span>
                      <strong>{achievement.name}</strong>
                      <small>{achievement.unlocked ? 'Unlocked' : `${achievement.progress.current}/${achievement.progress.target}`}</small>
                      {achievement.unlocked && index === 0 && <i>New</i>}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {weightLogs.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '16px', marginBottom: 16 }}>
                <p className="chart-title" style={{ marginBottom: 12 }}>Weight History</p>
                {[...weightLogs].reverse().slice(0, 10).map((log, i) => (
                  <div key={log.id} className="stat-row">
                    <span className="stat-label">
                      {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="stat-value" style={{ color: i === 0 ? 'var(--accent-lime)' : 'var(--text-primary)' }}>
                      {log.weight} kg {i === 0 && '<- latest'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {user?.bmr && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '16px', marginBottom: 16 }}>
                <p className="chart-title" style={{ marginBottom: 12 }}>Your Metrics</p>
                {[
                  { label: 'BMR (Basal Metabolic Rate)', val: `${Math.round(user.bmr)} kcal` },
                  { label: 'TDEE (Total Daily Energy)', val: `${Math.round(user.tdee)} kcal` },
                  { label: 'Daily Calorie Target', val: `${Math.round(user.calorie_target)} kcal` },
                  { label: 'Protein Target', val: `${Math.round(user.protein_target)}g` },
                  { label: 'Carbs Target', val: `${Math.round(user.carbs_target)}g` },
                  { label: 'Fat Target', val: `${Math.round(user.fat_target)}g` },
                ].map((metric) => (
                  <div key={metric.label} className="stat-row">
                    <span className="stat-label">{metric.label}</span>
                    <span className="stat-value">{metric.val}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showWeightModal && (
        <LogWeightModal onClose={() => setShowWeightModal(false)} onSave={loadData} />
      )}
    </div>
  );
};

export default Progress;
