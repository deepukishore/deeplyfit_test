export const CHECKOUT_UNAVAILABLE_MESSAGE = 'Secure checkout requires a Deeply Fit development or release build. It is not available in Expo Go.';

export const openRazorpayCheckout = async (options) => {
  try {
    // Lazy loading keeps the rest of the app usable in Expo Go.
    const RazorpayCheckout = require('react-native-razorpay').default;
    if (!RazorpayCheckout?.open) throw new Error(CHECKOUT_UNAVAILABLE_MESSAGE);
    return await RazorpayCheckout.open(options);
  } catch (error) {
    const message = String(error?.description || error?.message || '');
    if (/cancel|dismiss|back button/i.test(message)) return null;
    if (/native module|native.?event.?emitter|turbo.?module|RNRazorpay|RazorpayEventEmitter|cannot read propert/i.test(message)) {
      throw new Error(CHECKOUT_UNAVAILABLE_MESSAGE);
    }
    throw new Error(message || 'Payment failed. Please try again.');
  }
};
