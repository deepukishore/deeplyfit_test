import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import '../styles/auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await api.forgotPassword({ email });
      setSent(true);
      toast.success('Reset link sent! Check your inbox.');
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
          <div className="auth-logo-icon">⚡</div>
          <h1>Deeply Fit</h1>
          <p>Your intelligent guide to a deeper, fitter you.</p>
        </div>

        <div className="auth-card animate-scale-in">
          {sent ? (
            <>
              <h2>Check your email</h2>
              <p className="subtitle" style={{ marginBottom: 24 }}>
                We sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
              </p>
              <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>
                ← Back to Sign In
              </button>
            </>
          ) : (
            <>
              <h2>Forgot password?</h2>
              <p className="subtitle">Enter your email and we'll send you a reset link.</p>
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? <><span className="spinner" /> Sending...</> : '→ Send Reset Link'}
                </button>
              </form>
              <div className="auth-switch">
                Remember your password?
                <button onClick={() => navigate('/login')}>Sign in</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
