import React from 'react';
import { Text, View } from 'react-native';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';
import { AnimatedProgressFill, MotionView } from './Motion';

const AchievementsSection = ({ achievements = [], delay = 0 }) => {
  if (!achievements.length) return null;

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <MotionView depth accentColor="rgba(245,166,35,0.14)" style={s.section} delay={delay}>
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>Milestones</Text>
          <Text style={s.title}>Achievements</Text>
        </View>
        <Text style={[s.badge, s.badgePurple]}>{unlockedCount} unlocked</Text>
      </View>

      <View style={s.grid}>
        {achievements.map((achievement, index) => {
          const current = Number(achievement.progress?.current || 0);
          const target = Math.max(Number(achievement.progress?.target || 1), 1);
          const progress = Math.min((current / target) * 100, 100);

          return (
            <MotionView
              key={achievement.key}
              style={[s.card, achievement.unlocked && s.cardUnlocked]}
              delay={delay + 40 + (index * 55)}
              variant="fade"
              layout
            >
              <View style={s.cardTopRow}>
                <View style={[s.iconWrap, achievement.unlocked && s.iconWrapUnlocked]}>
                  <Text style={s.icon}>{achievement.icon}</Text>
                </View>
                <Text style={[s.badge, achievement.unlocked ? s.badgeDone : s.badgeProgress]}>
                  {achievement.unlocked ? 'Done' : `${current}/${target}`}
                </Text>
              </View>
              <Text style={s.name}>{achievement.name}</Text>
              <Text style={s.description} numberOfLines={3}>{achievement.description}</Text>
              <View style={s.progressTrack}>
                <AnimatedProgressFill progress={progress} style={s.progressFill} />
              </View>
            </MotionView>
          );
        })}
      </View>
    </MotionView>
  );
};

const s = createThemedStyles(() => ({
  section: { backgroundColor: colors.bgCard, borderRadius: radius.xl, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', shadowColor: '#48236f', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  header: { minHeight: 62, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  eyebrow: { color: colors.accentPurple, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 },
  title: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, padding: spacing.md },
  card: { flexBasis: '47%', flexGrow: 1, minHeight: 154, backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardUnlocked: { borderColor: colors.accentLime, backgroundColor: colors.glowPurple },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  iconWrapUnlocked: { backgroundColor: colors.glowPurple },
  icon: { fontSize: 21 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  badgeDone: { backgroundColor: 'rgba(200,241,53,0.12)', color: colors.accentLime },
  badgeProgress: { backgroundColor: 'rgba(245,166,35,0.12)', color: colors.accentAmber },
  badgePurple: { backgroundColor: colors.glowPurple, color: colors.accentPurple },
  name: { color: colors.textPrimary, fontWeight: '800', fontSize: 12, lineHeight: 16 },
  description: { flex: 1, color: colors.textSecondary, fontSize: 9, lineHeight: 13, marginTop: 5, marginBottom: 9 },
  progressTrack: { height: 5, backgroundColor: colors.bgPrimary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accentLime },
}));

export default AchievementsSection;
