import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Activity, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

const TICKER_ITEMS = [
  '10,000+ meals tracked',
  '5,000+ workouts logged',
  'AI-powered coaching',
  'Real results, real people',
];

const Login = () => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
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
      const user = mode === 'login'
        ? await login(email, password)
        : await register(email, password, name);

      toast.success(mode === 'login' ? 'Welcome back!' : "Account created! Let's set up your profile.");
      navigate(user.onboarding_complete ? '/home' : '/onboarding');
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setPassword('');
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true">
        <span className="auth-aurora auth-aurora-lime" />
        <span className="auth-aurora auth-aurora-purple" />
        <span className="auth-aurora auth-aurora-amber" />
      </div>

      <main className="auth-content">
        <header className="auth-logo">
          <Link className="auth-logo-icon" to="/" aria-label="Deeplyfit home">
            <Zap size={34} fill="currentColor" />
          </Link>
          <h1>Deeplyfit</h1>
          <p className="auth-typewriter">Intelligently deep. Deeply fit.</p>
        </header>

        <div className="auth-ticker" aria-label="Deeplyfit highlights">
          <div className="auth-ticker-track">
            {[0, 1].map((copy) => (
              <span className="auth-ticker-copy" key={copy}>
                {TICKER_ITEMS.map((item, index) => (
                  <React.Fragment key={`${copy}-${item}`}>
                    <span>{index === 0 && <Activity size={14} />}{index === 2 && <Sparkles size={14} />}{item}</span>
                    <i />
                  </React.Fragment>
                ))}
              </span>
            ))}
          </div>
        </div>

        <section className="auth-card animate-slide-up">
          <div className="auth-card-heading">
            <p>{mode === 'login' ? 'Member access' : 'Start your plan'}</p>
            <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <span>
              {mode === 'login'
                ? 'Sign in to continue your journey.'
                : 'Your adaptive fitness plan starts here.'}
            </span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="input-group">
                <label htmlFor="auth-name">Full Name</label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Alex Johnson"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="input-group">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="alex@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder="Enter at least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              {mode === 'login' && (
                <Link className="auth-forgot-link" to="/forgot-password">Forgot password?</Link>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-full auth-submit" disabled={loading}>
              {loading ? (
                <><span className="spinner" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
              ) : (
                <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </div>
        </section>

        <p className="auth-motivation">Join 10,000+ people transforming their lives with Deeplyfit.</p>
        <p className="auth-legal">By continuing, you agree to our Terms &amp; Privacy Policy.</p>
        <nav className="auth-about-link" aria-label="Public pages">
          <Link to="/about">About Deeplyfit</Link>
          <span aria-hidden="true"> / </span>
          <Link to="/download">Download Android app</Link>
        </nav>
      </main>
    </div>
  );
};

export default Login;
