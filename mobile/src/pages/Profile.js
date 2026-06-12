import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput } from 'react-native';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../context/AuthContext';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { getInitials } from '../utils/fitness';
import { colors, radius, spacing } from '../utils/theme';
import PremiumUpgradeModal from '../components/PremiumUpgradeModal';
import { formatPremiumExpiry } from '../utils/premium';

const ProfileSettingsModal = ({ visible, user, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    goal_weight: String(user.goal_weight || ''),
    activity_level: user.activity_level || '',
    fitness_goal: user.fitness_goal || '',
    public_profile_slug: user.public_profile_slug || '',
    profile_visibility: user.profile_visibility || 'public',
    share_achievements: user.share_achievements ?? 1,
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await api.updateProfile({
        name: form.name,
        bio: form.bio,
        goal_weight: parseFloat(form.goal_weight),
        activity_level: form.activity_level,
        fitness_goal: form.fitness_goal,
        public_profile_slug: form.public_profile_slug,
        profile_visibility: form.profile_visibility,
        share_achievements: form.share_achievements,
      });
      Toast.show({ type: 'success', text1: 'Profile updated' });
      onSave(updated);
      onClose();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not update profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.modalTitle}>Edit Profile & Privacy</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.inputGroup}>
              <Text style={s.label}>Full name</Text>
              <TextInput
                style={s.input}
                value={form.name}
                onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.label}>Bio</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                multiline
                value={form.bio}
                onChangeText={(value) => setForm((current) => ({ ...current, bio: value }))}
                placeholder="Short public intro"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.label}>Goal weight (kg)</Text>
                <TextInput
                  style={s.input}
                  value={form.goal_weight}
                  onChangeText={(value) => setForm((current) => ({ ...current, goal_weight: value }))}
                  keyboardType="numeric"
                  placeholder="70"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Public handle</Text>
                <TextInput
                  style={s.input}
                  value={form.public_profile_slug}
                  onChangeText={(value) => setForm((current) => ({ ...current, public_profile_slug: value }))}
                  placeholder="alex-fitness"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
            <View style={s.inputGroup}>
              <Text style={s.label}>Fitness goal</Text>
              <View style={s.chipRow}>
                {[['lose', 'Lose Weight'], ['maintain', 'Maintain'], ['gain', 'Gain Muscle']].map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    style={[s.chip, form.fitness_goal === value && s.chipActive]}
                    onPress={() => setForm((current) => ({ ...current, fitness_goal: value }))}
                  >
                    <Text style={[s.chipText, form.fitness_goal === value && s.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.inputGroup}>
              <Text style={s.label}>Profile visibility</Text>
              <View style={s.chipRow}>
                {[['public', 'Public'], ['private', 'Private']].map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    style={[s.chip, form.profile_visibility === value && s.chipActive]}
                    onPress={() => setForm((current) => ({ ...current, profile_visibility: value }))}
                  >
                    <Text style={[s.chipText, form.profile_visibility === value && s.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Save changes</Text>}
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const Profile = ({ navigation }) => {
  const { user, logout, refreshUser, updateUser, toggleDarkMode } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [achievements, setAchievements] = useState([]);

  const loadAchievements = useCallback(async () => {
    try {
      setAchievements(await api.getAchievements());
    } catch {
      setAchievements([]);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  useRefreshRegistration(async () => {
    await Promise.all([refreshUser().catch(() => null), loadAchievements()]);
  });

  if (!user) return null;

  const initials = getInitials(user.name, user.email);
  const isPremiumActive = user.premium_status === 'active' && (!user.premium_expires_at || new Date(user.premium_expires_at) > new Date());

  const handleLogout = async () => {
    await logout();
    Toast.show({ type: 'success', text1: 'Logged out. See you soon!' });
  };

  const copyPublicLink = async () => {
    if (!user.public_profile_slug) {
      Toast.show({ type: 'error', text1: 'Save a public handle first' });
      return;
    }
    await Clipboard.setStringAsync(`https://deeplyfit.app/u/${user.public_profile_slug}`);
    Toast.show({ type: 'success', text1: 'Public profile link copied' });
  };

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={s.scroll}>
        <View style={s.profileHeader}>
          <View style={s.avatarLarge}><Text style={s.avatarText}>{initials}</Text></View>
          <Text style={s.profileName}>{user.name || 'Athlete'}</Text>
          <Text style={s.profileEmail}>{user.email}</Text>
          <View style={[s.proBadge, isPremiumActive ? s.proBadgeActive : s.proBadgeInactive]}>
            <Text style={s.proBadgeText}>{isPremiumActive ? `PRO • ${user.premium_plan || 'active'}` : 'FREE PLAN'}</Text>
          </View>
          <Text style={s.proSubText}>
            {isPremiumActive
              ? `Expires on ${formatPremiumExpiry(user.premium_expires_at) || '—'}`
              : 'Unlock unlimited scans, AI coaching, advanced analytics, and premium reports.'}
          </Text>
          {user.bio ? <Text style={s.profileBio}>{user.bio}</Text> : null}
          <TouchableOpacity style={s.proBtn} onPress={() => setShowPremiumModal(true)}>
            <Text style={s.proBtnText}>{isPremiumActive ? 'Manage PRO' : 'Get Premium'}</Text>
          </TouchableOpacity>
        </View>

        {user.current_weight ? (
          <View style={s.statsGrid}>
            {[
              { label: 'Current', value: `${user.current_weight}kg`, color: colors.accentBlue },
              { label: 'Goal', value: `${user.goal_weight || '-'}kg`, color: colors.accentLime },
              { label: 'Calories', value: `${Math.round(user.calorie_target || 0)}`, color: colors.accentCoral },
              { label: 'Protein', value: `${Math.round(user.protein_target || 0)}g`, color: colors.accentAmber },
            ].map((item) => (
              <View key={item.label} style={s.statCard}>
                <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.settingsSection}>
          <TouchableOpacity style={s.settingsItem} onPress={() => setShowEditModal(true)}>
            <Text style={s.settingsLabel}>✏️ Goals, public profile & privacy</Text>
            <Text style={s.settingsArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.settingsItem} onPress={toggleDarkMode}>
            <Text style={s.settingsLabel}>{user.dark_mode ? '🌙 Dark mode' : '☀️ Light mode'}</Text>
            <View style={[s.toggle, !user.dark_mode && s.toggleOn]}><View style={s.toggleThumb} /></View>
          </TouchableOpacity>
        </View>

        <View style={s.settingsSection}>
          <View style={s.settingsItem}>
            <Text style={s.settingsLabel}>🔗 @{user.public_profile_slug || 'unset'}</Text>
            <Text style={[s.badge, user.profile_visibility === 'private' ? s.badgeAmber : s.badgeLime]}>{user.profile_visibility}</Text>
          </View>
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btnSmall, { marginRight: 8 }]} onPress={copyPublicLink}>
              <Text style={s.btnSmallText}>Copy link</Text>
            </TouchableOpacity>
            {user.public_profile_slug ? (
              <TouchableOpacity style={s.btnSmallSec} onPress={() => navigation.navigate('PublicProfile', { slug: user.public_profile_slug })}>
                <Text style={s.btnSmallSecText}>View public page</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {achievements.length > 0 ? (
          <View style={s.settingsSection}>
            <View style={s.rowBetween}>
              <Text style={s.sectionTitle}>Achievements</Text>
              <Text style={s.badge}>{achievements.filter((achievement) => achievement.unlocked).length} unlocked</Text>
            </View>
            {achievements.map((achievement) => {
              const pct = Math.min((achievement.progress.current / achievement.progress.target) * 100, 100);
              return (
                <View key={achievement.key} style={[s.achCard, achievement.unlocked && s.achUnlocked]}>
                  <View style={s.rowBetween}>
                    <Text style={{ fontSize: 28 }}>{achievement.icon}</Text>
                    <Text style={[s.badge, achievement.unlocked ? s.badgeLime : s.badgeAmber]}>
                      {achievement.unlocked ? 'Unlocked' : `${achievement.progress.current}/${achievement.progress.target}`}
                    </Text>
                  </View>
                  <Text style={s.achName}>{achievement.name}</Text>
                  <Text style={s.achDesc}>{achievement.description}</Text>
                  <View style={s.progressBar}><View style={[s.progressFill, { width: `${pct}%` }]} /></View>
                </View>
              );
            })}
          </View>
        ) : null}

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>

      <ProfileSettingsModal
        visible={showEditModal}
        user={user}
        onClose={() => setShowEditModal(false)}
        onSave={updateUser}
      />
      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onActivated={updateUser}
        currentUser={user}
      />
    </View>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  scroll: { flex: 1, padding: spacing.lg },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatarLarge: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.accentPurple, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 24 },
  profileName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  profileEmail: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  proBadge: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  proBadgeActive: { backgroundColor: 'rgba(200,241,53,0.16)' },
  proBadgeInactive: { backgroundColor: 'rgba(168,85,247,0.14)' },
  proBadgeText: { color: colors.accentLime, fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  proSubText: { color: colors.textSecondary, fontSize: 12, marginTop: 6, textAlign: 'center', maxWidth: 300, lineHeight: 17 },
  proBtn: { backgroundColor: colors.accentLime, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 12 },
  proBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 14 },
  profileBio: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: 'center', maxWidth: 280 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  settingsSection: { backgroundColor: colors.bgCard, borderRadius: radius.xl, marginBottom: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  settingsItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  settingsLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  settingsArrow: { color: colors.textMuted, fontSize: 18 },
  toggle: { width: 42, height: 22, borderRadius: 11, backgroundColor: colors.bgElevated, justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1, borderColor: colors.border },
  toggleOn: { backgroundColor: colors.accentLime },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  badgeLime: { backgroundColor: 'rgba(200,241,53,0.12)', color: colors.accentLime },
  badgeAmber: { backgroundColor: 'rgba(245,166,35,0.12)', color: colors.accentAmber },
  btnRow: { flexDirection: 'row', padding: spacing.md },
  btnSmall: { backgroundColor: colors.accentLime, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  btnSmallText: { color: colors.textInverse, fontWeight: '700', fontSize: 12 },
  btnSmallSec: { backgroundColor: colors.bgElevated, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
  btnSmallSecText: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  achCard: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: spacing.md, marginBottom: 7, borderWidth: 1, borderColor: colors.border },
  achUnlocked: { borderColor: colors.accentLime },
  achName: { color: colors.textPrimary, fontWeight: '700', fontSize: 14, marginTop: 6 },
  achDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 3, marginBottom: 7 },
  progressBar: { height: 5, backgroundColor: colors.bgPrimary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accentLime },
  logoutBtn: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', marginBottom: 14 },
  logoutText: { color: colors.accentCoral, fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '90%' },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 18 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, color: colors.textSecondary, marginBottom: 5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { backgroundColor: colors.bgElevated, borderRadius: 10, padding: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', marginBottom: 14 },
  chipRow: { flexDirection: 'row', gap: 7 },
  chip: { flex: 1, padding: 9, borderRadius: 8, backgroundColor: colors.bgElevated, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: 'rgba(200,241,53,0.12)', borderColor: colors.accentLime },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 11 },
  chipTextActive: { color: colors.accentLime },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});

export default Profile;
