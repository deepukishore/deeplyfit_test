import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import InfoLayout from '../components/InfoLayout';
import NoSearchResults from '../components/NoSearchResults';
import { useAuth } from '../context/AuthContext';
import { useNetworkStatus } from '../context/NetworkContext';

const GENERAL_STATES = {
  notFound: { code: '404', header: 'Page not found', title: 'That page took a wrong turn', message: 'The page may have moved, the link may be outdated, or the address may be incomplete.', hint: 'Your account and saved progress are unaffected.', primary: 'Go to home', secondary: 'Go back', tone: '' },
  forbidden: { code: '403', header: 'Access denied', title: 'You cannot access this page', message: 'This area may require a different account, permission, or membership level.', hint: 'If you believe this is a mistake, contact support.', primary: 'Go back', secondary: 'Contact support', tone: 'amber' },
  serverError: { code: '500', header: 'Server error', title: 'We hit an unexpected problem', message: 'Deeply Fit could not complete that request. Your saved information has not been changed.', hint: 'Try again now, or return in a few minutes.', primary: 'Try again', secondary: 'Contact support', tone: 'coral' },
  empty: { code: '—', header: 'Nothing here yet', title: 'Start with your first entry', message: 'This space will fill up as you log meals, workouts, progress, or community activity.', hint: 'Small steps count. Add something whenever you are ready.', primary: 'Get started', tone: '' },
  error: { code: '!', header: 'Something went wrong', title: 'We could not complete that action', message: 'A temporary problem interrupted the request. Please try again.', hint: 'If it keeps happening, our support team can help.', primary: 'Try again', secondary: 'Contact support', tone: 'coral' },
  success: { code: 'OK', header: 'Success', title: 'You are all set', message: 'Your changes were saved successfully.', hint: 'You can safely continue with your Deeply Fit journey.', primary: 'Continue', tone: 'success' },
};

export const GeneralStatePage = ({ kind }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const defaults = GENERAL_STATES[kind];
  const state = location.state || {};
  const content = {
    ...defaults,
    title: state.title || defaults.title,
    message: state.message || defaults.message,
    hint: state.hint || defaults.hint,
    primary: state.primaryLabel || defaults.primary,
  };
  const fallback = user ? '/home' : '/login';
  const primary = () => {
    if (kind === 'notFound') { navigate(fallback, { replace: true }); return; }
    if (state.returnTo) { navigate(state.returnTo, { replace: kind === 'error' || kind === 'serverError' }); return; }
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback, { replace: true });
  };
  const secondary = () => {
    if (kind === 'notFound') navigate(-1);
    else navigate('/support');
  };
  return (
    <InfoLayout title={content.header} centered>
      <section className="state-card" role={kind === 'success' ? 'status' : 'alert'}>
        <div className={`state-mark ${content.tone}`}>{content.code}</div>
        <h2>{content.title}</h2>
        <p>{content.message}</p>
        <span className="state-hint">{content.hint}</span>
        <div className="state-actions">
          <button type="button" className="btn btn-primary btn-full" onClick={primary}>{content.primary}</button>
          {content.secondary && <button type="button" className="state-text-action" onClick={secondary}>{content.secondary}</button>}
        </div>
      </section>
    </InfoLayout>
  );
};

export const LoadingState = () => {
  const { state = {} } = useLocation();
  return (
    <InfoLayout title="Loading" centered>
      <section className="state-card" role="status" aria-live="polite">
        <div className="state-mark"><LoaderCircle size={34} className="spin" /></div>
        <h2>{state.title || 'Getting things ready'}</h2>
        <p>{state.message || 'We are loading the latest information for you.'}</p>
        <div className="state-progress"><span /></div>
        <span className="state-hint">This should only take a moment.</span>
      </section>
    </InfoLayout>
  );
};

const SERVICE_STATES = {
  maintenance: { mark: 'MT', header: 'Maintenance', title: 'A quick tune-up', message: 'Deeply Fit is temporarily unavailable while we improve the service. Your saved account data is safe.', hint: 'Please try again in a few minutes.' },
  offline: { mark: 'OF', header: 'Offline', title: 'You are offline', message: 'You can keep using recently cached diary information. Supported changes sync automatically when your connection returns.', hint: 'Check Wi-Fi or mobile data, then try again.' },
  session: { mark: 'EX', header: 'Session expired', title: 'Your session expired', message: 'For your security, you have been signed out. Sign in again to continue where you left off.', hint: 'Your account information has not been deleted.' },
};

export const ServiceStatePage = ({ kind }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { online, syncing, syncOfflineChanges } = useNetworkStatus();
  const [checking, setChecking] = useState(false);
  const content = SERVICE_STATES[kind];
  const act = async () => {
    if (kind === 'session') { logout(); navigate('/login', { replace: true }); return; }
    setChecking(true);
    try {
      if (kind === 'offline' && online) await syncOfflineChanges(true);
      navigate(user ? '/home' : '/login', { replace: true });
    } finally { setChecking(false); }
  };
  const label = kind === 'session' ? 'Sign in again' : kind === 'offline' && online ? 'Continue online' : 'Try again';
  return (
    <InfoLayout title={content.header} centered>
      <section className="state-card" role="alert">
        <div className="state-mark coral">{content.mark}</div>
        <h2>{content.title}</h2>
        <p>{content.message}</p>
        <span className="state-hint">{kind === 'offline' && online ? 'Connection restored' : content.hint}</span>
        <div className="state-actions">
          <button type="button" className="btn btn-primary btn-full" onClick={act} disabled={checking || syncing}>{checking || syncing ? 'Checking…' : label}</button>
          {kind !== 'session' && <button type="button" className="state-text-action" onClick={() => navigate('/support')}>Contact support</button>}
        </div>
      </section>
    </InfoLayout>
  );
};

export const NoSearchResultsPage = () => {
  const navigate = useNavigate();
  const { state = {} } = useLocation();
  return <InfoLayout title="Search" centered><NoSearchResults query={state.query} onClear={() => navigate(-1)} /></InfoLayout>;
};
