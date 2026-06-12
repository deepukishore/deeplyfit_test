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

const Progress = () => {
  const { user } = useAuth();
  const [weightLogs, setWeightLogs] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [bmiHistory, setBmiHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const canLoadBmiHistory = Boolean(user?.height);
      const [weights, weekly, bmi] = await Promise.all([
        api.getWeightLogs(30),
        api.getWeeklySummary(),
        canLoadBmiHistory ? api.getBMIHistory(30).catch(() => null) : Promise.resolve(null),
      ]);
      setWeightLogs(weights);
      setWeeklyData(weekly);
      setBmiHistory(bmi);
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
  const bmiMarker = latestBmi ? Math.min(Math.max(((latestBmi - 15) / 20) * 100, 0), 100) : 0;
  const healthyStart = ((18.5 - 15) / 20) * 100;
  const healthyWidth = ((24.9 - 18.5) / 20) * 100;

  const streak = Math.min(weightLogs.length, 7);

  const stats = [
    { icon: '🔥', label: 'Day Streak', value: streak, color: 'var(--accent-amber)' },
    { icon: '⚖️', label: 'kg to Goal', value: kgToGoal, color: 'var(--accent-lime)' },
    { icon: '📉', label: 'Weight Change', value: `${weightChange > 0 ? '+' : ''}${weightChange}kg`, color: weightChange < 0 ? 'var(--accent-lime)' : weightChange > 0 ? 'var(--accent-coral)' : 'var(--text-primary)' },
    { icon: '🎯', label: 'Goal Weight', value: `${user?.goal_weight || '-'}kg`, color: 'var(--accent-blue)' },
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
            <div className="progress-stats-grid animate-slide-up" style={{ marginBottom: 16 }}>
              {stats.map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-card-icon">{stat.icon}</div>
                  <div className="stat-card-value" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="stat-card-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {bmiHistory && (
              <div className="chart-container animate-slide-up" style={{ marginBottom: 16 }}>
                <div className="section-header">
                  <p className="chart-title" style={{ marginBottom: 0 }}>BMI Tracker</p>
                  <span className="badge badge-lime">{bmiHistory.bmi_category}</span>
                </div>
                <div className="bmi-summary-row">
                  <div>
                    <p className="bmi-summary-label">Current BMI</p>
                    <div className="bmi-summary-value">{latestBmi?.toFixed(1)}</div>
                  </div>
                  <div>
                    <p className="bmi-summary-label">Healthy weight range</p>
                    <div className="bmi-summary-meta">{bmiHistory.healthy_weight_min} - {bmiHistory.healthy_weight_max} kg</div>
                  </div>
                </div>
                <div className="bmi-range-visual">
                  <div className="bmi-range-track">
                    <div className="bmi-range-good" style={{ left: `${healthyStart}%`, width: `${healthyWidth}%` }} />
                    <div className="bmi-range-marker" style={{ left: `${bmiMarker}%` }} />
                  </div>
                  <div className="bmi-range-labels">
                    <span>15</span>
                    <span>18.5</span>
                    <span>24.9</span>
                    <span>35</span>
                  </div>
                </div>
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
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
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
