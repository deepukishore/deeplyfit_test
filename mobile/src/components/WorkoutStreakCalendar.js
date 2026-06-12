import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../utils/api';
import { colors, spacing } from '../utils/theme';

const WorkoutStreakCalendar = () => {
  const [streakData, setStreakData] = useState({ current_streak: 0, best_streak: 0 });
  const [calendar, setCalendar] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [streak, cal] = await Promise.all([api.getWorkoutStreak(), api.getWorkoutCalendar()]);
        setStreakData(streak); setCalendar(cal);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <Text style={{ color: colors.textMuted, padding: 16 }}>Loading...</Text>;

  const today = new Date();
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (89 - i));
    return d;
  });

  const getColor = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const count = calendar[dateStr] || 0;
    if (count === 0) return colors.bgElevated;
    if (count === 1) return '#90EE90';
    if (count === 2) return '#32CD32';
    return '#228B22';
  };

  return (
    <View style={s.container}>
      <View style={s.streakRow}>
        <View style={s.streakBox}>
          <Text style={s.streakLabel}>Current</Text>
          <Text style={[s.streakNum, { color: colors.accentLime }]}>{streakData.current_streak}d</Text>
        </View>
        <View style={s.streakBox}>
          <Text style={s.streakLabel}>Personal Best</Text>
          <Text style={[s.streakNum, { color: colors.accentAmber }]}>{streakData.best_streak}d</Text>
        </View>
      </View>
      <Text style={s.subLabel}>Past 90 days</Text>
      <View style={s.grid}>
        {days.map((day, i) => {
          const dateStr = day.toISOString().split('T')[0];
          const isToday = dateStr === today.toISOString().split('T')[0];
          return (
            <View key={i} style={[s.cell, { backgroundColor: getColor(day) }, isToday && s.cellToday]} />
          );
        })}
      </View>
      <View style={s.legend}>
        {[{ color: colors.bgElevated, label: 'None' }, { color: '#90EE90', label: '1' }, { color: '#32CD32', label: '2' }, { color: '#228B22', label: '3+' }].map((item) => (
          <View key={item.label} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: item.color }]} />
            <Text style={s.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { paddingVertical: spacing.lg },
  streakRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  streakBox: {},
  streakLabel: { color: colors.textSecondary, fontSize: 13 },
  streakNum: { fontSize: 24, fontWeight: '800' },
  subLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: 20, height: 20, borderRadius: 3 },
  cellToday: { borderWidth: 2, borderColor: colors.accentLime },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 2 },
  legendText: { fontSize: 12, color: colors.textMuted },
});

export default WorkoutStreakCalendar;
