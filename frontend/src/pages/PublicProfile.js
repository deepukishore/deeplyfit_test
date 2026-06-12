import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import '../styles/dashboard.css';
import '../styles/animations.css';

const PublicProfile = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await api.getPublicProfile(slug));
    } catch (err) {
      toast.error(err.message || 'Could not load public profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-inner">
            <div className="skeleton route-skeleton-title" />
            <div className="skeleton route-skeleton-pill" />
          </div>
        </div>
        <div className="route-skeleton-body">
          {[1, 2, 3].map((item) => <div key={item} className="skeleton route-skeleton-card" />)}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-inner">
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Public Profile</h1>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/community')}>Back</button>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div className="template-card">
            <h3 className="template-card-title">Profile unavailable</h3>
            <p className="template-card-meta">This user may have disabled their public profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-inner">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Public Profile</h1>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/community')}>Back</button>
        </div>
      </div>

      <div className="profile-header animate-slide-up">
        <div className="profile-avatar-large">{(profile.name || profile.public_profile_slug || '?').slice(0, 2).toUpperCase()}</div>
        <h2 className="profile-name">{profile.name || profile.public_profile_slug}</h2>
        <p className="profile-email">@{profile.public_profile_slug}</p>
        {profile.bio && <p style={{ maxWidth: 320, margin: '12px auto 0', color: 'var(--text-secondary)' }}>{profile.bio}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          {profile.fitness_goal && <span className="badge badge-lime">{profile.fitness_goal}</span>}
          {profile.activity_level && <span className="badge badge-blue">{profile.activity_level}</span>}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="progress-stats-grid animate-slide-up" style={{ marginBottom: 16 }}>
          <div className="stat-card"><div className="stat-card-label">Calorie target</div><div className="stat-card-value">{Math.round(profile.stats.calorie_target || 0)}</div></div>
          <div className="stat-card"><div className="stat-card-label">Protein target</div><div className="stat-card-value">{Math.round(profile.stats.protein_target || 0)}g</div></div>
          <div className="stat-card"><div className="stat-card-label">Current weight</div><div className="stat-card-value">{profile.stats.current_weight || '-'}kg</div></div>
          <div className="stat-card"><div className="stat-card-label">Achievements</div><div className="stat-card-value">{profile.stats.achievements_unlocked}</div></div>
        </div>

        <div className="settings-section animate-slide-up" style={{ marginBottom: 16, padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 className="section-title">Recent Posts</h2>
            <span className="badge badge-lime">{profile.stats.total_posts}</span>
          </div>
          {profile.recent_posts.map((post) => (
            <div key={post.id} className="feed-post" style={{ marginBottom: 12 }}>
              <p className="feed-post-content">{post.content}</p>
              {post.image_data && <img src={post.image_data} alt="Post" className="community-photo" />}
            </div>
          ))}
          {profile.recent_posts.length === 0 && <p className="template-card-meta">No public posts shared yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
