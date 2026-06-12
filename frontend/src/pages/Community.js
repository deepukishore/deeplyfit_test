import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ACTIVE_CHALLENGES } from '../utils/fitness';
import { api } from '../utils/api';
import { compressImageFile } from '../utils/image';
import { useRefreshRegistration } from '../context/RefreshContext';
import '../styles/dashboard.css';
import '../styles/animations.css';

const formatRelativeTime = (timestamp) => {
  const created = new Date(timestamp).getTime();
  const diffMinutes = Math.max(1, Math.round((Date.now() - created) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
  return `${Math.round(diffMinutes / 1440)}d ago`;
};

const initialsFor = (author) => {
  if (author?.name) {
    return author.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }
  return author?.email?.slice(0, 1)?.toUpperCase() || '?';
};

const CreatePostModal = ({ onClose, onCreated }) => {
  const [postType, setPostType] = useState('update');
  const [content, setContent] = useState('');
  const [imageData, setImageData] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.8 });
      setImageData(compressed);
    } catch (err) {
      toast.error('Could not prepare this photo');
    }
  };

  const handleCreate = async () => {
    if (!content.trim()) {
      toast.error('Write a quick update before posting');
      return;
    }

    setSaving(true);
    try {
      await api.createCommunityPost({
        content: content.trim(),
        post_type: postType,
        image_base64: imageData,
      });
      toast.success('Post shared');
      await onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not create post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">Share an update</h3>
        <div className="modal-form">
          <div className="input-group">
            <label>Post type</label>
            <select value={postType} onChange={(event) => setPostType(event.target.value)}>
              <option value="update">Progress update</option>
              <option value="meal">Meal photo</option>
              <option value="pr">Personal record</option>
            </select>
          </div>
          <div className="input-group">
            <label>What happened?</label>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} placeholder="Hit a new squat PR, meal prepped lunches, stayed on track for a week..." />
          </div>
          <div className="input-group">
            <label>Photo (optional)</label>
            <input type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} />
            {imageData && <img src={imageData} alt="Post preview" className="community-photo" style={{ marginTop: 10 }} />}
          </div>
          <button className="btn btn-primary btn-full" onClick={handleCreate} disabled={saving}>
            {saving ? <><span className="spinner" /> Posting...</> : 'Post update'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Community = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState('feed');
  const [loading, setLoading] = useState(true);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [challenges, setChallenges] = useState([]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await api.getCommunityPosts());
    } catch (err) {
      toast.error(err.message || 'Could not load community posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChallenges = useCallback(async () => {
    setChallengeLoading(true);
    try {
      setChallenges(await api.getCommunityChallenges());
    } catch (err) {
      toast.error(err.message || 'Could not load challenges');
      setChallenges(ACTIVE_CHALLENGES.map((challenge) => ({ ...challenge, joinedByMe: false, joinedCount: 0 })));
    } finally {
      setChallengeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
    loadChallenges();
  }, [loadPosts, loadChallenges]);

  useRefreshRegistration(loadPosts);

  const joinChallenge = async (challenge) => {
    if (challenge.joinedByMe) {
      toast.success(`You're already in ${challenge.name}`);
      return;
    }

    try {
      const updated = await api.joinCommunityChallenge(challenge.id);
      setChallenges((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(updated.message || `Joined ${challenge.name}`);
    } catch (err) {
      toast.error(err.message || 'Could not join challenge');
    }
  };

  const toggleLike = async (postId) => {
    try {
      const result = await api.toggleCommunityLike(postId);
      setPosts((current) => current.map((post) => (
        post.id === postId
          ? { ...post, liked_by_me: result.liked, like_count: result.like_count }
          : post
      )));
    } catch (err) {
      toast.error(err.message || 'Could not update like');
    }
  };

  const sendComment = async (postId) => {
    const draft = commentDrafts[postId]?.trim();
    if (!draft) return;
    try {
      const created = await api.createCommunityComment(postId, { content: draft });
      setPosts((current) => current.map((post) => (
        post.id === postId
          ? { ...post, comments: [...post.comments, created], comment_count: post.comment_count + 1 }
          : post
      )));
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    } catch (err) {
      toast.error(err.message || 'Could not comment');
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Community</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Post</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {['feed', 'challenges'].map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              style={{
                padding: '8px 20px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border)',
                background: tab === value ? 'var(--accent-lime)' : 'var(--bg-elevated)',
                color: tab === value ? 'var(--text-inverse)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                textTransform: 'capitalize',
              }}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {tab === 'feed' && (
          <>
            <div className="planner-hero animate-slide-up" style={{ marginBottom: 16 }}>
              <p className="planner-eyebrow">Live feed</p>
              <h4>Real posts, real comments, real progress</h4>
              <p>Share meals, personal records, or weekly wins. Tap a name to open their public profile.</p>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: 170, borderRadius: 24 }} />)}
              </div>
            ) : (
              <div className="stagger">
                {posts.map((post) => (
                  <div key={post.id} className="feed-post animate-slide-up">
                    <div className="feed-post-header">
                      <button className="feed-avatar" style={{ background: 'rgba(79,172,254,0.14)', color: 'var(--accent-blue)', border: 'none' }} onClick={() => post.author.public_profile_slug && navigate(`/u/${post.author.public_profile_slug}`)}>
                        {initialsFor(post.author)}
                      </button>
                      <div style={{ flex: 1 }}>
                        <button className="link-button" onClick={() => post.author.public_profile_slug && navigate(`/u/${post.author.public_profile_slug}`)}>{post.author.name || post.author.email}</button>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatRelativeTime(post.created_at)}</p>
                      </div>
                      <span className="badge badge-lime" style={{ fontSize: 11 }}>{post.post_type}</span>
                    </div>

                    <p className="feed-post-content">{post.content}</p>
                    {post.image_data && <img src={post.image_data} alt="Post" className="community-photo" />}

                    <div className="feed-post-actions">
                      <button className="feed-action-btn" onClick={() => toggleLike(post.id)} style={{ color: post.liked_by_me ? 'var(--accent-coral)' : undefined }}>
                        {post.liked_by_me ? 'Liked' : 'Like'} {post.like_count}
                      </button>
                      <button className="feed-action-btn">Comments {post.comment_count}</button>
                    </div>

                    <div className="community-comment-list">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="community-comment">
                          <span className="community-comment-author">{comment.author.name || comment.author.email}</span>
                          <span>{comment.content}</span>
                        </div>
                      ))}
                    </div>

                    <div className="community-comment-compose">
                      <input value={commentDrafts[post.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Write a comment..." />
                      <button className="btn btn-secondary btn-sm" onClick={() => sendComment(post.id)}>Send</button>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <div className="template-card">
                    <h3 className="template-card-title">No posts yet</h3>
                    <p className="template-card-meta">Be the first to share a win, a meal, or a progress update.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'challenges' && (
          <div className="stagger">
            <div className="animate-slide-up" style={{ marginBottom: 16 }}>
              <div className="section-header">
                <h2 className="section-title">Active Challenges</h2>
                <span className="badge badge-amber">This Week</span>
              </div>
              {challengeLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: 120, borderRadius: 24 }} />)}
                </div>
              ) : (
                challenges.map((challenge) => (
                  <div key={challenge.id} className="template-card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ fontSize: 36, width: 56, height: 56, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{challenge.icon}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{challenge.name}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{challenge.participants} participants · {challenge.daysLeft} days left</p>
                        <div className="progress-bar" style={{ marginTop: 8 }}>
                          <div className="progress-bar-fill" style={{ width: `${Math.max(8, Math.min(100, ((30 - challenge.daysLeft) / 30) * 100))}%` }} />
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => joinChallenge(challenge)}
                        disabled={challenge.joinedByMe}
                      >
                        {challenge.joinedByMe ? 'Joined' : 'Join'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} onCreated={loadPosts} />}
    </div>
  );
};

export default Community;
