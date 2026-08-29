import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AnimatedProgressFill, MotionPressable, MotionView } from './Motion';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';


const HealthDashboardCard = ({ counter, summary, user, onEditGoal, onOpenProgress }) => {
  const water = Number(summary?.water_glasses || 0);
  const workouts = summary?.workouts?.length || 0;
  const caloriesConsumed = Math.round(summary?.calories_consumed || 0);
  const latestWeight = Number(user?.current_weight || 0);
  const heightM = Number(user?.height || 0) / 100;
  const bmi = latestWeight > 0 && heightM > 0 ? (latestWeight / (heightM * heightM)).toFixed(1) : null;
  const sourceLabel = counter.source === 'health_connect'
    ? 'Health Connect'
    : counter.source === 'apple_motion'
      ? 'Apple Motion'
      : counter.source === 'device_pedometer'
        ? 'Device pedometer'
        : 'Not connected';

  const focusAreas = [
    { icon: '🏃', label: 'Fitness', value: counter.steps > 0 ? `${counter.steps.toLocaleString()} steps` : 'Ready to track' },
    { icon: '🍎', label: 'Nutrition', value: caloriesConsumed > 0 ? `${caloriesConsumed} kcal logged` : 'Not tracked today' },
    { icon: '💧', label: 'Hydration', value: water > 0 ? `${water} glasses` : 'Not tracked today' },
    { icon: '⚖️', label: 'Weight', value: latestWeight > 0 ? `${latestWeight} kg` : 'Add in Profile' },
  ];

  return (
    <MotionView depth accentColor={colors.glowPurple} style={s.card} delay={35}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>HEALTH TODAY</Text>
          <Text style={s.title}>Activity & key metrics</Text>
          <Text style={s.source}>{sourceLabel}</Text>
        </View>
        <View style={s.stepBadge}>
          <Text style={s.stepBadgeIcon}>👟</Text>
        </View>
      </View>

      <View style={s.stepHero}>
        <View style={s.stepCopy}>
          <Text style={s.stepLabel}>Steps</Text>
          <Text style={s.stepValue}>{counter.steps.toLocaleString()}</Text>
          <View style={s.stepGoalRow}>
            <Text style={s.stepGoal}>of {counter.goal.toLocaleString()} daily goal</Text>
            <MotionPressable onPress={onEditGoal} accessibilityLabel="Change daily step goal">
              <Text style={s.stepGoalEdit}>Edit goal</Text>
            </MotionPressable>
          </View>
        </View>
        <View style={s.progressCopy}>
          <Text style={s.progressValue}>{Math.round(counter.progress)}%</Text>
          <Text style={s.progressLabel}>complete</Text>
        </View>
      </View>
      <View style={s.track}>
        <AnimatedProgressFill progress={counter.progress} style={s.fill} duration={650} />
      </View>

      <View style={s.metricGrid}>
        {[
          ['📍', 'Distance', `${counter.distanceKm} km`],
          ['🔥', 'Walk burn', `~${counter.calories} kcal`],
          ['🏋️', 'Exercise', workouts ? `${workouts} logged` : 'None today'],
          ['🫗', 'Water', `${water} glasses`],
        ].map(([icon, label, value]) => (
          <View key={label} style={s.metricTile}>
            <Text style={s.metricIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.metricLabel}>{label}</Text>
              <Text style={s.metricValue}>{value}</Text>
            </View>
          </View>
        ))}
      </View>

      {!counter.isConnected && (
        <View style={s.connectCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.connectTitle}>Sync your daily steps</Text>
            <Text style={s.connectText}>Connect Health Connect or your phone's motion sensor to count real activity.</Text>
          </View>
          <MotionPressable style={s.connectButton} onPress={counter.connect} disabled={counter.loading} accessibilityLabel="Connect step counter">
            {counter.loading
              ? <ActivityIndicator size="small" color={colors.textInverse} />
              : <Text style={s.connectButtonText}>Connect</Text>}
          </MotionPressable>
        </View>
      )}

      {counter.error ? <Text style={s.error}>{counter.error}</Text> : null}

      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>Focus areas</Text>
        <MotionPressable onPress={onOpenProgress} accessibilityLabel="Open full health progress">
          <Text style={s.viewAll}>View details →</Text>
        </MotionPressable>
      </View>
      <View style={s.focusGrid}>
        {focusAreas.map((area) => (
          <View key={area.label} style={s.focusTile}>
            <Text style={s.focusIcon}>{area.icon}</Text>
            <Text style={s.focusLabel}>{area.label}</Text>
            <Text style={s.focusValue} numberOfLines={1}>{area.value}</Text>
          </View>
        ))}
      </View>

      <View style={s.checkRow}>
        <View>
          <Text style={s.checkKicker}>HEALTH CHECKS</Text>
          <Text style={s.checkTitle}>{bmi ? `BMI ${bmi}` : 'Complete your profile'}</Text>
          <Text style={s.checkText}>{bmi ? 'Based on your latest weight and height' : 'Add height and weight for BMI insights'}</Text>
        </View>
        {counter.source === 'health_connect' && (
          <MotionPressable onPress={counter.manageAccess} style={s.manageButton} accessibilityLabel="Manage Health Connect access">
            <Text style={s.manageButtonText}>Manage</Text>
          </MotionPressable>
        )}
      </View>
    </MotionView>
  );
};

const s = createThemedStyles(() => ({
  card: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#4b2679', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  kicker: { color: colors.accentPurple, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.textPrimary, fontSize: 19, fontWeight: '800', marginTop: 2 },
  source: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  stepBadge: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glowPurple, borderWidth: 1, borderColor: colors.border },
  stepBadgeIcon: { fontSize: 21 },
  stepHero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: 4 },
  stepCopy: { flex: 1 },
  stepLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  stepValue: { color: colors.accentLime, fontSize: 38, lineHeight: 43, fontWeight: '800', letterSpacing: -1 },
  stepGoal: { color: colors.textMuted, fontSize: 11 },
  stepGoalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  stepGoalEdit: { color: colors.accentPurple, fontSize: 11, fontWeight: '800' },
  progressCopy: { alignItems: 'flex-end', paddingBottom: 3 },
  progressValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  progressLabel: { color: colors.textMuted, fontSize: 10 },
  track: { height: 8, borderRadius: 8, backgroundColor: colors.bgElevated, overflow: 'hidden', marginTop: 12, marginBottom: 14 },
  fill: { height: '100%', borderRadius: 8, backgroundColor: colors.accentLime },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricTile: { width: '48.5%', minHeight: 58, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: radius.md, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  metricIcon: { fontSize: 18, marginRight: 8 },
  metricLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { color: colors.textPrimary, fontSize: 12, fontWeight: '800', marginTop: 2 },
  connectCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.glowPurple, borderWidth: 1, borderColor: colors.border },
  connectTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  connectText: { color: colors.textSecondary, fontSize: 10, lineHeight: 14, marginTop: 2 },
  connectButton: { minWidth: 76, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.accentLime },
  connectButtonText: { color: colors.textInverse, fontSize: 11, fontWeight: '800' },
  error: { color: colors.accentCoral, fontSize: 10, lineHeight: 14, marginTop: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 9 },
  sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  viewAll: { color: colors.accentPurple, fontSize: 10, fontWeight: '800' },
  focusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  focusTile: { width: '48.5%', minHeight: 76, justifyContent: 'center', padding: 11, borderRadius: radius.md, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  focusIcon: { fontSize: 17, marginBottom: 5 },
  focusLabel: { color: colors.textPrimary, fontSize: 11, fontWeight: '800' },
  focusValue: { color: colors.textSecondary, fontSize: 9, marginTop: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  checkKicker: { color: colors.accentAmber, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  checkTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800', marginTop: 2 },
  checkText: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  manageButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  manageButtonText: { color: colors.accentPurple, fontSize: 10, fontWeight: '800' },
}));

export default HealthDashboardCard;
