import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';
import { colors, radius, spacing } from '../utils/theme';

const PublicProfile = ({ route, navigation }) => {
  const slug = route?.params?.slug || '';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try { setProfile(await api.getPublicProfile(slug)); }
    catch (err) { Toast.show({ type: 'error', text1: err.message || 'Could not load profile' }); setProfile(null); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={colors.accentLime} /></View>;

  if (!profile) return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Public Profile</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.backBtn}>Back</Text></TouchableOpacity>
      </View>
      <View style={s.emptyCard}>
        <Text style={s.emptyTitle}>Profile unavailable</Text>
        <Text style={s.emptyText}>This user may have disabled their public profile.</Text>
      </View>
    </View>
  );

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Public Profile</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.backBtn}>Back</Text></TouchableOpacity>
      </View>
      <ScrollView style={s.scroll}>
        <View style={s.profileHeader}>
          <View style={s.avatar}><Text style={s.avatarText}>{(profile.name || profile.public_profile_slug || '?').slice(0, 2).toUpperCase()}</Text></View>
          <Text style={s.profileName}>{profile.name || profile.public_profile_slug}</Text>
          <Text style={s.profileHandle}>@{profile.public_profile_slug}</Text>
          {profile.bio && <Text style={s.profileBio}>{profile.bio}</Text>}
          <View style={s.badgeRow}>
            {profile.fitness_goal && <Text style={s.badge}>{profile.fitness_goal}</Text>}
            {profile.activity_level && <Text style={[s.badge, s.badgeBlue]}>{profile.activity_level}</Text>}
          </View>
        </View>

        <View style={s.statsGrid}>
          <View style={s.statCard}><Text style={s.statLabel}>Calorie target</Text><Text style={s.statValue}>{Math.round(profile.stats.calorie_target || 0)}</Text></View>
          <View style={s.statCard}><Text style={s.statLabel}>Protein target</Text><Text style={s.statValue}>{Math.round(profile.stats.protein_target || 0)}g</Text></View>
          <View style={s.statCard}><Text style={s.statLabel}>Current weight</Text><Text style={s.statValue}>{profile.stats.current_weight || '-'}kg</Text></View>
          <View style={s.statCard}><Text style={s.statLabel}>Achievements</Text><Text style={s.statValue}>{profile.stats.achievements_unlocked}</Text></View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Recent Posts ({profile.stats.total_posts})</Text>
          {profile.recent_posts.map((post) => (
            <View key={post.id} style={s.postCard}>
              <Text style={s.postContent}>{post.content}</Text>
              {post.image_data && <Image source={{ uri: post.image_data }} style={s.postImg} />}
            </View>
          ))}
          {profile.recent_posts.length === 0 && <Text style={s.emptyText}>No public posts shared yet.</Text>}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  loading: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  backBtn: { color: colors.accentLime, fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1, padding: spacing.lg },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 28, backgroundColor: colors.accentPurple, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 28 },
  profileName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  profileHandle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  profileBio: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', maxWidth: 280 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: { backgroundColor: 'rgba(200,241,53,0.12)', color: colors.accentLime, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12, fontWeight: '700' },
  badgeBlue: { backgroundColor: 'rgba(79,172,254,0.12)', color: colors.accentBlue },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  postCard: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: spacing.md, marginBottom: 8 },
  postContent: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  postImg: { width: '100%', height: 160, borderRadius: 10, marginTop: 8 },
  emptyCard: { margin: spacing.lg, backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 16, marginBottom: 4 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
});

export default PublicProfile;
