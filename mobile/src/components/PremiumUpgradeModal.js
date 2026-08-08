import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';
import { colors, radius, spacing } from '../utils/theme';
import { formatPremiumExpiry, getProExpiry, isPro, PREMIUM_PLANS, PRO_FEATURES } from '../utils/premium';

const CHECKOUT_UNAVAILABLE_MESSAGE = 'Secure checkout requires a Deeply Fit development or release build. It is not available in Expo Go.';

const openRazorpayCheckout = async (options) => {
  try {
    // Loading lazily lets the rest of the app continue to run in Expo Go.
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

const PremiumUpgradeModal = ({ visible, onClose, onActivated, currentUser }) => {
  const [plan, setPlan] = useState('quarterly');
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const selectedPlan = useMemo(() => PREMIUM_PLANS[plan], [plan]);
  const premiumActive = isPro(currentUser);
  const premiumExpiry = getProExpiry(currentUser);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const subscription = await api.createSubscription({ plan_type: plan });
      const payment = await openRazorpayCheckout({
        key: subscription.razorpay_key,
        subscription_id: subscription.subscription_id,
        name: 'Deeply Fit',
        description: `PRO ${selectedPlan.title} plan`,
        currency: 'INR',
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || '',
        },
        theme: { color: colors.accentPurple },
      });

      if (!payment) return;
      if (!payment.razorpay_payment_id || !payment.razorpay_subscription_id || !payment.razorpay_signature) {
        throw new Error('Razorpay did not return complete payment details. Contact support if you were charged.');
      }

      await api.verifyPayment({
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_subscription_id: payment.razorpay_subscription_id,
        razorpay_signature: payment.razorpay_signature,
      });
      const updatedUser = await api.me().catch(() => null);
      if (updatedUser && onActivated) onActivated(updatedUser);
      Toast.show({ type: 'success', text1: 'Welcome to Deeply Fit PRO!' });
      onClose();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: error.message || 'Could not complete payment',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await api.cancelSubscription();
      const updatedUser = await api.me().catch(() => null);
      if (updatedUser && onActivated) onActivated(updatedUser);
      Toast.show({
        type: 'success',
        text1: response.message || 'Subscription cancelled',
        text2: 'PRO remains active until the end of the billing period.',
      });
    } catch (error) {
      Toast.show({ type: 'error', text1: error.message || 'Could not cancel subscription' });
    } finally {
      setCancelling(false);
    }
  };

  const confirmCancel = () => {
    Alert.alert(
      'Cancel renewal?',
      'Future renewals will stop, but PRO access will continue until the current billing period ends.',
      [
        { text: 'Keep subscription', style: 'cancel' },
        { text: 'Cancel renewal', style: 'destructive', onPress: handleCancel },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.page}>
        <View style={s.header}>
          <View style={s.headerCopy}>
            <Text style={s.title}>Deeply Fit PRO</Text>
            <Text style={s.subtitle}>Unlimited coaching, scanning, analytics, and progress tools</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close PRO page" style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeText}>X</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>
          {premiumActive ? (
            <View style={[s.section, s.activeSection]}>
              <Text style={s.activeBadge}>PRO ACTIVE</Text>
              <Text style={s.sectionTitle}>Current subscription</Text>
              <Text style={s.detailText}>Plan: {currentUser?.premium_plan || 'PRO'}</Text>
              <Text style={s.detailText}>Expires: {formatPremiumExpiry(premiumExpiry) || 'No expiry date'}</Text>
              {currentUser?.subscription_id ? (
                <TouchableOpacity
                  style={[s.cancelBtn, cancelling && s.disabled]}
                  onPress={confirmCancel}
                  disabled={cancelling}
                >
                  {cancelling
                    ? <ActivityIndicator color={colors.accentCoral} />
                    : <Text style={s.cancelBtnText}>Cancel renewal</Text>}
                </TouchableOpacity>
              ) : null}
              <Text style={s.noteText}>Cancellation stops future renewals. Your PRO access continues until the date shown above.</Text>
            </View>
          ) : (
            <>
              <View style={s.priceGrid} accessibilityLabel="Choose a PRO plan">
                {Object.values(PREMIUM_PLANS).map((option) => {
                  const active = plan === option.key;
                  return (
                    <TouchableOpacity
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      key={option.key}
                      style={[s.planCard, active && s.planCardActive]}
                      onPress={() => setPlan(option.key)}
                    >
                      <Text style={s.planTitle}>{option.title}</Text>
                      <Text style={s.planPrice}>{`\u20B9${option.price.toLocaleString('en-IN')}`}</Text>
                      <Text style={s.planSubtitle}>{option.durationLabel} - {option.subtitle}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>What PRO unlocks</Text>
                {PRO_FEATURES.map((feature) => (
                  <View key={feature} style={s.featureRow}>
                    <Text style={s.featureIcon}>+</Text>
                    <Text style={s.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>Secure checkout</Text>
                <Text style={s.detailText}>Pay securely with the payment methods Razorpay offers for this subscription.</Text>
                <TouchableOpacity
                  style={[s.payBtn, loading && s.disabled]}
                  onPress={handleUpgrade}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={colors.textInverse} />
                    : <Text style={s.payBtnText}>{`Get PRO - \u20B9${selectedPlan.price.toLocaleString('en-IN')}`}</Text>}
                </TouchableOpacity>
                <Text style={s.noteText}>Your membership is activated only after the backend verifies Razorpay's payment signature.</Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: 56,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textPrimary, fontWeight: '800', fontSize: 14 },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, paddingBottom: 40 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  planCard: {
    width: '47%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardActive: { borderColor: colors.accentLime, backgroundColor: 'rgba(200,241,53,0.08)' },
  planTitle: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  planPrice: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 8 },
  planSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  section: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  activeSection: { borderColor: colors.accentLime },
  activeBadge: { alignSelf: 'flex-start', color: colors.textInverse, backgroundColor: colors.accentLime, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontSize: 11, fontWeight: '800', marginBottom: 12 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureIcon: { color: colors.accentLime, fontSize: 18, fontWeight: '800', marginRight: 10 },
  featureText: { color: colors.textSecondary, fontSize: 14, flex: 1 },
  detailText: { color: colors.textMuted, fontSize: 13, marginBottom: 8, lineHeight: 19 },
  payBtn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  payBtnText: { color: colors.textInverse, fontWeight: '800', fontSize: 15 },
  cancelBtn: { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.accentCoral, marginTop: 10 },
  cancelBtnText: { color: colors.accentCoral, fontWeight: '800', fontSize: 14 },
  noteText: { color: colors.textMuted, fontSize: 12, marginTop: 10, lineHeight: 18 },
  disabled: { opacity: 0.6 },
});

export default PremiumUpgradeModal;
