import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, RefreshControl, Dimensions } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { formatDate } from '../utils/fitness';
import { colors, radius, spacing } from '../utils/theme';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 160;

const MiniChart = ({ values, barColor, fillColor, height = CHART_HEIGHT }) => {
  if (!values.length) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <View style={[s.chartCanvas, { height }]}>
      {values.map((value, index) => {
        const normalized = values.length > 1 ? (value - min) / range : 0.5;
        const barHeight = Math.max(18, normalized * (height - 36));
        return (
          <View key={`${index}-${value}`} style={s.barSlot}>
            <View style={[s.bar, { height: barHeight, backgroundColor: fillColor, borderColor: barColor }]} />
          </View>
        );
      })}
    </View>
  );
};

const LogWeightModal = ({ visible, onClose, onSave }) => {
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const today = formatDate(new Date());

  const handleSave = async () => {
    const parsedWeight = parseFloat(weight);

    if (!weight || parsedWeight < 30 || parsedWeight > 300) {
      Toast.show({ type: 'error', text1: 'Enter a valid weight (30-300 kg)' });
      return;
    }

    setLoading(true);
    try {
      await api.logWeight({ date: today, weight: parsedWeight });
      Toast.show({ type: 'success', text1: 'Weight logged' });
      onSave();
      onClose();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.modalTitle}>Log Today's Weight</Text>
          <View style={s.inputGroup}>
            <Text style={s.label}>Weight (kg)</Text>
            <TextInput
              style={s.input}
              placeholder="75.0"
              placeholderTextColor={colors.textMuted}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              autoFocus
            />
          </View>
          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Log Weight</Text>}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const Progress = () => {
  const { user } = useAuth();
  const [weightLogs, setWeightLogs] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [bmiHistory, setBmiHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [weights, weekly, bmi] = await Promise.all([
        api.getWeightLogs(30),
        api.getWeeklySummary(),
        api.getBMIHistory(30).catch(() => null),
      ]);
      setWeightLogs(weights);
      setWeeklyData(weekly);
      setBmiHistory(bmi);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load progress data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useRefreshRegistration(loadData);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : user?.current_weight;
  const startWeight = weightLogs.length > 0 ? weightLogs[0].weight : user?.current_weight;
  const weightChange = latestWeight && startWeight ? (latestWeight - startWeight).toFixed(1) : 0;
  const kgToGoal = latestWeight && user?.goal_weight ? Math.abs(latestWeight - user.goal_weight).toFixed(1) : '-';
  const streak = Math.min(weightLogs.length, 7);

  const weightValues = weightLogs.map((log) => log.weight);
  const calorieValues = weeklyData.map((day) => day.calories || 0);

  const stats = [
    { icon: '🔥', label: 'Day Streak', value: streak, color: colors.accentAmber },
    { icon: '⚖️', label: 'kg to Goal', value: kgToGoal, color: colors.accentLime },
    {
      icon: '📉',
      label: 'Weight Change',
      value: `${weightChange > 0 ? '+' : ''}${weightChange}kg`,
      color: weightChange < 0 ? colors.accentLime : weightChange > 0 ? colors.accentCoral : colors.textPrimary,
    },
    { icon: '🎯', label: 'Goal Weight', value: `${user?.goal_weight || '-'}kg`, color: colors.accentBlue },
  ];

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Progress</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowWeightModal(true)}>
          <Text style={s.addBtnText}>+ Weight</Text>
        </TouchableOpacity>
      </View>

      <View style={s.proBanner}>
        <Text style={s.proBannerText}>
          {user?.premium_status === 'active'
            ? 'PRO • 90-day analytics, heatmaps, and deep trends'
            : 'FREE • Basic charts only — upgrade for full analytics'}
        </Text>
      </View>

      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentLime} />}>
        {loading ? (
          <ActivityIndicator color={colors.accentLime} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={s.statsGrid}>
              {stats.map((stat) => (
                <View key={stat.label} style={s.statCard}>
                  <Text style={{ fontSize: 24 }}>{stat.icon}</Text>
                  <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {weightValues.length >= 2 && (
              <View style={s.chartCard}>
                <Text style={s.chartTitle}>Weight Trend</Text>
                <MiniChart values={weightValues} barColor={colors.accentBlue} fillColor="rgba(79,172,254,0.28)" />
                <View style={s.chartLabels}>
                  <Text style={s.chartLabel}>{weightLogs[0]?.date?.slice(5)}</Text>
                  <Text style={s.chartLabel}>{weightLogs[weightLogs.length - 1]?.date?.slice(5)}</Text>
                </View>
              </View>
            )}

            {calorieValues.length >= 2 && (
              <View style={s.chartCard}>
                <Text style={s.chartTitle}>Weekly Calories vs Goal</Text>
                <MiniChart values={calorieValues} barColor={colors.accentLime} fillColor="rgba(168,85,247,0.28)" />
                <View style={s.chartLabels}>
                  <Text style={s.chartLabel}>{weeklyData[0]?.date?.slice(5)}</Text>
                  <Text style={s.chartLabel}>{weeklyData[weeklyData.length - 1]?.date?.slice(5)}</Text>
                </View>
              </View>
            )}

            {bmiHistory && (
              <View style={s.card}>
                <View style={s.rowBetween}>
                  <Text style={s.chartTitle}>BMI Tracker</Text>
                  <Text style={s.badge}>{bmiHistory.bmi_category}</Text>
                </View>
                <View style={s.rowBetween}>
                  <View>
                    <Text style={s.statLabel}>Current BMI</Text>
                    <Text style={[s.statValue, { color: colors.accentLime }]}>{bmiHistory.latest_bmi?.toFixed(1)}</Text>
                  </View>
                  <View>
                    <Text style={s.statLabel}>Healthy range</Text>
                    <Text style={s.statValue}>
                      {bmiHistory.healthy_weight_min} - {bmiHistory.healthy_weight_max} kg
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {weightLogs.length > 0 && (
              <View style={s.card}>
                <Text style={s.chartTitle}>Weight History</Text>
                {[...weightLogs]
                  .reverse()
                  .slice(0, 10)
                  .map((log, index) => (
                    <View key={log.id} style={s.statRow}>
                      <Text style={s.statLabel}>
                        {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={[s.statValue, index === 0 && { color: colors.accentLime }]}>
                        {log.weight} kg {index === 0 ? '← latest' : ''}
                      </Text>
                    </View>
                  ))}
              </View>
            )}

            {user?.bmr && (
              <View style={s.card}>
                <Text style={s.chartTitle}>Your Metrics</Text>
                {[
                  { label: 'BMR', val: `${Math.round(user.bmr)} kcal` },
                  { label: 'TDEE', val: `${Math.round(user.tdee)} kcal` },
                  { label: 'Calorie Target', val: `${Math.round(user.calorie_target)} kcal` },
                  { label: 'Protein Target', val: `${Math.round(user.protein_target)}g` },
                  { label: 'Carbs Target', val: `${Math.round(user.carbs_target)}g` },
                  { label: 'Fat Target', val: `${Math.round(user.fat_target)}g` },
                ].map((metric) => (
                  <View key={metric.label} style={s.statRow}>
                    <Text style={s.statLabel}>{metric.label}</Text>
                    <Text style={s.statValue}>{metric.val}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <LogWeightModal visible={showWeightModal} onClose={() => setShowWeightModal(false)} onSave={loadData} />
    </View>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: 56,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  addBtn: { backgroundColor: colors.accentLime, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 12 },
  proBanner: { paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 2 },
  proBannerText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  scroll: { flex: 1, padding: spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 3 },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  chartCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  chartTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  chartCanvas: { width: CHART_WIDTH, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 3 },
  bar: { width: '100%', borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.95 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLabel: { fontSize: 11, color: colors.textMuted },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: {
    backgroundColor: 'rgba(200,241,53,0.12)',
    color: colors.accentLime,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '700',
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, color: colors.textSecondary, marginBottom: 5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { backgroundColor: colors.bgElevated, borderRadius: 10, padding: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});

export default Progress;
