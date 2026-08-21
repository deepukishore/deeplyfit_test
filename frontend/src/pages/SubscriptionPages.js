import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import InfoLayout, { InfoBullets, InfoSection } from '../components/InfoLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { isPro } from '../utils/premium';

const PLAN_LABELS = { monthly: '1 Month', quarterly: '3 Months', half_year: '6 Months', annual: '1 Year' };
const expiryFor = (user) => user?.premium_expires_at || user?.pro_expires_at || null;
const formatExpiry = (user) => {
  const value = expiryFor(user);
  if (!value) return 'the end of your current billing period';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'the end of your current billing period' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const Downgrade = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const active = isPro(user);
  return (
    <InfoLayout title="Downgrade" eyebrow="Plan options" intro="Review what changes before moving from PRO to the free plan.">
      <div className="subscription-comparison">
        <div><small>CURRENT</small><strong>{active ? 'PRO' : 'Free'}</strong><p>{active ? 'All premium tools and higher usage limits.' : 'Core tracking and community features.'}</p></div>
        <span className="subscription-arrow">→</span>
        <div><small>NEXT</small><strong>Free</strong><p>Core tracking remains available after PRO ends.</p></div>
      </div>
      <InfoSection title="What happens">
        <InfoBullets items={[
          `PRO remains available until ${formatExpiry(user)}.`,
          'Future renewals stop after cancellation is confirmed.',
          'Your account, diary history, and profile are not deleted.',
          'Premium-only features become unavailable when the paid period ends.',
        ]} />
      </InfoSection>
      <div className="info-button-stack">
        <button type="button" className="btn btn-primary btn-full" onClick={() => navigate(active ? '/cancel-subscription' : '/upgrade')}>{active ? 'Continue to downgrade' : 'View PRO plans'}</button>
        <button type="button" className="btn btn-secondary btn-full" onClick={() => navigate(-1)}>Keep current plan</button>
      </div>
    </InfoLayout>
  );
};

export const CancelSubscription = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const canCancel = isPro(user) && Boolean(user?.subscription_id);
  const cancel = async () => {
    if (!window.confirm('Cancel future renewals? Your PRO access will continue until the current paid period ends.')) return;
    setCancelling(true);
    try {
      const response = await api.cancelSubscription();
      const updated = await refreshUser();
      navigate('/states/success', { replace: true, state: {
        title: 'Renewal cancelled',
        message: response.message || 'Your subscription will not renew.',
        hint: `PRO remains available until ${formatExpiry(updated || user)}.`,
        primaryLabel: 'Back to profile',
        returnTo: '/profile',
      } });
    } catch (error) {
      navigate('/states/error', { state: {
        title: 'Cancellation failed',
        message: error.message || 'We could not cancel your subscription.',
        hint: 'No subscription changes were made. Try again or contact support.',
        primaryLabel: 'Try again',
        returnTo: '/cancel-subscription',
      } });
    } finally { setCancelling(false); }
  };
  return (
    <InfoLayout title="Cancel Subscription" eyebrow="Final confirmation" intro="Cancellation stops future renewal. It does not delete your account or erase your fitness data.">
      <InfoSection title="Current subscription">
        <p>Plan: {user?.premium_plan || (isPro(user) ? 'PRO' : 'Free')}</p>
        <p>Access through: {formatExpiry(user)}</p>
      </InfoSection>
      <InfoSection title="Before you cancel"><InfoBullets items={['You keep PRO until the current billing period ends.', 'No further renewal should be collected after cancellation is confirmed.', 'You can subscribe again later from the Upgrade page.']} /></InfoSection>
      <div className="info-button-stack">
        <button type="button" className="btn btn-full danger-button" onClick={cancel} disabled={!canCancel || cancelling}>{cancelling ? 'Cancelling…' : canCancel ? 'Cancel renewal' : 'No renewable subscription found'}</button>
        <button type="button" className="btn btn-secondary btn-full" onClick={() => navigate(-1)}>Keep PRO</button>
      </div>
      {!user?.subscription_id && <p className="info-footer-note">If you subscribed through an app store, manage cancellation in that store’s subscription settings.</p>}
    </InfoLayout>
  );
};

const PaymentOutcome = ({ status }) => {
  const navigate = useNavigate();
  const { state = {} } = useLocation();
  const { refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const success = status === 'success';
  const failed = status === 'failed';
  const title = success ? 'Payment successful' : failed ? 'Payment failed' : 'Payment pending';
  const body = success
    ? `Your ${PLAN_LABELS[state.plan] || 'PRO'} Deeply Fit PRO plan is active.`
    : failed
      ? (state.message || 'We could not complete your payment. You have not been upgraded.')
      : (state.message || 'Your payment is still being confirmed. Do not start another payment for the same plan yet.');
  const check = async () => {
    setChecking(true);
    try {
      const result = await api.subscriptionStatus();
      if (result.is_active) {
        await refreshUser();
        navigate('/payment/success', { replace: true, state });
      } else toast('Payment is still pending');
    } catch (error) { toast.error(error.message || 'Could not check payment status'); }
    finally { setChecking(false); }
  };
  return (
    <InfoLayout title={title} centered>
      <section className="state-card" role={success ? 'status' : 'alert'}>
        <div className={`state-mark ${success ? 'success' : failed ? 'coral' : 'amber'}`}>{success ? 'OK' : failed ? '!' : '…'}</div>
        <h2>{title}</h2>
        <p>{body}</p>
        {state.amount && <p className="payment-amount">₹{Number(state.amount).toLocaleString('en-IN')}</p>}
        {state.paymentId && <p className="payment-reference">Reference: {state.paymentId}</p>}
        <div className="state-actions">
          {success && <button type="button" className="btn btn-primary btn-full" onClick={() => navigate('/profile', { replace: true })}>Continue to PRO</button>}
          {failed && <button type="button" className="btn btn-primary btn-full" onClick={() => navigate('/upgrade', { replace: true, state: { selectedPlan: state.plan } })}>Try payment again</button>}
          {!success && !failed && <button type="button" className="btn btn-primary btn-full" onClick={check} disabled={checking}>{checking ? 'Checking…' : 'Check payment status'}</button>}
          {!success && <button type="button" className="state-text-action" onClick={() => navigate('/support')}>Contact support</button>}
        </div>
      </section>
    </InfoLayout>
  );
};

export const PaymentSuccess = () => <PaymentOutcome status="success" />;
export const PaymentFailed = () => <PaymentOutcome status="failed" />;
export const PaymentPending = () => <PaymentOutcome status="pending" />;
