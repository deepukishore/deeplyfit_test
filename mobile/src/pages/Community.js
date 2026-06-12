import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Image, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { ACTIVE_CHALLENGES } from '../utils/fitness';
import { api } from '../utils/api';
import { compressImageUri } from '../utils/image';
import * as ImagePicker from 'expo-image-picker';
import { useRefreshRegistration } from '../context/RefreshContext';
import { colors, radius, spacing } from '../utils/theme';


const formatRelativeTime = (timestamp) => {
  const diff = Math.max(1, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
};

const initialsFor = (author) => {
  if (author?.name) return author.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return author?.email?.slice(0, 1)?.toUpperCase() || '?';
};

const CreatePostModal = ({ visible, onClose, onCreated }) => {
  const [postType, setPostType] = useState('update');
  const [content, setContent] = useState('');
  const [imageData, setImageData] = useState(null);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      try { setImageData(await compressImageUri(result.assets[0].uri)); }
      catch { Toast.show({ type: 'error', text1: 'Could not prepare this photo' }); }
    }
  };

  const handleCreate = async () => {
    if (!content.trim()) { Toast.show({ type: 'error', text1: 'Write a quick update before posting' }); return; }
    setSaving(true);
    try {
      await api.createCommunityPost({ content: content.trim(), post_type: postType, image_base64: imageData });
      Toast.show({ type: 'success', text1: 'Post shared' });
      await onCreated(); onClose();
    } catch (err) { Toast.show({ type: 'error', text1: err.message || 'Could not create post' }); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.modalTitle}>Share an update</Text>
          <View style={s.inputGroup}>
            <Text style={s.label}>Post type</Text>
            <View style={s.typeRow}>
              {[['update', 'Progress'], ['meal', 'Meal'], ['pr', 'PR']].map(([v, l]) => (
                <TouchableOpacity key={v} style={[s.typeChip, postType === v && s.typeChipActive]} onPress={() => setPostType(v)}>
                  <Text style={[s.typeChipText, postType === v && s.typeChipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={s.inputGroup}>
            <Text style={s.label}>What happened?</Text>
            <TextInput style={[s.input, { height: 100, textAlignVertical: 'top' }]} multiline placeholder="Hit a new squat PR, meal prepped lunches..." placeholderTextColor={colors.textMuted} value={content} onChangeText={setContent} />
          </View>
          <TouchableOpacity style={s.photoBtn} onPress={pickImage}>
            <Text style={s.photoBtnText}>{imageData ? '✓ Photo selected' : '📷 Add photo (optional)'}</Text>
          </TouchableOpacity>
          {imageData && <Image source={{ uri: imageData }} style={s.previewImg} />}
          <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Post update</Text>}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const Community = ({ navigation }) => {
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState('feed');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [challenges, setChallenges] = useState([]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try { setPosts(await api.getCommunityPosts()); }
    catch (err) { Toast.show({ type: 'error', text1: err.message || 'Could not load posts' }); setPosts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);
  useRefreshRegistration(loadPosts);

  const loadChallenges = useCallback(async () => {
    setChallengeLoading(true);
    try {
      setChallenges(await api.getCommunityChallenges());
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not load challenges' });
      setChallenges(ACTIVE_CHALLENGES.map((challenge) => ({ ...challenge, joinedByMe: false, joinedCount: 0 })));
    } finally {
      setChallengeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const onRefresh = async () => { setRefreshing(true); await Promise.all([loadPosts(), loadChallenges()]); setRefreshing(false); };

  const joinChallenge = async (challenge) => {
    if (challenge.joinedByMe) {
      Toast.show({ type: 'success', text1: `You're already in ${challenge.name}` });
      return;
    }

    try {
      const updated = await api.joinCommunityChallenge(challenge.id);
      setChallenges((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      Toast.show({ type: 'success', text1: updated.message || `Joined ${challenge.name}` });
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not join challenge' });
    }
  };

  const toggleLike = async (postId) => {
    try {
      const result = await api.toggleCommunityLike(postId);
      setPosts((cur) => cur.map((p) => p.id === postId ? { ...p, liked_by_me: result.liked, like_count: result.like_count } : p));
    } catch (err) { Toast.show({ type: 'error', text1: err.message }); }
  };

  const sendComment = async (postId) => {
    const draft = commentDrafts[postId]?.trim();
    if (!draft) return;
    try {
      const created = await api.createCommunityComment(postId, { content: draft });
      setPosts((cur) => cur.map((p) => p.id === postId ? { ...p, comments: [...p.comments, created], comment_count: p.comment_count + 1 } : p));
      setCommentDrafts((cur) => ({ ...cur, [postId]: '' }));
    } catch (err) { Toast.show({ type: 'error', text1: err.message }); }
  };


  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Community</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={s.addBtnText}>+ Post</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        {['feed', 'challenges'].map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentLime} />}>
        {tab === 'feed' && (
          loading ? <ActivityIndicator color={colors.accentLime} style={{ marginTop: 40 }} /> : (
            <>
              {posts.map((post) => (
                <View key={post.id} style={s.postCard}>
                  <View style={s.postHeader}>
                    <TouchableOpacity style={s.postAvatar} onPress={() => post.author.public_profile_slug && navigation.navigate('PublicProfile', { slug: post.author.public_profile_slug })}>
                      <Text style={s.postAvatarText}>{initialsFor(post.author)}</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={s.postAuthor}>{post.author.name || post.author.email}</Text>
                      <Text style={s.postTime}>{formatRelativeTime(post.created_at)}</Text>
                    </View>
                    <Text style={s.postTypeBadge}>{post.post_type}</Text>
                  </View>
                  <Text style={s.postContent}>{post.content}</Text>
                  {post.image_data && <Image source={{ uri: post.image_data }} style={s.postImg} />}
                  <View style={s.postActions}>
                    <TouchableOpacity style={s.actionBtn} onPress={() => toggleLike(post.id)}>
                      <Text style={[s.actionText, post.liked_by_me && { color: colors.accentCoral }]}>{post.liked_by_me ? '❤️' : '🤍'} {post.like_count}</Text>
                    </TouchableOpacity>
                    <Text style={s.actionText}>💬 {post.comment_count}</Text>
                  </View>
                  {post.comments.map((c) => (
                    <View key={c.id} style={s.comment}>
                      <Text style={s.commentAuthor}>{c.author.name || c.author.email}: </Text>
                      <Text style={s.commentText}>{c.content}</Text>
                    </View>
                  ))}
                  <View style={s.commentCompose}>
                    <TextInput style={[s.input, { flex: 1, marginRight: 8, padding: 10 }]} placeholder="Write a comment..." placeholderTextColor={colors.textMuted} value={commentDrafts[post.id] || ''} onChangeText={(v) => setCommentDrafts((c) => ({ ...c, [post.id]: v }))} />
                    <TouchableOpacity style={s.sendBtn} onPress={() => sendComment(post.id)}>
                      <Text style={s.sendBtnText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {posts.length === 0 && <View style={s.emptyCard}><Text style={s.emptyTitle}>No posts yet</Text><Text style={s.emptyText}>Be the first to share a win!</Text></View>}
            </>
          )
        )}

        {tab === 'challenges' && (
          <>
            <Text style={s.sectionTitle}>Active Challenges</Text>
            {challengeLoading ? (
              <ActivityIndicator color={colors.accentLime} style={{ marginTop: 24 }} />
            ) : (
              challenges.map((ch) => (
                <View key={ch.id} style={s.challengeCard}>
                  <Text style={{ fontSize: 36, marginRight: 16 }}>{ch.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.challengeName}>{ch.name}</Text>
                    <Text style={s.challengeMeta}>{ch.participants} participants · {ch.daysLeft} days left</Text>
                    <View style={s.progressBar}><View style={[s.progressFill, { width: `${Math.max(8, Math.min(100, ((30 - ch.daysLeft) / 30) * 100))}%` }]} /></View>
                  </View>
                  <TouchableOpacity
                    style={[s.joinBtn, ch.joinedByMe && s.joinBtnActive]}
                    onPress={() => joinChallenge(ch)}
                    disabled={ch.joinedByMe}
                  >
                    <Text style={s.joinBtnText}>{ch.joinedByMe ? 'Joined' : 'Join'}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <CreatePostModal visible={showCreate} onClose={() => setShowCreate(false)} onCreated={loadPosts} />
    </View>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  addBtn: { backgroundColor: colors.accentLime, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 12 },
  tabs: { flexDirection: 'row', padding: spacing.md, gap: 8, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated },
  tabActive: { backgroundColor: colors.accentLime, borderColor: colors.accentLime },
  tabText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: colors.textInverse },
  scroll: { flex: 1, padding: spacing.md },
  postCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(79,172,254,0.14)', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  postAvatarText: { color: colors.accentBlue, fontWeight: '800', fontSize: 13 },
  postAuthor: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  postTime: { color: colors.textMuted, fontSize: 11 },
  postTypeBadge: { backgroundColor: 'rgba(200,241,53,0.12)', color: colors.accentLime, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, fontSize: 10, fontWeight: '700' },
  postContent: { color: colors.textPrimary, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  postImg: { width: '100%', height: 180, borderRadius: 12, marginBottom: 10 },
  postActions: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  actionBtn: { padding: 3 },
  actionText: { color: colors.textSecondary, fontSize: 13 },
  comment: { flexDirection: 'row', paddingVertical: 3 },
  commentAuthor: { color: colors.accentLime, fontWeight: '700', fontSize: 12 },
  commentText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  commentCompose: { flexDirection: 'row', marginTop: 7, alignItems: 'center' },
  sendBtn: { backgroundColor: colors.bgElevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
  sendBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
  emptyCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 15, marginBottom: 3 },
  emptyText: { color: colors.textMuted, fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  challengeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  challengeName: { color: colors.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 3 },
  challengeMeta: { color: colors.textMuted, fontSize: 11, marginBottom: 7 },
  progressBar: { height: 5, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accentLime },
  joinBtn: { backgroundColor: colors.accentLime, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginLeft: 10 },
  joinBtnActive: { opacity: 0.75 },
  joinBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '90%' },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 18 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, color: colors.textSecondary, marginBottom: 5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { backgroundColor: colors.bgElevated, borderRadius: 10, padding: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  typeRow: { flexDirection: 'row', gap: 7 },
  typeChip: { flex: 1, padding: 9, borderRadius: 8, backgroundColor: colors.bgElevated, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  typeChipActive: { backgroundColor: 'rgba(200,241,53,0.12)', borderColor: colors.accentLime },
  typeChipText: { color: colors.textMuted, fontWeight: '600', fontSize: 12 },
  typeChipTextActive: { color: colors.accentLime },
  photoBtn: { backgroundColor: colors.bgElevated, borderRadius: 10, padding: 11, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  photoBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  previewImg: { width: '100%', height: 140, borderRadius: 12, marginBottom: 10 },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});

export default Community;
