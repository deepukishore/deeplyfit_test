import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { api } from '../utils/api';
import '../styles/auth.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error('Invalid password reset request');
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
                  <label htmlFor="new-password">New Password</label>
                  <div className="auth-password-field">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <div className="auth-password-field">
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button type="button" className="auth-password-toggle" onClick={() => setShowConfirm((visible) => !visible)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                      {showConfirm ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
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
