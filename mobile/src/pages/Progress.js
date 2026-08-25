import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, RefreshControl, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line as SvgLine, Path, Polyline } from 'react-native-svg';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { isPro } from '../utils/premium';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { formatDate } from '../utils/fitness';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';
import AppBackdrop from '../components/AppBackdrop';
import { MotionPressable, MotionView } from '../components/Motion';

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

const gaugePoint = (fraction, radius = 90) => {
  const radians = (180 + (Math.min(Math.max(fraction, 0), 1) * 180)) * (Math.PI / 180);
  return {
    x: 120 + (radius * Math.cos(radians)),
    y: 110 + (radius * Math.sin(radians)),
  };
};

const gaugeArc = (start, end) => {
  const startPoint = gaugePoint(start);
  const endPoint = gaugePoint(end);
  return `M ${startPoint.x} ${startPoint.y} A 90 90 0 0 1 ${endPoint.x} ${endPoint.y}`;
};

const BmiGauge = ({ value, category }) => {
  const numericValue = Number(value);
  const fraction = Number.isFinite(numericValue) ? Math.min(Math.max((numericValue - 15) / 20, 0), 1) : 0.5;
  const needle = gaugePoint(fraction, 64);

  return (
    <View style={s.bmiGauge}>
      <Svg width="240" height="132" viewBox="0 0 240 132">
        <Path d={gaugeArc(0, 0.175)} fill="none" stroke={colors.accentBlue} strokeWidth="20" strokeLinecap="butt" />
        <Path d={gaugeArc(0.175, 0.5)} fill="none" stroke={colors.accentPurple} strokeWidth="20" strokeLinecap="butt" />
        <Path d={gaugeArc(0.5, 0.75)} fill="none" stroke={colors.accentAmber} strokeWidth="20" strokeLinecap="butt" />
        <Path d={gaugeArc(0.75, 1)} fill="none" stroke={colors.accentCoral} strokeWidth="20" strokeLinecap="butt" />
        <SvgLine x1="120" y1="110" x2={needle.x} y2={needle.y} stroke={colors.textPrimary} strokeWidth="4" strokeLinecap="round" />
        <Circle cx="120" cy="110" r="8" fill={colors.textPrimary} />
      </Svg>
      <View style={s.bmiGaugeCopy}>
        <Text style={s.bmiValue}>{Number.isFinite(numericValue) ? numericValue.toFixed(1) : '-'}</Text>
        <Text style={s.bmiCategory}>{category || 'Add your body stats'}</Text>
      </View>
      <View style={s.bmiLabels}>
        <Text style={s.bmiLabel}>Under</Text>
        <Text style={s.bmiLabel}>Normal</Text>
        <Text style={s.bmiLabel}>Over</Text>
        <Text style={s.bmiLabel}>Obese</Text>
      </View>
    </View>
  );
};

const TrendLineChart = ({ values, color, height = CHART_HEIGHT }) => {
  const numericValues = values.map(Number).filter(Number.isFinite);
  if (numericValues.length < 2) return null;
  const padding = 15;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min || 1;
  const isFlat = max === min;
  const usableWidth = CHART_WIDTH - (padding * 2);
  const usableHeight = height - (padding * 2);
  const points = numericValues.map((value, index) => ({
    x: padding + ((index / (numericValues.length - 1)) * usableWidth),
    y: padding + ((isFlat ? 0.5 : (max - value) / range) * usableHeight),
  }));

  return (
    <Svg width={CHART_WIDTH} height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`}>
      {[0.25, 0.5, 0.75].map((fraction) => (
        <SvgLine key={fraction} x1={padding} x2={CHART_WIDTH - padding} y1={height * fraction} y2={height * fraction} stroke={colors.border} strokeWidth="1" strokeDasharray="4 5" />
      ))}
      <Polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((point, index) => <Circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="4" fill={color} />)}
    </Svg>
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
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const scrollRef = useRef(null);

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  const loadData = useCallback(async () => {
    try {
      const [weights, weekly, bmi, achievementData] = await Promise.all([
        api.getWeightLogs(30),
        api.getWeeklySummary(),
        user?.height ? api.getBMIHistory(30).catch(() => null) : Promise.resolve(null),
        api.getAchievements().catch(() => []),
      ]);
      setWeightLogs(weights);
      setWeeklyData(weekly);
      setBmiHistory(bmi);
      setAchievements(achievementData);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load progress data' });
    } finally {
      setLoading(false);
    }
  }, [user?.height]);

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
  const currentWeek = weeklyData.slice(-7);
  const previousWeek = weeklyData.length >= 14 ? weeklyData.slice(-14, -7) : [];
  const averageCalories = (rows) => rows.length
    ? Math.round(rows.reduce((sum, row) => sum + Number(row.calories || 0), 0) / rows.length)
    : null;
  const currentAverage = averageCalories(currentWeek);
  const previousAverage = averageCalories(previousWeek);
  const averageChange = currentAverage !== null && previousAverage !== null ? currentAverage - previousAverage : null;

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
      <AppBackdrop />
      <View style={s.header}>
        <Text style={s.headerTitle}>Progress</Text>
        <MotionPressable style={s.addBtn} onPress={() => setShowWeightModal(true)}>
          <Text style={s.addBtnText}>+ Weight</Text>
        </MotionPressable>
      </View>

      <View style={s.proBanner}>
        <Text style={s.proBannerText}>
          {isPro(user)
            ? 'PRO • 90-day analytics, heatmaps, and deep trends'
            : 'FREE • Basic charts only — upgrade for full analytics'}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentLime} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.accentLime} style={{ marginTop: 40 }} />
        ) : (
          <>
            <MotionView style={s.statsGrid} delay={30}>
              {stats.map((stat, index) => (
                <MotionView depth accentColor={index % 2 ? colors.glowBlue : colors.glowPurple} key={stat.label} style={s.statCard} delay={50 + (index * 40)} variant="fade">
                  <Text style={{ fontSize: 24 }}>{stat.icon}</Text>
                  <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </MotionView>
              ))}
            </MotionView>

            <MotionView depth style={s.chartCard} delay={130}>
              <View style={s.rowBetween}>
                <Text style={s.chartTitle}>BMI Tracker</Text>
                {!!bmiHistory?.bmi_category && <Text style={s.badge}>{bmiHistory.bmi_category}</Text>}
              </View>
              <BmiGauge value={bmiHistory?.latest_bmi} category={bmiHistory?.bmi_category} />
              <Text style={s.bmiHealthyCopy}>
                {bmiHistory
                  ? `Healthy weight range: ${bmiHistory.healthy_weight_min} - ${bmiHistory.healthy_weight_max} kg`
                  : 'Add your height in Profile and log your weight to calculate BMI.'}
              </Text>
            </MotionView>

            <MotionView depth accentColor={colors.glowBlue} style={s.chartCard} delay={180}>
              <Text style={s.chartTitle}>Weight Trend</Text>
              {weightValues.length < 2 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyIcon}>⚖️</Text>
                  <Text style={s.emptyTitle}>Not enough data yet</Text>
                  <Text style={s.emptyText}>Log your weight daily to see your trend.</Text>
                </View>
              ) : (
                <>
                  <TrendLineChart values={weightValues} color={colors.accentBlue} />
                  <View style={s.chartLabels}>
                    <Text style={s.chartLabel}>{weightLogs[0]?.date?.slice(5)}</Text>
                    <Text style={s.chartLabel}>{weightLogs[weightLogs.length - 1]?.date?.slice(5)}</Text>
                  </View>
                </>
              )}
            </MotionView>

            <MotionView depth accentColor="rgba(245,166,35,0.14)" style={s.chartCard} delay={230}>
              <Text style={s.chartTitle}>Weekly Calories vs Goal</Text>
              {calorieValues.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyIcon}>📊</Text>
                  <Text style={s.emptyTitle}>No data yet</Text>
                  <Text style={s.emptyText}>Start logging meals to see your weekly trend.</Text>
                </View>
              ) : (
                <>
                  <MiniChart values={calorieValues} barColor={colors.accentLime} fillColor="rgba(168,85,247,0.28)" />
                  <View style={s.chartLabels}>
                    <Text style={s.chartLabel}>{weeklyData[0]?.date}</Text>
                    <Text style={s.chartLabel}>{weeklyData[weeklyData.length - 1]?.date}</Text>
                  </View>
                </>
              )}
            </MotionView>

            <MotionView depth style={s.comparisonCard} delay={280}>
              <View style={s.comparisonHeader}>
                <View>
                  <Text style={s.sectionKicker}>Comparison</Text>
                  <Text style={s.chartTitle}>Daily calorie average</Text>
                </View>
                {averageChange !== null && (
                  <Text style={[s.comparisonChange, { color: averageChange <= 0 ? colors.accentLime : colors.accentCoral }]}>
                    {averageChange > 0 ? '+' : ''}{averageChange} kcal
                  </Text>
                )}
              </View>
              <View style={s.comparisonGrid}>
                <View style={[s.comparisonTile, { marginRight: 7 }]}>
                  <Text style={s.comparisonLabel}>This week</Text>
                  <Text style={s.comparisonValue}>{currentAverage !== null ? currentAverage.toLocaleString() : '-'}</Text>
                  <Text style={s.comparisonMeta}>kcal per day</Text>
                </View>
                <View style={s.comparisonTile}>
                  <Text style={s.comparisonLabel}>Last week</Text>
                  <Text style={s.comparisonValue}>{previousAverage !== null ? previousAverage.toLocaleString() : '-'}</Text>
                  <Text style={s.comparisonMeta}>{previousAverage !== null ? 'kcal per day' : 'Keep logging'}</Text>
                </View>
              </View>
            </MotionView>

            {achievements.length > 0 && (
              <MotionView depth accentColor="rgba(245,166,35,0.14)" style={s.achievementWall} delay={330}>
                <View style={s.achievementHeader}>
                  <View>
                    <Text style={s.sectionKicker}>Milestones</Text>
                    <Text style={s.chartTitle}>Achievement wall</Text>
                  </View>
                  <Text style={s.badge}>{achievements.filter((item) => item.unlocked).length} unlocked</Text>
                </View>
                <View style={s.achievementGrid}>
                  {achievements.slice(0, 8).map((achievement, index) => (
                    <MotionView key={achievement.key} style={[s.achievementCard, achievement.unlocked && s.achievementUnlocked]} delay={360 + (index * 45)} variant="fade" layout>
                      <Text style={s.achievementIcon}>{achievement.unlocked ? achievement.icon : '🔒'}</Text>
                      <Text style={s.achievementName}>{achievement.name}</Text>
                      <Text style={s.achievementProgress}>{achievement.unlocked ? 'Unlocked' : `${achievement.progress?.current || 0}/${achievement.progress?.target || 0}`}</Text>
                    </MotionView>
                  ))}
                </View>
              </MotionView>
            )}

            {weightLogs.length > 0 && (
              <MotionView depth accentColor={colors.glowBlue} style={s.card} delay={380}>
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
              </MotionView>
            )}

            {user?.bmr && (
              <MotionView depth style={s.card} delay={430}>
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
              </MotionView>
            )}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <LogWeightModal visible={showWeightModal} onClose={() => setShowWeightModal(false)} onSave={loadData} />
    </View>
  );
};

const s = createThemedStyles(() => ({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: 56,
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  addBtn: { backgroundColor: colors.accentLime, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 12 },
  proBanner: { paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 2 },
  proBannerText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl },
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
    shadowColor: '#48236f',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 3 },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  chartCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#48236f', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  chartCanvas: { width: CHART_WIDTH, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 3 },
  bar: { width: '100%', borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.95 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLabel: { fontSize: 11, color: colors.textMuted },
  bmiGauge: { alignItems: 'center', marginTop: 4 },
  bmiGaugeCopy: { position: 'absolute', top: 66, left: 0, right: 0, alignItems: 'center' },
  bmiValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
  bmiCategory: { color: colors.textMuted, fontSize: 9, marginTop: 1 },
  bmiLabels: { width: 244, flexDirection: 'row', justifyContent: 'space-between', marginTop: -7 },
  bmiLabel: { color: colors.textMuted, fontSize: 8 },
  bmiHealthyCopy: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 13 },
  emptyState: { minHeight: 155, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 32, marginBottom: 9 },
  emptyTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  emptyText: { color: colors.textMuted, fontSize: 10, marginTop: 5, textAlign: 'center' },
  comparisonCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#48236f', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  comparisonHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionKicker: { color: colors.accentPurple, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  comparisonChange: { fontSize: 10, fontWeight: '800' },
  comparisonGrid: { flexDirection: 'row' },
  comparisonTile: { flex: 1, minHeight: 89, backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  comparisonLabel: { color: colors.textMuted, fontSize: 9 },
  comparisonValue: { color: colors.accentPurple, fontSize: 23, fontWeight: '900', marginTop: 8 },
  comparisonMeta: { color: colors.textMuted, fontSize: 8, marginTop: 5 },
  achievementWall: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#48236f', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  achievementHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievementCard: { width: '48%', minHeight: 94, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: 9, borderWidth: 1, borderColor: colors.border, opacity: 0.62 },
  achievementUnlocked: { opacity: 1, borderColor: colors.accentPurple, backgroundColor: colors.glowPurple },
  achievementIcon: { fontSize: 20, marginBottom: 6 },
  achievementName: { color: colors.textSecondary, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  achievementProgress: { color: colors.textMuted, fontSize: 8, marginTop: 5 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#48236f', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
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
}));

export default Progress;
