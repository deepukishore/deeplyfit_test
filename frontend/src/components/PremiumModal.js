import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { activatePro } from '../utils/premium';

const UPI_ID = 'deepu004.dk-4@okaxis';

const FEATURES = [
  { icon: '📸', title: 'Unlimited AI Food Scans', free: '3 scans/day', pro: 'Unlimited scans + higher accuracy model' },
  { icon: '🤖', title: 'Advanced AI Coach', free: '10 messages/day, no memory', pro: 'Unlimited messages + 30-day memory + weekly check-ins' },
  { icon: '📊', title: 'Detailed Nutrition Analytics', free: '7-day history, basic charts', pro: '30/60/90-day trends, calorie heatmap, micronutrient deep dive' },
  { icon: '🥩', title: 'Custom Macro Protocols', free: 'Standard split only', pro: 'Keto, Vegan, Athlete, Reverse Diet, Calorie Cycling & custom' },
  { icon: '🛒', title: 'Meal Prep Planner', free: 'Log one meal at a time', pro: 'Weekly planner + auto shopping list + batch cooking guide' },
  { icon: '📸', title: 'Progress Photos & Measurements', free: 'Weight tracking only', pro: 'Weekly photos, body measurements, transformation card' },
  { icon: '⏱️', title: 'Intermittent Fasting Suite', free: 'Not available', pro: 'Live timer, 7 protocols, fasting analytics, smart notifications' },
  { icon: '📋', title: 'AI Weekly Report', free: 'Not available', pro: 'Personalised Monday report with predictions & focus areas' },
  { icon: '📄', title: 'Exportable Health Reports', free: 'View in app only', pro: 'PDF, CSV, Doctor Summary Card exports' },
  { icon: '🏆', title: 'Exclusive PRO Badges', free: '4 basic badges', pro: '10 elite badges + gold profile border + leaderboard priority' },
];

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: '₹199', period: '/month', total: '₹199/month', saving: null },
  { id: 'annual', label: 'Annual', price: '₹1,999', period: '/year', total: '₹167/month billed annually', saving: 'Save ₹389' },
];

const PremiumModal = ({ onClose, onActivated }) => {
  const [plan, setPlan] = useState('annual');
  const [step, setStep] = useState('plans'); // plans | payment | verify
  const [txnId, setTxnId] = useState('');
  const [verifying, setVerifying] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === plan);

  const handleCopyUPI = async () => {
    await navigator.clipboard.writeText(UPI_ID);
    toast.success('UPI ID copied!');
  };

  const handleVerify = async () => {
    if (!txnId.trim()) {
      toast.error('Enter your UPI transaction ID');
      return;
    }
    setVerifying(true);
    // Simulate a brief verification delay — in production you'd call your backend
    await new Promise((r) => setTimeout(r, 1200));
    activatePro(plan);
    setVerifying(false);
    toast.success('🎉 Welcome to Deeply Fit PRO!');
    onActivated?.();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet premium-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        {step === 'plans' && (
          <>
            <div className="premium-hero">
              <div className="premium-badge-icon">💎</div>
              <h3 className="premium-title">Deeply Fit PRO</h3>
              <p className="premium-subtitle">Unlock your full potential with unlimited AI, advanced analytics, and exclusive features.</p>
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
              Get PRO — {selectedPlan.price}{selectedPlan.period}
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
                <strong>{selectedPlan.label} — {selectedPlan.price}{selectedPlan.period}</strong>
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
                Open any UPI app (GPay, PhonePe, Paytm, etc.), send <strong>{selectedPlan.price}</strong> to the UPI ID above, then come back and enter your transaction ID.
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
              {verifying ? <><span className="spinner" /> Activating PRO...</> : 'I have paid — Activate PRO'}
            </button>
            <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => setStep('plans')}>Back</button>
          </>
        )}
      </div>
    </div>
  );
};

export default PremiumModal;
