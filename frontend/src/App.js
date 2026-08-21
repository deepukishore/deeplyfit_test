import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import { RefreshProvider } from './context/RefreshContext';

import BottomNav from './components/BottomNav';
import AmbientScene from './components/AmbientScene';
import SurfaceMotion from './components/SurfaceMotion';
import BrandLogo from './components/BrandLogo';
import OfflineBanner from './components/OfflineBanner';
import PullToRefreshShell from './components/PullToRefreshShell';
import Upgrade from './pages/Upgrade';
import {
  CookiePreferences,
  HelpCenter,
  LegalCenter,
  POLICY_DOCUMENTS,
  PolicyPage,
  Support,
} from './pages/LegalPages';
import {
  GeneralStatePage,
  LoadingState,
  NoSearchResultsPage,
  ServiceStatePage,
} from './pages/StatePages';
import {
  CancelSubscription,
  Downgrade,
  PaymentFailed,
  PaymentPending,
  PaymentSuccess,
} from './pages/SubscriptionPages';

import './styles/global.css';
import './styles/animations.css';
import './styles/effects.css';

const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Home = lazy(() => import('./pages/Home'));
const Diary = lazy(() => import('./pages/Diary'));
const Progress = lazy(() => import('./pages/Progress'));
const Community = lazy(() => import('./pages/Community'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const About = lazy(() => import('./pages/About'));
const Download = lazy(() => import('./pages/Download'));
const Landing = lazy(() => import('./pages/Landing'));

const RouteSkeleton = () => (
  <div className="page-content route-skeleton">
    <div className="page-header">
      <div className="page-header-inner">
        <div className="skeleton route-skeleton-title" />
        <div className="skeleton route-skeleton-pill" />
      </div>
    </div>
    <div className="route-skeleton-body">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="skeleton route-skeleton-card" />
      ))}
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <p>Loading Deeply Fit...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const OnboardingRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner spinner-lg" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppLayout = ({ children }) => {
  return (
    <RefreshProvider>
      <BottomNav />
      <PullToRefreshShell>
        <div className="app-container">
          <OfflineBanner />
          {children}
        </div>
      </PullToRefreshShell>
    </RefreshProvider>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <BrandLogo className="loading-brand-logo" priority />
        <div className="spinner spinner-lg" />
        <p style={{ marginTop: 16 }}>Loading Deeply Fit...</p>
      </div>
    );
  }

  const infoPage = (page) => user
    ? <AppLayout>{page}</AppLayout>
    : <div className="app-container public-info-container">{page}</div>;

  return (
    <Suspense fallback={<RouteSkeleton />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.onboarding_complete ? '/home' : '/onboarding'} replace /> : <Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/onboarding"
          element={
            <OnboardingRoute>
              <Onboarding />
            </OnboardingRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <AppLayout><Home /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/diary"
          element={
            <ProtectedRoute>
              <AppLayout><Diary /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <AppLayout><AIAssistant /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <AppLayout><Progress /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/community"
          element={
            <ProtectedRoute>
              <AppLayout><Community /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout><Profile /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/upgrade"
          element={
            <ProtectedRoute>
              <AppLayout><Upgrade /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/downgrade"
          element={<ProtectedRoute><AppLayout><Downgrade /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/cancel-subscription"
          element={<ProtectedRoute><AppLayout><CancelSubscription /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/payment/success"
          element={<ProtectedRoute><AppLayout><PaymentSuccess /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/payment/failed"
          element={<ProtectedRoute><AppLayout><PaymentFailed /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/payment/pending"
          element={<ProtectedRoute><AppLayout><PaymentPending /></AppLayout></ProtectedRoute>}
        />
        <Route
          path="/about"
          element={user ? <AppLayout><About /></AppLayout> : <About />}
        />
        <Route
          path="/download"
          element={user ? <AppLayout><Download /></AppLayout> : <Download />}
        />
        <Route path="/u/:slug" element={<div className="app-container"><PublicProfile /></div>} />
        {Object.entries(POLICY_DOCUMENTS).map(([documentKey, document]) => (
          <Route key={document.path} path={document.path} element={infoPage(<PolicyPage documentKey={documentKey} />)} />
        ))}
        <Route path="/legal" element={infoPage(<LegalCenter />)} />
        <Route path="/cookie-preferences" element={infoPage(<CookiePreferences />)} />
        <Route path="/help" element={infoPage(<HelpCenter />)} />
        <Route path="/support" element={infoPage(<Support />)} />
        <Route path="/maintenance" element={infoPage(<ServiceStatePage kind="maintenance" />)} />
        <Route path="/offline" element={infoPage(<ServiceStatePage kind="offline" />)} />
        <Route path="/session-expired" element={infoPage(<ServiceStatePage kind="session" />)} />
        <Route path="/no-search-results" element={infoPage(<NoSearchResultsPage />)} />
        <Route path="/403" element={infoPage(<GeneralStatePage kind="forbidden" />)} />
        <Route path="/500" element={infoPage(<GeneralStatePage kind="serverError" />)} />
        <Route path="/states/empty" element={infoPage(<GeneralStatePage kind="empty" />)} />
        <Route path="/states/loading" element={infoPage(<LoadingState />)} />
        <Route path="/states/error" element={infoPage(<GeneralStatePage kind="error" />)} />
        <Route path="/states/success" element={infoPage(<GeneralStatePage kind="success" />)} />
        <Route path="/" element={<Landing />} />
        <Route path="*" element={infoPage(<GeneralStatePage kind="notFound" />)} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AmbientScene />
      <SurfaceMotion />
      <AuthProvider>
        <NetworkProvider>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                maxWidth: '360px',
              },
              success: {
                iconTheme: { primary: '#a855f7', secondary: '#0a0a0f' },
              },
              error: {
                iconTheme: { primary: '#f87171', secondary: '#0a0a0f' },
              },
            }}
          />
        </NetworkProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
