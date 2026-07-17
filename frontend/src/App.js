import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import { RefreshProvider } from './context/RefreshContext';

import BottomNav from './components/BottomNav';
import AmbientScene from './components/AmbientScene';
import OfflineBanner from './components/OfflineBanner';
import PullToRefreshShell from './components/PullToRefreshShell';

import './styles/global.css';
import './styles/animations.css';

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
      <PullToRefreshShell>
        <div className="app-container">
          <OfflineBanner />
          {children}
          <BottomNav />
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div className="spinner spinner-lg" />
        <p style={{ marginTop: 16 }}>Loading Deeply Fit...</p>
      </div>
    );
  }

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
              <div className="app-container"><Onboarding /></div>
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
          path="/about"
          element={user ? <AppLayout><About /></AppLayout> : <About />}
        />
        <Route
          path="/download"
          element={user ? <AppLayout><Download /></AppLayout> : <Download />}
        />
        <Route path="/u/:slug" element={<div className="app-container"><PublicProfile /></div>} />
        <Route path="/" element={<Navigate to={user ? (user.onboarding_complete ? '/home' : '/onboarding') : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AmbientScene />
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
