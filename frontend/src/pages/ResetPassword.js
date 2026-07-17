import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import BrandLogo from '../components/BrandLogo';
import { api } from '../utils/api';
import '../styles/auth.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error('Invalid reset link');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ token, new_password: password });
      setDone(true);
      toast.success('Password updated!');
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-content">
        <div className="auth-logo">
          <div className="auth-logo-icon"><BrandLogo alt="" /></div>
          <h1>Deeply Fit</h1>
          <p>Your intelligent guide to a deeper, fitter you.</p>
        </div>

        <div className="auth-card animate-scale-in">
          {done ? (
            <>
              <h2>Password updated!</h2>
              <p className="subtitle" style={{ marginBottom: 24 }}>
                Your password has been changed. You can now sign in with your new password.
              </p>
              <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>
                → Sign In
              </button>
            </>
          ) : (
            <>
              <h2>Set new password</h2>
              <p className="subtitle">Choose a strong password for your account.</p>
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? <><span className="spinner" /> Updating...</> : '→ Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
