import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      let user;
      if (mode === 'login') {
        user = await login(email, password);
        toast.success(`Welcome back! 💪`);
      } else {
        user = await register(email, password, name);
        toast.success(`Account created! Let's set up your profile 🎯`);
      }

      if (!user.onboarding_complete) {
        navigate('/onboarding');
      } else {
        navigate('/home');
      }
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
          <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p className="subtitle">
            {mode === 'login'
              ? 'Sign in to continue your journey'
              : 'Start your transformation today'}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="input-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: 6 }}>
                  <Link
                    to="/forgot-password"
                    style={{ fontSize: 13, color: 'var(--accent-lime)', textDecoration: 'none' }}
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <><span className="spinner" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
              ) : (
                mode === 'login' ? '→ Sign In' : '→ Create Account'
              )}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>
                Don't have an account?
                <button onClick={() => setMode('register')}>Sign up free</button>
              </>
            ) : (
              <>
                Already have an account?
                <button onClick={() => setMode('login')}>Sign in</button>
              </>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 24 }}>
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;
