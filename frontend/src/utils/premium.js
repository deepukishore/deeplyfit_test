// Premium helpers — stored in localStorage, no backend needed

const TODAY = () => new Date().toISOString().split('T')[0];

export const isPro = (user = null) => {
  if (!user || user.premium_status !== 'active') return false;
  if (!user.premium_expires_at) return true;
  return new Date(user.premium_expires_at) > new Date();
};

// --- scan counter ---
const SCAN_KEY = 'deeply_fit_scans';
const FREE_SCAN_LIMIT = 3;

export const getScanCount = () => {
  try {
    const data = JSON.parse(localStorage.getItem(SCAN_KEY) || '{}');
    return data.date === TODAY() ? (data.count || 0) : 0;
  } catch { return 0; }
};

export const incrementScanCount = () => {
  const count = getScanCount() + 1;
  localStorage.setItem(SCAN_KEY, JSON.stringify({ date: TODAY(), count }));
  return count;
};

export const canScan = (premiumActive = false) => premiumActive || getScanCount() < FREE_SCAN_LIMIT;
export const scansLeft = (premiumActive = false) => premiumActive ? Infinity : Math.max(0, FREE_SCAN_LIMIT - getScanCount());

// --- AI chat counter ---
const CHAT_KEY = 'deeply_fit_chats';
const FREE_CHAT_LIMIT = 10;

export const getChatCount = () => {
  try {
    const data = JSON.parse(localStorage.getItem(CHAT_KEY) || '{}');
    return data.date === TODAY() ? (data.count || 0) : 0;
  } catch { return 0; }
};

export const incrementChatCount = () => {
  const count = getChatCount() + 1;
  localStorage.setItem(CHAT_KEY, JSON.stringify({ date: TODAY(), count }));
  return count;
};

export const canChat = (premiumActive = false) => premiumActive || getChatCount() < FREE_CHAT_LIMIT;
export const chatsLeft = (premiumActive = false) => premiumActive ? Infinity : Math.max(0, FREE_CHAT_LIMIT - getChatCount());

export const deactivateLocalPro = () => {
  localStorage.removeItem('deeply_fit_pro');
  localStorage.removeItem('deeply_fit_pro_plan');
  localStorage.removeItem('deeply_fit_pro_since');
};
