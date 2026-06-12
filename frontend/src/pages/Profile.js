import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { getInitials } from '../utils/fitness';
import { isPro } from '../utils/premium';
import PremiumModal from '../components/PremiumModal';
import '../styles/dashboard.css';
import '../styles/animations.css';

const ProfileSettingsModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    goal_weight: user.goal_weight || '',
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
      const parsedGoalWeight = form.goal_weight === '' ? undefined : parseFloat(form.goal_weight);
      const updated = await api.updateProfile({
        name: form.name,
        bio: form.bio,
        goal_weight: Number.isNaN(parsedGoalWeight) ? undefined : parsedGoalWeight,
        activity_level: form.activity_level,
        fitness_goal: form.fitness_goal,
        public_profile_slug: form.public_profile_slug,
        profile_visibility: form.profile_visibility,
        share_achievements: form.share_achievements,
      });
      toast.success('Profile updated');
      onSave(updated);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">Edit Profile & Privacy</h3>
        <div className="modal-form">
          <div className="input-group">
            <label>Full name</label>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" />
          </div>
          <div className="input-group">
            <label>Bio</label>
            <textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} rows={3} placeholder="Short public intro" />
          </div>
          <div className="planner-grid">
            <div className="input-group">
              <label>Goal weight (kg)</label>
              <input type="number" value={form.goal_weight} onChange={(event) => setForm((current) => ({ ...current, goal_weight: event.target.value }))} placeholder="70" />
            </div>
            <div className="input-group">
              <label>Public handle</label>
              <input value={form.public_profile_slug} onChange={(event) => setForm((current) => ({ ...current, public_profile_slug: event.target.value }))} placeholder="alex-fitness" />
            </div>
          </div>
          <div className="planner-grid">
            <div className="input-group">
              <label>Activity level</label>
              <select value={form.activity_level} onChange={(event) => setForm((current) => ({ ...current, activity_level: event.target.value }))}>
                {[
                  ['sedentary', 'Sedentary'],
                  ['lightly_active', 'Lightly Active'],
                  ['moderately_active', 'Moderately Active'],
                  ['very_active', 'Very Active'],
                  ['extra_active', 'Extra Active'],
                ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Fitness goal</label>
              <select value={form.fitness_goal} onChange={(event) => setForm((current) => ({ ...current, fitness_goal: event.target.value }))}>
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain</option>
                <option value="gain">Gain Muscle</option>
              </select>
            </div>
          </div>
          <div className="planner-grid">
            <div className="input-group">
              <label>Public profile</label>
              <select value={form.profile_visibility} onChange={(event) => setForm((current) => ({ ...current, profile_visibility: event.target.value }))}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="input-group">
              <label>Share achievements</label>
              <select value={String(form.share_achievements)} onChange={(event) => setForm((current) => ({ ...current, share_achievements: Number(event.target.value) }))}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user, logout, refreshUser, updateUser, toggleDarkMode } = useAuth();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [showPremium, setShowPremium] = useState(false);
  const [proActive, setProActive] = useState(isPro());

  const loadAchievements = useCallback(async () => {
    try {
      setAchievements(await api.getAchievements());
    } catch (err) {
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
  const publicLink = `${window.location.origin}/u/${user.public_profile_slug || ''}`;
  const isDark = user.dark_mode === 1 || user.dark_mode === '1' || user.dark_mode === true;

  const handleProActivated = () => setProActive(true);

  const handleLogout = () => {
    logout();
    toast.success('Logged out. See you soon!');
    navigate('/login');
  };

  const copyPublicLink = async () => {
    if (!user.public_profile_slug) {
      toast.error('Save a public handle first');
      return;
    }
    await navigator.clipboard.writeText(publicLink);
    toast.success('Public profile link copied');
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Profile</h1>
      </div>

      <div className="profile-header animate-slide-up">
        <div className={`profile-avatar-large ${proActive ? 'pro-avatar' : ''}`}>{initials}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <h2 className="profile-name" style={{ margin: 0 }}>{user.name || 'Athlete'}</h2>
          {proActive && <span className="badge badge-pro">💎 PRO</span>}
        </div>
        <p className="profile-email">{user.email}</p>
        {user.bio && <p style={{ maxWidth: 320, margin: '12px auto 0', color: 'var(--text-secondary)' }}>{user.bio}</p>}
        {!proActive && (
          <button className="btn premium-btn" onClick={() => setShowPremium(true)} style={{ marginTop: 16 }}>
            💎 Get PRO — ₹199/month
          </button>
        )}
        {proActive && (
          <div className="pro-active-banner">
            <span>💎 PRO Active</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unlimited AI · All features unlocked</span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px' }}>
        {user.current_weight && (
          <div className="progress-stats-grid animate-slide-up" style={{ marginBottom: 16 }}>
            {[
              { label: 'Current', value: `${user.current_weight}kg`, color: 'var(--accent-blue)' },
              { label: 'Goal', value: `${user.goal_weight || '-'}kg`, color: 'var(--accent-lime)' },
              { label: 'Calories', value: `${Math.round(user.calorie_target || 0)}`, color: 'var(--accent-coral)' },
              { label: 'Protein', value: `${Math.round(user.protein_target || 0)}g`, color: 'var(--accent-amber)' },
            ].map((item) => (
              <div key={item.label} className="stat-card">
                <div className="stat-card-value" style={{ color: item.color, fontSize: 20 }}>{item.value}</div>
                <div className="stat-card-label">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="settings-section animate-slide-up" style={{ marginBottom: 16 }}>
          <div className="settings-item" onClick={() => setShowEditModal(true)}>
            <div className="settings-item-left">
              <div className="settings-item-icon">Edit</div>
              <span className="settings-item-label">Goals, public profile, and privacy</span>
            </div>
            <span className="settings-item-value">Open</span>
          </div>
          <div className="settings-item" onClick={toggleDarkMode}>
            <div className="settings-item-left">
              <div className="settings-item-icon">{isDark ? 'Dark' : 'Light'}</div>
              <span className="settings-item-label">Dark mode</span>
            </div>
            <div className={`toggle ${isDark ? 'on' : ''}`}><div className="toggle-thumb" /></div>
          </div>
        </div>

        <div className="settings-section animate-slide-up" style={{ marginBottom: 16, padding: 16 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 className="section-title">Public Profile</h2>
            <span className={`badge ${user.profile_visibility === 'private' ? 'badge-amber' : 'badge-lime'}`}>{user.profile_visibility}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Shareable link</span>
            <span className="stat-value">@{user.public_profile_slug || 'unset'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Achievement visibility</span>
            <span className="stat-value">{user.share_achievements ? 'Shared' : 'Hidden'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={copyPublicLink}>Copy link</button>
            {user.public_profile_slug && <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/u/${user.public_profile_slug}`)}>View public page</button>}
          </div>
        </div>

        {achievements.length > 0 && (
          <div className="settings-section animate-slide-up" style={{ marginBottom: 16, padding: 16 }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <h2 className="section-title">Achievements</h2>
              <span className="badge badge-lime">{achievements.filter((item) => item.unlocked).length} unlocked</span>
            </div>
            <div className="achievement-grid">
              {achievements.map((achievement) => {
                const progressPercent = Math.min((achievement.progress.current / achievement.progress.target) * 100, 100);
                return (
                  <div key={achievement.key} className={`achievement-card ${achievement.unlocked ? 'unlocked' : ''}`}>
                    <div className="achievement-card-head">
                      <span className="achievement-icon">{achievement.icon}</span>
                      <span className={`badge ${achievement.unlocked ? 'badge-lime' : 'badge-amber'}`}>
                        {achievement.unlocked ? 'Unlocked' : `${achievement.progress.current}/${achievement.progress.target}`}
                      </span>
                    </div>
                    <h3>{achievement.name}</h3>
                    <p>{achievement.description}</p>
                    <div className="progress-bar" style={{ marginTop: 12 }}>
                      <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button className="btn btn-secondary btn-full" onClick={handleLogout} style={{ marginBottom: 16, borderColor: 'rgba(255,107,107,0.3)', color: 'var(--accent-coral)' }}>
          Log Out
        </button>
      </div>

      {showEditModal && <ProfileSettingsModal user={user} onClose={() => setShowEditModal(false)} onSave={updateUser} />}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} onActivated={handleProActivated} />}
    </div>
  );
};

export default Profile;
