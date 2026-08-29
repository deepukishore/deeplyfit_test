import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import BrandLogo from '../components/BrandLogo';
import { api } from '../utils/api';
import '../styles/auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('email');
  const [developmentOtp, setDevelopmentOtp] = useState('');
  const navigate = useNavigate();
  const normalizedEmail = email.trim().toLowerCase();

  const sendOtp = async (event) => {
    event?.preventDefault();
    if (!normalizedEmail) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await api.forgotPassword({ email: normalizedEmail });
      setDevelopmentOtp(response.development_otp || '');
      setStep('otp');
      toast.success('Verification code sent. Check your email.');
    } catch (err) {
      toast.error(err.message || 'Could not send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error('Enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.verifyResetOtp({ email: normalizedEmail, otp });
      toast.success('Email confirmed. Set your new password.');
      navigate(`/reset-password?token=${encodeURIComponent(response.reset_token)}`);
    } catch (err) {
      toast.error(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const changeEmail = () => {
    setStep('email');
    setOtp('');
    setDevelopmentOtp('');
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
          {step === 'otp' ? (
            <>
              <h2>Enter verification code</h2>
              <p className="subtitle">
                Enter the 6-digit code sent to <strong>{normalizedEmail}</strong>. It expires in 10 minutes.
              </p>
              {developmentOtp && <p className="auth-development-code">Development code: {developmentOtp}</p>}
              <form className="auth-form" onSubmit={verifyOtp}>
                <div className="input-group">
                  <label htmlFor="reset-otp">Verification Code</label>
                  <input
                    id="reset-otp"
                    className="auth-otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    placeholder="000000"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoComplete="one-time-code"
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? <><span className="spinner" /> Confirming...</> : 'Confirm Code'}
                </button>
              </form>
              <div className="auth-otp-actions">
                <button type="button" onClick={() => sendOtp()} disabled={loading}>Resend code</button>
                <button type="button" onClick={changeEmail} disabled={loading}>Change email</button>
              </div>
              <div className="auth-switch">
                <button type="button" onClick={() => navigate('/login')}>Back to Sign In</button>
              </div>
            </>
          ) : (
            <>
              <h2>Forgot password?</h2>
              <p className="subtitle">Confirm your email and we'll send you a 6-digit verification code.</p>
              <form className="auth-form" onSubmit={sendOtp}>
                <div className="input-group">
                  <label htmlFor="reset-email">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? <><span className="spinner" /> Sending...</> : 'Send Verification Code'}
                </button>
              </form>
              <div className="auth-switch">
                Remember your password?
                <button type="button" onClick={() => navigate('/login')}>Sign in</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
