// Premium helpers — stored in localStorage, no backend needed

const TODAY = () => new Date().toISOString().split('T')[0];

export const isPro = () => localStorage.getItem('deeply_fit_pro') === 'true';

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

export const canScan = () => isPro() || getScanCount() < FREE_SCAN_LIMIT;
export const scansLeft = () => isPro() ? Infinity : Math.max(0, FREE_SCAN_LIMIT - getScanCount());

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

export const canChat = () => isPro() || getChatCount() < FREE_CHAT_LIMIT;
export const chatsLeft = () => isPro() ? Infinity : Math.max(0, FREE_CHAT_LIMIT - getChatCount());

// --- activate pro (called after payment confirmation) ---
export const activatePro = (plan) => {
  localStorage.setItem('deeply_fit_pro', 'true');
  localStorage.setItem('deeply_fit_pro_plan', plan);
  localStorage.setItem('deeply_fit_pro_since', TODAY());
};

export const deactivateLocalPro = () => {
  localStorage.removeItem('deeply_fit_pro');
  localStorage.removeItem('deeply_fit_pro_plan');
  localStorage.removeItem('deeply_fit_pro_since');
};
