import React from 'react';
import { Activity, Droplets, Flame, Footprints, HeartPulse, MapPin, Scale, Utensils } from 'lucide-react';


const HealthOverview = ({ user, summary, stepLog, history = [], goal = 10000, onEditGoal, onOpenProgress }) => {
  const steps = Number(stepLog?.steps || 0);
  const dailyGoal = Math.max(500, Math.min(Math.round(Number(goal) || 10000), 100000));
  const progress = Math.min((steps / dailyGoal) * 100, 100);
  const heightM = Number(user?.height || 0) / 100;
  const weight = Number(user?.current_weight || 0);
  const bmi = heightM > 0 && weight > 0 ? (weight / (heightM * heightM)).toFixed(1) : null;
  const maxHistory = Math.max(...history.map((entry) => Number(entry.steps || 0)), dailyGoal);
  const source = stepLog?.source === 'health_connect'
    ? 'Health Connect'
    : stepLog?.source === 'apple_motion'
      ? 'Apple Motion'
      : stepLog?.source === 'device_pedometer'
        ? 'Device pedometer'
        : 'Connect the mobile app';

  const metrics = [
    { icon: MapPin, label: 'Distance', value: `${(steps * 0.00076).toFixed(1)} km` },
    { icon: Flame, label: 'Walk burn', value: `~${Math.round(steps * 0.04)} kcal` },
    { icon: Droplets, label: 'Hydration', value: `${summary?.water_glasses || 0} glasses` },
    { icon: Scale, label: 'Weight', value: weight ? `${weight} kg` : 'Not logged' },
  ];

  return (
    <section className="health-overview-card animate-slide-up" aria-labelledby="health-overview-title">
      <div className="health-overview-head">
        <div>
          <span className="section-kicker">Health today</span>
          <h2 id="health-overview-title">Activity & key metrics</h2>
          <p>{source}</p>
        </div>
        <span className="health-overview-icon"><HeartPulse size={24} /></span>
      </div>

      <div className="health-steps-row">
        <div>
          <span>Steps</span>
          <strong>{steps.toLocaleString()}</strong>
          <div className="health-step-goal-row">
            <small>of {dailyGoal.toLocaleString()} daily goal</small>
            <button type="button" onClick={onEditGoal}>Edit goal</button>
          </div>
        </div>
        <div className="health-step-percent"><strong>{Math.round(progress)}%</strong><span>complete</span></div>
      </div>
      <div className="health-step-track" role="progressbar" aria-label="Daily step goal" aria-valuemin="0" aria-valuemax={dailyGoal} aria-valuenow={Math.min(steps, dailyGoal)}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="health-metric-grid">
        {metrics.map(({ icon: Icon, label, value }) => (
          <article key={label}>
            <Icon size={19} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="health-focus-head">
        <h3>Focus areas</h3>
        <button type="button" onClick={onOpenProgress}>View details →</button>
      </div>
      <div className="health-focus-grid">
        <article><Footprints size={19} /><strong>Fitness</strong><span>{steps ? `${steps.toLocaleString()} steps` : 'Ready to track'}</span></article>
        <article><Utensils size={19} /><strong>Nutrition</strong><span>{summary?.calories_consumed ? `${Math.round(summary.calories_consumed)} kcal` : 'Not tracked today'}</span></article>
        <article><Activity size={19} /><strong>Exercise</strong><span>{summary?.workouts?.length ? `${summary.workouts.length} logged` : 'Not tracked today'}</span></article>
        <article><Scale size={19} /><strong>Body metrics</strong><span>{bmi ? `BMI ${bmi}` : 'Complete profile'}</span></article>
      </div>

      <div className="health-weekly-strip" aria-label="Seven day step history">
        {history.length ? history.slice(-7).map((entry) => (
          <span key={entry.date} title={`${entry.date}: ${entry.steps} steps`}>
            <i style={{ height: `${Math.max(8, (Number(entry.steps || 0) / maxHistory) * 100)}%` }} />
            <small>{new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' })}</small>
          </span>
        )) : <p>Open Deeply Fit on your phone and connect steps to begin your activity history.</p>}
      </div>
    </section>
  );
};

export default HealthOverview;
