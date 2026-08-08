export const PREMIUM_PLANS = {
  monthly: {
    key: 'monthly',
    title: '1 Month',
    price: 199,
    durationLabel: '1 month',
    durationDays: 30,
    subtitle: 'Best for trying PRO',
  },
  quarterly: {
    key: 'quarterly',
    title: '3 Months',
    price: 499,
    durationLabel: '3 months',
    durationDays: 90,
    subtitle: 'Save ₹98',
  },
  half_year: {
    key: 'half_year',
    title: '6 Months',
    price: 999,
    durationLabel: '6 months',
    durationDays: 180,
    subtitle: 'Popular',
  },
  annual: {
    key: 'annual',
    title: '1 Year',
    price: 1799,
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

export const isPro = (user = null) => {
  if (!user) return false;

  if (user.premium_status === 'active') {
    if (!user.premium_expires_at) return true;
    return new Date(user.premium_expires_at) > new Date();
  }

  if (!user.is_pro) return false;
  if (!user.pro_expires_at) return true;
  return new Date(user.pro_expires_at) > new Date();
};

export const getProExpiry = (user = null) => user?.premium_expires_at || user?.pro_expires_at || null;

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
