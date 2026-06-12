import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';
import '../styles/dashboard.css';

const WorkoutStreakCalendar = () => {
  const [streakData, setStreakData] = useState({
    current_streak: 0,
    best_streak: 0,
  });
  const [calendar, setCalendar] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [streak, cal] = await Promise.all([api.getWorkoutStreak(), api.getWorkoutCalendar()]);
        setStreakData(streak);
        setCalendar(cal);
      } catch (err) {
        console.error('Failed to fetch streak data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const today = useMemo(() => new Date(), []);

  if (loading) {
    return <div style={{ padding: '1rem', textAlign: 'center' }}>Loading...</div>;
  }

  const days = [];
  for (let i = 89; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(date);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getColorForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const workoutCount = calendar[dateStr] || 0;

    if (workoutCount === 0) return 'var(--bg-elevated)';
    if (workoutCount === 1) return 'rgba(74, 222, 128, 0.35)';
    if (workoutCount === 2) return 'rgba(74, 222, 128, 0.7)';
    return 'var(--accent-lime)';
  };

  const getTooltip = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const workoutCount = calendar[dateStr] || 0;
    if (workoutCount === 0) return 'No workouts';
    return `${workoutCount} workout${workoutCount > 1 ? 's' : ''}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>💪 Workout Streaks</h3>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.95rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Current</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-lime)' }}>
                {streakData.current_streak}d
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Personal Best</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-amber)' }}>
                {streakData.best_streak}d
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Past 90 days
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {weeks.map((week, weekIdx) =>
          week.map((day, dayIdx) => {
            const dateStr = day.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={`${weekIdx}-${dayIdx}`}
                title={getTooltip(day)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '3px',
                  backgroundColor: getColorForDay(day),
                  border: isToday ? '2px solid var(--accent-amber)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.transform = 'scale(1.2)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.transform = 'scale(1)';
                }}
              />
            );
          })
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: 'var(--bg-elevated)' }} />
          <span>No activity</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: 'rgba(74, 222, 128, 0.35)' }} />
          <span>1 workout</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: 'rgba(74, 222, 128, 0.7)' }} />
          <span>2 workouts</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: 'var(--accent-lime)' }} />
          <span>3+ workouts</span>
        </div>
      </div>
    </div>
  );
};

export default WorkoutStreakCalendar;
