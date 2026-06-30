import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import { deactivateLocalPro } from '../utils/premium';

const UPI_ID = 'deepu004.dk-4@okaxis';

const FEATURES = [
  { icon: 'AI', title: 'Unlimited AI Food Scans', free: '3 scans/day', pro: 'Unlimited scans' },
  { icon: 'AI', title: 'Advanced AI Coach', free: '10 messages/day', pro: 'Unlimited coach messages' },
  { icon: 'Chart', title: 'Detailed Nutrition Analytics', free: 'Basic charts', pro: 'Long-range trends and deeper insights' },
  { icon: 'Meal', title: 'Meal Prep Planner', free: 'Manual meal logging', pro: 'Weekly planning and shopping support' },
  { icon: 'Badge', title: 'Exclusive PRO Badges', free: 'Basic badges', pro: 'PRO badge and profile highlight' },
];

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: 'Rs 99', amount: 99, period: '/month', total: 'Rs 99/month', saving: null },
  { id: 'annual', label: 'Annual', price: 'Rs 999', amount: 999, period: '/year', total: 'Rs 83/month billed annually', saving: 'Best value' },
];

const PremiumModal = ({ onClose, onActivated }) => {
  const [plan, setPlan] = useState('annual');
  const [step, setStep] = useState('plans');
  const [txnId, setTxnId] = useState('');
  const [verifying, setVerifying] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === plan);

  const handleCopyUPI = async () => {
    await navigator.clipboard.writeText(UPI_ID);
    toast.success('UPI ID copied');
  };

  const handleVerify = async () => {
    const paymentReference = txnId.trim();
    if (!paymentReference) {
      toast.error('Enter your UPI transaction ID');
      return;
    }

    setVerifying(true);
    try {
      const updatedUser = await api.activatePremium({
        plan,
        payment_reference: paymentReference,
        payment_method: 'upi',
      });
      deactivateLocalPro();
      toast.success('Payment reference submitted for verification');
      onActivated?.(updatedUser);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not submit payment reference');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet premium-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        {step === 'plans' && (
          <>
            <div className="premium-hero">
              <div className="premium-badge-icon">PRO</div>
              <h3 className="premium-title">Deeply Fit PRO</h3>
              <p className="premium-subtitle">Unlimited AI coaching, scanning, analytics, and premium progress tools.</p>
            </div>

            <div className="premium-plan-row">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  className={`premium-plan-card ${plan === p.id ? 'selected' : ''}`}
                  onClick={() => setPlan(p.id)}
                >
                  {p.saving && <span className="premium-plan-badge">{p.saving}</span>}
                  <div className="premium-plan-label">{p.label}</div>
                  <div className="premium-plan-price">{p.price}</div>
                  <div className="premium-plan-period">{p.period}</div>
                  <div className="premium-plan-total">{p.total}</div>
                </button>
              ))}
            </div>

            <div className="premium-features-list">
              {FEATURES.map((f) => (
                <div key={f.title} className="premium-feature-row">
                  <span className="premium-feature-icon">{f.icon}</span>
                  <div className="premium-feature-info">
                    <p className="premium-feature-title">{f.title}</p>
                    <p className="premium-feature-free">Free: {f.free}</p>
                    <p className="premium-feature-pro">PRO: {f.pro}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-primary btn-full premium-cta" onClick={() => setStep('payment')}>
              Get PRO - {selectedPlan.price}{selectedPlan.period}
            </button>
            <button className="btn btn-ghost btn-full" onClick={onClose} style={{ marginTop: 8 }}>Maybe later</button>
          </>
        )}

        {step === 'payment' && (
          <>
            <h3 className="modal-title">Complete Payment</h3>
            <div className="premium-payment-card">
              <div className="premium-payment-row">
                <span>Plan</span>
                <strong>{selectedPlan.label} - {selectedPlan.price}{selectedPlan.period}</strong>
              </div>
              <div className="premium-payment-row">
                <span>Pay via UPI</span>
                <strong style={{ color: 'var(--accent-lime)' }}>{UPI_ID}</strong>
              </div>
            </div>

            <div className="premium-upi-box">
              <p className="premium-upi-label">UPI ID</p>
              <div className="premium-upi-row">
                <span className="premium-upi-id">{UPI_ID}</span>
                <button className="btn btn-secondary btn-sm" onClick={handleCopyUPI}>Copy</button>
              </div>
              <p className="premium-upi-hint">
                Open any UPI app and send <strong>{selectedPlan.price}</strong> to this UPI ID, then enter your transaction ID for manual verification.
              </p>
            </div>

            <div className="input-group" style={{ marginTop: 16 }}>
              <label>UPI Transaction ID</label>
              <input
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                placeholder="e.g. 412345678901"
              />
            </div>

            <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={handleVerify} disabled={verifying}>
              {verifying ? <><span className="spinner" /> Submitting...</> : 'I have paid - Submit for verification'}
            </button>
            <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => setStep('plans')}>Back</button>
          </>
        )}
      </div>
    </div>
  );
};

export default PremiumModal;
