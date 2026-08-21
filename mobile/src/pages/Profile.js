import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { compressImageUri } from '../utils/image';
import { getInitials } from '../utils/fitness';
import { colors, createThemedStyles, isDarkModeEnabled, radius, spacing } from '../utils/theme';
import UserAvatar, { BUILT_IN_AVATARS } from '../components/UserAvatar';
import AppBackdrop from '../components/AppBackdrop';
import AchievementsSection from '../components/AchievementsSection';
import { FloatingView, MotionPressable, MotionView } from '../components/Motion';
import { formatPremiumExpiry, getProExpiry, isPro } from '../utils/premium';

const profileFormFromUser = (user) => ({
  name: user.name || '',
  bio: user.bio || '',
  profile_picture: user.profile_picture || '',
  goal_weight: String(user.goal_weight || ''),
  activity_level: user.activity_level || '',
  fitness_goal: user.fitness_goal || '',
  public_profile_slug: user.public_profile_slug || '',
  profile_visibility: user.profile_visibility || 'public',
  share_achievements: user.share_achievements ?? 1,
});

const ProfileSettingsModal = ({ visible, user, onClose, onSave }) => {
  const [form, setForm] = useState(() => profileFormFromUser(user));
  const [loading, setLoading] = useState(false);
  const [preparingImage, setPreparingImage] = useState(false);
  const initials = getInitials(form.name, user.email);

  useEffect(() => {
    if (visible) setForm(profileFormFromUser(user));
  }, [user, visible]);

  const chooseProfilePicture = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setPreparingImage(true);
    try {
      const imageData = await compressImageUri(result.assets[0].uri, {
        maxWidth: 320,
        maxHeight: 320,
        quality: 0.76,
      });
      if (imageData.length > 350000) {
        throw new Error('This image is still too large after compression');
      }
      setForm((current) => ({ ...current, profile_picture: imageData }));
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not prepare this profile picture' });
    } finally {
      setPreparingImage(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await api.updateProfile({
        name: form.name,
        bio: form.bio,
        profile_picture: form.profile_picture,
        goal_weight: form.goal_weight ? parseFloat(form.goal_weight) : null,
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
            <View style={s.pictureEditor}>
              <View style={s.pictureEditorHead}>
                <UserAvatar value={form.profile_picture} initials={initials} size={70} />
                <View style={s.pictureEditorCopy}>
                  <Text style={s.pictureTitle}>Profile picture</Text>
                  <Text style={s.pictureSub}>Upload a photo or choose an avatar.</Text>
                  <View style={s.pictureActions}>
                    <TouchableOpacity style={s.pictureButton} onPress={chooseProfilePicture} disabled={preparingImage}>
                      <Text style={s.pictureButtonText}>{preparingImage ? 'Preparing...' : 'Upload photo'}</Text>
                    </TouchableOpacity>
                    {form.profile_picture ? (
                      <TouchableOpacity onPress={() => setForm((current) => ({ ...current, profile_picture: '' }))}>
                        <Text style={s.removePicture}>Remove</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
              <Text style={s.avatarGridLabel}>Choose one of 10 built-in avatars</Text>
              <View style={s.avatarGrid}>
                {BUILT_IN_AVATARS.map((avatar) => {
                  const selected = form.profile_picture === avatar.id;
                  return (
                    <TouchableOpacity
                      key={avatar.id}
                      style={[s.avatarOption, selected && s.avatarOptionSelected]}
                      onPress={() => setForm((current) => ({ ...current, profile_picture: avatar.id }))}
                    >
                      <UserAvatar value={avatar.id} size={42} />
                      <Text style={[s.avatarOptionLabel, selected && s.avatarOptionLabelSelected]} numberOfLines={1}>
                        {avatar.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
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
              <Text style={s.label}>Activity level</Text>
              <View style={s.chipRowWrap}>
                {[
                  ['sedentary', 'Sedentary'],
                  ['lightly_active', 'Light'],
                  ['moderately_active', 'Moderate'],
                  ['very_active', 'Very active'],
                  ['extra_active', 'Extra active'],
                ].map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    style={[s.activityChip, form.activity_level === value && s.chipActive]}
                    onPress={() => setForm((current) => ({ ...current, activity_level: value }))}
                  >
                    <Text style={[s.chipText, form.activity_level === value && s.chipTextActive]}>{label}</Text>
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
            <TouchableOpacity
              style={s.privacyToggleRow}
              onPress={() => setForm((current) => ({ ...current, share_achievements: current.share_achievements ? 0 : 1 }))}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={s.privacyToggleTitle}>Share achievements</Text>
                <Text style={s.privacyToggleCopy}>Show unlocked milestones on your public profile.</Text>
              </View>
              <View style={[s.toggle, Boolean(form.share_achievements) && s.toggleOn]}>
                <View style={[s.toggleThumb, Boolean(form.share_achievements) && s.toggleThumbOn]} />
              </View>
            </TouchableOpacity>
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
  const insets = useSafeAreaInsets();
  const [showEditModal, setShowEditModal] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const refreshProfile = useCallback(async () => {
    await Promise.all([refreshUser().catch(() => null), loadAchievements()]);
  }, [loadAchievements, refreshUser]);

  useRefreshRegistration(refreshProfile);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  if (!user) return null;

  const initials = getInitials(user.name, user.email);
  const isPremiumActive = isPro(user);
  const premiumExpiry = getProExpiry(user);
  const darkMode = isDarkModeEnabled(user.dark_mode);

  const handleLogout = () => {
    Alert.alert('Log out?', 'You will need to sign in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          Toast.show({ type: 'success', text1: 'Logged out. See you soon!' });
        },
      },
    ]);
  };

  const handleToggleDarkMode = async () => {
    try {
      await toggleDarkMode();
    } catch (error) {
      Toast.show({ type: 'error', text1: error.message || 'Could not save appearance setting' });
    }
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
      <AppBackdrop />
      <View style={[s.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <Text style={s.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentLime} />}
      >
        <MotionView depth style={s.profileHeader} delay={30}>
          <MotionPressable style={s.editProfileBtn} onPress={() => setShowEditModal(true)}>
            <Text style={s.editProfileBtnText}>Edit</Text>
          </MotionPressable>
          <FloatingView distance={4} duration={2100}>
            <UserAvatar value={user.profile_picture} initials={initials} size={72} style={s.avatarLarge} />
          </FloatingView>
          <Text style={s.profileName}>{user.name || 'Athlete'}</Text>
          <Text style={s.profileEmail}>{user.email}</Text>
          <View style={[s.proBadge, isPremiumActive ? s.proBadgeActive : s.proBadgeInactive]}>
            <Text style={s.proBadgeText}>{isPremiumActive ? `PRO • ${user.premium_plan || 'active'}` : 'FREE PLAN'}</Text>
          </View>
          <Text style={s.proSubText}>
            {isPremiumActive
              ? `Expires on ${formatPremiumExpiry(premiumExpiry) || '—'}`
              : 'Unlock unlimited scans, AI coaching, advanced analytics, and premium reports.'}
          </Text>
          {user.bio ? <Text style={s.profileBio}>{user.bio}</Text> : null}
          <MotionPressable style={s.proBtn} onPress={() => navigation.navigate(isPremiumActive ? 'Downgrade' : 'Upgrade')}>
            <Text style={s.proBtnText}>{isPremiumActive ? 'Manage PRO' : 'Get Premium'}</Text>
          </MotionPressable>
        </MotionView>

        {user.current_weight ? (
          <MotionView style={s.statsGrid} delay={90}>
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
          </MotionView>
        ) : null}

        <MotionView depth accentColor={colors.glowBlue} style={s.settingsSection} delay={140}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionEyebrow}>Account</Text>
              <Text style={s.sectionTitle}>Settings</Text>
            </View>
          </View>
          <TouchableOpacity style={s.settingsItem} onPress={() => setShowEditModal(true)}>
            <Text style={s.settingsLabel}>✏️ Goals, public profile & privacy</Text>
            <Text style={s.settingsArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.settingsItem} onPress={handleToggleDarkMode}>
            <Text style={s.settingsLabel}>{darkMode ? '🌙 Dark mode' : '☀️ Light mode'}</Text>
            <View style={[s.toggle, darkMode && s.toggleOn]}>
              <View style={[s.toggleThumb, darkMode && s.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.settingsItem} onPress={() => navigation.navigate('About')}>
            <Text style={s.settingsLabel}>About Deeply Fit</Text>
            <Text style={s.settingsArrow}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.settingsItem} onPress={() => navigation.navigate('HelpCenter')}>
            <Text style={s.settingsLabel}>Help Center</Text>
            <Text style={s.settingsArrow}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.settingsItem} onPress={() => navigation.navigate('Support')}>
            <Text style={s.settingsLabel}>Support</Text>
            <Text style={s.settingsArrow}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.settingsItem} onPress={() => navigation.navigate('LegalCenter')}>
            <Text style={s.settingsLabel}>Legal & policies</Text>
            <Text style={s.settingsArrow}>{'>'}</Text>
          </TouchableOpacity>
        </MotionView>

        <MotionView depth style={s.settingsSection} delay={190}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionEyebrow}>Sharing</Text>
              <Text style={s.sectionTitle}>Public profile</Text>
            </View>
            <Text style={[s.badge, user.profile_visibility === 'private' ? s.badgeAmber : s.badgeLime]}>{user.profile_visibility}</Text>
          </View>
          <View style={s.publicProfileBody}>
            <View style={s.publicHandleRow}>
              <View style={s.publicLinkIcon}><Text style={s.publicLinkIconText}>@</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.publicHandle}>@{user.public_profile_slug || 'unset'}</Text>
                <Text style={s.publicHint}>{user.public_profile_slug ? 'Your shareable Deeply Fit profile' : 'Add a public handle in Edit Profile'}</Text>
              </View>
            </View>
            <View style={s.publicStatRow}>
              <Text style={s.publicStatLabel}>Achievement visibility</Text>
              <Text style={s.publicStatValue}>{user.share_achievements ? 'Shared' : 'Hidden'}</Text>
            </View>
          </View>
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btnSmall, { marginRight: 8 }, !user.public_profile_slug && s.btnDisabled]} onPress={copyPublicLink} disabled={!user.public_profile_slug}>
              <Text style={s.btnSmallText}>Copy link</Text>
            </TouchableOpacity>
            {user.public_profile_slug ? (
              <TouchableOpacity style={s.btnSmallSec} onPress={() => navigation.navigate('PublicProfile', { slug: user.public_profile_slug })}>
                <Text style={s.btnSmallSecText}>View public page</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </MotionView>

        <AchievementsSection achievements={achievements} delay={240} />

        <MotionPressable style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Log Out</Text>
        </MotionPressable>
      </ScrollView>

      <ProfileSettingsModal
        visible={showEditModal}
        user={user}
        onClose={() => setShowEditModal(false)}
        onSave={updateUser}
      />
    </View>
  );
};

const s = createThemedStyles(() => ({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { paddingHorizontal: spacing.lg, paddingBottom: 16, backgroundColor: colors.headerBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  profileHeader: { position: 'relative', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, marginBottom: 14, borderWidth: 1, borderColor: colors.border, shadowColor: '#48236f', shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 11 }, elevation: 7 },
  editProfileBtn: { position: 'absolute', top: 14, right: 14, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  editProfileBtnText: { color: colors.accentPurple, fontSize: 11, fontWeight: '800' },
  avatarLarge: { marginBottom: 10 },
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
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, shadowColor: '#48236f', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  settingsSection: { backgroundColor: colors.bgCard, borderRadius: radius.xl, marginBottom: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', shadowColor: '#48236f', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  sectionHeader: { minHeight: 62, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionEyebrow: { color: colors.accentPurple, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 },
  settingsItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  settingsLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  settingsArrow: { color: colors.textMuted, fontSize: 18 },
  toggle: { width: 42, height: 22, borderRadius: 11, backgroundColor: colors.bgElevated, justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1, borderColor: colors.border },
  toggleOn: { backgroundColor: colors.accentLime },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  badgeLime: { backgroundColor: 'rgba(200,241,53,0.12)', color: colors.accentLime },
  badgeAmber: { backgroundColor: 'rgba(245,166,35,0.12)', color: colors.accentAmber },
  badgePurple: { backgroundColor: 'rgba(124,58,237,0.1)', color: colors.accentPurple },
  publicProfileBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  publicHandleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  publicLinkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(37,99,235,0.1)', marginRight: 11 },
  publicLinkIconText: { color: colors.accentBlue, fontSize: 17, fontWeight: '900' },
  publicHandle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  publicHint: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  publicStatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  publicStatLabel: { color: colors.textMuted, fontSize: 11 },
  publicStatValue: { color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
  btnRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: 5, paddingBottom: spacing.lg },
  btnSmall: { backgroundColor: colors.accentLime, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  btnSmallText: { color: colors.textInverse, fontWeight: '700', fontSize: 12 },
  btnSmallSec: { backgroundColor: colors.bgElevated, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: colors.border },
  btnSmallSecText: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  logoutBtn: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', marginTop: 2 },
  logoutText: { color: colors.accentCoral, fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '90%' },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 18 },
  pictureEditor: { padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.bgElevated },
  pictureEditorHead: { flexDirection: 'row', alignItems: 'center' },
  pictureEditorCopy: { flex: 1, marginLeft: 12 },
  pictureTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  pictureSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  pictureActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  pictureButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.accentLime },
  pictureButtonText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
  removePicture: { color: colors.accentCoral, fontSize: 11, fontWeight: '700', marginLeft: 12 },
  avatarGridLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  avatarOption: { width: '18%', minWidth: 48, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.bgCard },
  avatarOptionSelected: { borderColor: colors.accentLime, backgroundColor: 'rgba(168,85,247,0.12)' },
  avatarOptionLabel: { maxWidth: '100%', color: colors.textMuted, fontSize: 8, fontWeight: '600', marginTop: 4 },
  avatarOptionLabelSelected: { color: colors.accentLime },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, color: colors.textSecondary, marginBottom: 5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { backgroundColor: colors.bgElevated, borderRadius: 10, padding: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', marginBottom: 14 },
  chipRow: { flexDirection: 'row', gap: 7 },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { flex: 1, padding: 9, borderRadius: 8, backgroundColor: colors.bgElevated, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  activityChip: { width: '31%', minHeight: 40, paddingHorizontal: 7, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: 'rgba(200,241,53,0.12)', borderColor: colors.accentLime },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 11 },
  chipTextActive: { color: colors.accentLime },
  privacyToggleRow: { flexDirection: 'row', alignItems: 'center', padding: 13, marginBottom: 14, backgroundColor: colors.bgElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  privacyToggleTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  privacyToggleCopy: { color: colors.textMuted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
}));

export default Profile;
