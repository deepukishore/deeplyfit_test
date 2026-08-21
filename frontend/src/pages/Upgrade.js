import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Bot,
  BrainCircuit,
  CalendarDays,
  ChartNoAxesCombined,
  Crown,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import '../styles/dashboard.css';

const PLANS = [
  {
    id: 'monthly',
    label: '1 Month',
    price: '₹199',
    amount: 199,
    total: '₹199 billed monthly',
  },
  {
    id: 'quarterly',
    label: '3 Months',
    price: '₹499',
    amount: 499,
    total: 'About ₹166/month',
    saving: 'Save ₹98',
  },
  {
    id: 'half_year',
    label: '6 Months',
    price: '₹999',
    amount: 999,
    total: 'About ₹167/month',
    saving: 'Popular',
  },
  {
    id: 'annual',
    label: '1 Year',
    price: '₹1,799',
    amount: 1799,
    total: 'About ₹150/month',
    saving: 'Best value',
  },
];

const FEATURES = [
  { icon: Bot, title: 'Unlimited AI Food Scans', free: '3 scans/day', pro: 'Unlimited scans' },
  { icon: BrainCircuit, title: 'Advanced AI Coach', free: '10 messages/day', pro: 'Unlimited coach messages' },
  { icon: ChartNoAxesCombined, title: 'Detailed Nutrition Analytics', free: 'Basic charts', pro: 'Long-range trends and deeper insights' },
  { icon: CalendarDays, title: 'Meal Prep Planner', free: 'Manual meal logging', pro: 'Weekly planning and shopping support' },
  { icon: BadgeCheck, title: 'Exclusive PRO Badges', free: 'Basic badges', pro: 'PRO badge and profile highlight' },
];

const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve();
    return;
  }

  const existingScript = document.getElementById('razorpay-checkout-script');
  if (existingScript) {
    existingScript.addEventListener('load', resolve, { once: true });
    existingScript.addEventListener('error', () => reject(new Error('Could not load Razorpay checkout')), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.id = 'razorpay-checkout-script';
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = resolve;
  script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
  document.body.appendChild(script);
});

const Upgrade = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const requestedPlan = PLANS.some((plan) => plan.id === location.state?.selectedPlan) ? location.state.selectedPlan : 'quarterly';
  const [selected, setSelected] = useState(requestedPlan);
  const [loading, setLoading] = useState(false);
  const selectedPlan = PLANS.find((plan) => plan.id === selected);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const data = await api.createSubscription({ plan_type: selected });
      await loadRazorpay();

      const checkout = new window.Razorpay({
        key: data.razorpay_key,
        subscription_id: data.subscription_id,
        name: 'Deeply Fit',
        description: `PRO ${selectedPlan.label} plan`,
        image: 'https://deeplyfit.vercel.app/logo192.png',
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: { color: '#a855f7' },
        handler: async (response) => {
          try {
            await api.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refreshUser();
            navigate('/payment/success', { replace: true, state: {
              plan: selected,
              amount: selectedPlan.amount,
              paymentId: response.razorpay_payment_id,
            } });
          } catch (error) {
            setLoading(false);
            navigate('/payment/pending', { state: {
              plan: selected,
              amount: selectedPlan.amount,
              message: 'Your payment was received and is waiting for final confirmation. Do not pay again.',
            } });
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      checkout.on('payment.failed', (response) => {
        setLoading(false);
        navigate('/payment/failed', { state: {
          plan: selected,
          amount: selectedPlan.amount,
          message: response?.error?.description || 'Payment failed. Please try again.',
        } });
      });
      checkout.open();
    } catch (error) {
      setLoading(false);
      navigate('/payment/failed', { state: {
        plan: selected,
        amount: selectedPlan.amount,
        message: error.message || 'Failed to start payment',
      } });
    }
  };

  return (
    <div className="page-content upgrade-page">
      <section className="upgrade-sheet" aria-labelledby="upgrade-title">
        <div className="modal-handle" aria-hidden="true" />
        <button className="premium-close upgrade-close" type="button" aria-label="Close PRO page" onClick={() => navigate(-1)}>
          <X size={20} aria-hidden="true" />
        </button>

        <div className="premium-hero">
          <div className="premium-badge-icon">
            <Crown size={25} aria-hidden="true" />
            <span>PRO</span>
          </div>
          <h1 className="premium-title" id="upgrade-title">Deeply Fit PRO</h1>
          <p className="premium-subtitle">Unlimited AI coaching, scanning, analytics, and premium progress tools.</p>
        </div>

        <div className="premium-plan-row" aria-label="Choose a PRO plan">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              className={`premium-plan-card ${selected === plan.id ? 'selected' : ''}`}
              type="button"
              aria-pressed={selected === plan.id}
              onClick={() => setSelected(plan.id)}
            >
              {plan.saving && <span className="premium-plan-badge">{plan.saving}</span>}
              <span className="premium-plan-label">{plan.label}</span>
              <span className="premium-plan-price">{plan.price}</span>
              <span className="premium-plan-total">{plan.total}</span>
            </button>
          ))}
        </div>

        <div className="premium-features-list">
          {FEATURES.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
              <div className="premium-feature-row" key={feature.title}>
                <span className="premium-feature-icon">
                  <FeatureIcon size={20} strokeWidth={2} aria-hidden="true" />
                </span>
                <div className="premium-feature-info">
                  <p className="premium-feature-title">{feature.title}</p>
                  <p className="premium-feature-free">Free: {feature.free}</p>
                  <p className="premium-feature-pro">PRO: {feature.pro}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="upgrade-actions">
          <button className="btn btn-primary btn-full premium-cta" type="button" onClick={handleUpgrade} disabled={loading}>
            {loading ? <><span className="spinner" /> Opening secure checkout...</> : `Get PRO — ${selectedPlan.price}`}
          </button>
          <p className="upgrade-trust">Secure Razorpay checkout · UPI · Cards · Net banking</p>
        </div>
      </section>
    </div>
  );
};

export default Upgrade;
