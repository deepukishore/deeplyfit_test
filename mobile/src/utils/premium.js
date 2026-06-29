import { Linking } from 'react-native';

export const UPI_ID = 'deepu004.dk-4@okaxis';

export const PREMIUM_PLANS = {
  monthly: {
    key: 'monthly',
    title: 'Monthly',
    price: 99,
    durationLabel: '1 month',
    durationDays: 30,
    subtitle: 'Best for trying PRO',
  },
  annual: {
    key: 'annual',
    title: 'Annual',
    price: 999,
    durationLabel: '1 year',
    durationDays: 365,
    subtitle: 'Best value',
  },
};

export const PRO_FEATURES = [
  'Unlimited AI food scans',
  'Unlimited AI coach messages',
  '30/60/90-day nutrition trends',
  'Meal prep planner and shopping lists',
  'Progress photos and body measurements',
  'Intermittent fasting suite',
  'Weekly AI reports and exports',
  'Exclusive PRO badges',
];

export const buildUpiPaymentUrl = ({ plan, name = 'Deeply Fit PRO' }) => {
  const selectedPlan = PREMIUM_PLANS[plan] || PREMIUM_PLANS.monthly;
  const params = [
    `pa=${encodeURIComponent(UPI_ID)}`,
    `pn=${encodeURIComponent(name)}`,
    `am=${encodeURIComponent(String(selectedPlan.price))}`,
    'cu=INR',
    `tn=${encodeURIComponent(`Deeply Fit PRO ${selectedPlan.title}`)}`,
  ].join('&');
  return `upi://pay?${params}`;
};

export const openUpiPayment = async (plan) => {
  const url = buildUpiPaymentUrl({ plan });
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error('No UPI app found on this device');
  }
  return Linking.openURL(url);
};

export const formatPremiumExpiry = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
