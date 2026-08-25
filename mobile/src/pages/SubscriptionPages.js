import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import InfoPageLayout, { InfoBullet, InfoParagraph, InfoSection, infoPageStyles } from '../components/InfoPageLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { openRazorpayCheckout } from '../utils/payments';
import { formatPremiumExpiry, getProExpiry, isPro, PREMIUM_PLANS, PRO_FEATURES } from '../utils/premium';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';

const planLabel = (planKey) => PREMIUM_PLANS[planKey]?.title || 'PRO';

export const Upgrade = ({ navigation, route }) => {
  const { user, updateUser } = useAuth();
  const initialPlan = PREMIUM_PLANS[route.params?.selectedPlan] ? route.params.selectedPlan : 'quarterly';
  const [plan, setPlan] = useState(initialPlan);
  const [loading, setLoading] = useState(false);
  const selectedPlan = useMemo(() => PREMIUM_PLANS[plan], [plan]);
  const premiumActive = isPro(user);

  const handleUpgrade = async () => {
    if (premiumActive) {
      Toast.show({ type: 'info', text1: 'Your PRO plan is already active' });
      return;
    }
    let checkoutCompleted = false;
    setLoading(true);
    try {
      const subscription = await api.createSubscription({ plan_type: plan });
      const payment = await openRazorpayCheckout({
        key: subscription.razorpay_key,
        subscription_id: subscription.subscription_id,
        name: 'Deeply Fit',
        description: `PRO ${selectedPlan.title} plan`,
        currency: 'INR',
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: colors.accentPurple },
      });

      if (!payment) return;
      if (!payment.razorpay_payment_id || !payment.razorpay_subscription_id || !payment.razorpay_signature) {
        navigation.replace('PaymentPending', { plan, amount: selectedPlan.price });
        return;
      }
      checkoutCompleted = true;

      await api.verifyPayment({
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_subscription_id: payment.razorpay_subscription_id,
        razorpay_signature: payment.razorpay_signature,
      });
      const updatedUser = await api.me().catch(() => null);
      if (updatedUser) updateUser(updatedUser);
      navigation.replace('PaymentSuccess', {
        plan,
        amount: selectedPlan.price,
        paymentId: payment.razorpay_payment_id,
      });
    } catch (error) {
      navigation.navigate(checkoutCompleted ? 'PaymentPending' : 'PaymentFailed', {
        plan,
        amount: selectedPlan.price,
        message: checkoutCompleted
          ? 'Your payment was received and is waiting for final confirmation. Do not pay again.'
          : (error.message || 'We could not complete your payment.'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <InfoPageLayout
      navigation={navigation}
      title="Upgrade"
      eyebrow="Deeply Fit PRO"
      intro="Choose the plan that fits your routine. Every PRO plan includes the complete premium feature set."
    >
      {premiumActive ? (
        <InfoSection title="PRO is already active">
          <InfoParagraph>Your {user?.premium_plan || 'PRO'} plan is active until {formatPremiumExpiry(getProExpiry(user)) || 'the date shown in your account'}.</InfoParagraph>
        </InfoSection>
      ) : null}

      <View style={s.planGrid} accessibilityLabel="Choose a PRO plan">
        {Object.values(PREMIUM_PLANS).map((option) => {
          const selected = plan === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[s.planCard, selected && s.planCardSelected]}
              onPress={() => setPlan(option.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Text style={s.planName}>{option.title}</Text>
              <Text style={s.price}>{`₹${option.price.toLocaleString('en-IN')}`}</Text>
              <Text style={s.planDetail}>{option.subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <InfoSection title="Everything included">
        {PRO_FEATURES.map((feature) => <InfoBullet key={feature}>{feature}</InfoBullet>)}
      </InfoSection>

      <TouchableOpacity style={[shared.button, loading && s.disabled]} onPress={handleUpgrade} disabled={loading || premiumActive}>
        {loading
          ? <ActivityIndicator color={colors.textInverse} />
          : <Text style={shared.buttonText}>{premiumActive ? 'Current plan active' : `Continue — ₹${selectedPlan.price.toLocaleString('en-IN')}`}</Text>}
      </TouchableOpacity>
      <Text style={s.secureNote}>Secure payment by Razorpay. PRO activates only after server-side payment verification.</Text>
    </InfoPageLayout>
  );
};

export const Downgrade = ({ navigation }) => {
  const { user } = useAuth();
  const active = isPro(user);
  return (
    <InfoPageLayout
      navigation={navigation}
      title="Downgrade"
      eyebrow="Plan options"
      intro="Review what changes before moving from PRO to the free plan."
    >
      <View style={s.comparison}>
        <View style={s.comparisonColumn}>
          <Text style={s.comparisonEyebrow}>CURRENT</Text>
          <Text style={s.comparisonTitle}>{active ? 'PRO' : 'Free'}</Text>
          <Text style={s.comparisonCopy}>{active ? 'All premium tools and higher usage limits.' : 'Core tracking and community features.'}</Text>
        </View>
        <Text style={s.comparisonArrow}>→</Text>
        <View style={s.comparisonColumn}>
          <Text style={s.comparisonEyebrow}>NEXT</Text>
          <Text style={s.comparisonTitle}>Free</Text>
          <Text style={s.comparisonCopy}>Core tracking remains available after PRO ends.</Text>
        </View>
      </View>
      <InfoSection title="What happens">
        <InfoBullet>PRO remains available until {formatPremiumExpiry(getProExpiry(user)) || 'the end of your current billing period'}.</InfoBullet>
        <InfoBullet>Future renewals stop after cancellation is confirmed.</InfoBullet>
        <InfoBullet>Your account, diary history, and profile are not deleted.</InfoBullet>
        <InfoBullet>Premium-only features become unavailable when the paid period ends.</InfoBullet>
      </InfoSection>
      {active ? (
        <TouchableOpacity style={shared.button} onPress={() => navigation.navigate('CancelSubscription')}>
          <Text style={shared.buttonText}>Continue to downgrade</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={shared.button} onPress={() => navigation.replace('Upgrade')}>
          <Text style={shared.buttonText}>View PRO plans</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[shared.secondaryButton, s.secondary]} onPress={() => navigation.goBack()}>
        <Text style={shared.secondaryButtonText}>Keep current plan</Text>
      </TouchableOpacity>
    </InfoPageLayout>
  );
};

export const CancelSubscription = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const canCancel = isPro(user) && Boolean(user?.subscription_id);

  const cancel = async () => {
    setCancelling(true);
    try {
      const response = await api.cancelSubscription();
      const updatedUser = await api.me().catch(() => null);
      if (updatedUser) updateUser(updatedUser);
      navigation.replace('SuccessState', {
        title: 'Renewal cancelled',
        message: response.message || 'Your subscription will not renew.',
        hint: `PRO remains available until ${formatPremiumExpiry(getProExpiry(updatedUser || user)) || 'the end of the current billing period'}.`,
        primaryLabel: 'Back to profile',
        returnTo: 'Main',
      });
    } catch (error) {
      navigation.navigate('ErrorState', {
        title: 'Cancellation failed',
        message: error.message || 'We could not cancel your subscription.',
        hint: 'No subscription changes were made. Try again or contact support.',
        primaryLabel: 'Try again',
        returnTo: 'CancelSubscription',
      });
    } finally {
      setCancelling(false);
    }
  };

  const confirm = () => Alert.alert(
    'Cancel subscription?',
    'Future renewals will stop. Your PRO access continues until the current paid period ends.',
    [
      { text: 'Keep PRO', style: 'cancel' },
      { text: 'Cancel renewal', style: 'destructive', onPress: cancel },
    ],
  );

  return (
    <InfoPageLayout
      navigation={navigation}
      title="Cancel Subscription"
      eyebrow="Final confirmation"
      intro="Cancellation stops future renewal. It does not delete your account or erase your fitness data."
    >
      <InfoSection title="Current subscription">
        <InfoParagraph>Plan: {user?.premium_plan || (isPro(user) ? 'PRO' : 'Free')}</InfoParagraph>
        <InfoParagraph>Access through: {formatPremiumExpiry(getProExpiry(user)) || 'No expiry date available'}</InfoParagraph>
      </InfoSection>
      <InfoSection title="Before you cancel">
        <InfoBullet>You will keep PRO until the current billing period ends.</InfoBullet>
        <InfoBullet>No further renewal should be collected after cancellation is confirmed.</InfoBullet>
        <InfoBullet>You can subscribe again later from the Upgrade page.</InfoBullet>
      </InfoSection>
      <TouchableOpacity style={[s.dangerButton, (!canCancel || cancelling) && s.disabled]} onPress={confirm} disabled={!canCancel || cancelling}>
        {cancelling ? <ActivityIndicator color="#ffffff" /> : <Text style={s.dangerButtonText}>{canCancel ? 'Cancel renewal' : 'No renewable subscription found'}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[shared.secondaryButton, s.secondary]} onPress={() => navigation.goBack()}>
        <Text style={shared.secondaryButtonText}>Keep PRO</Text>
      </TouchableOpacity>
      {!user?.subscription_id ? <Text style={s.secureNote}>If you subscribed through an app store, manage cancellation in that store’s subscription settings.</Text> : null}
    </InfoPageLayout>
  );
};

const PaymentOutcome = ({ navigation, route, status }) => {
  const params = route.params || {};
  const success = status === 'success';
  const failed = status === 'failed';
  const title = success ? 'Payment successful' : failed ? 'Payment failed' : 'Payment pending';
  const mark = success ? 'OK' : failed ? '!' : '…';
  const body = success
    ? `Your ${planLabel(params.plan)} Deeply Fit PRO plan is active.`
    : failed
      ? (params.message || 'We could not complete your payment. You have not been upgraded.')
      : (params.message || 'Your payment is still being confirmed. Do not start another payment for the same plan yet.');

  return (
    <InfoPageLayout navigation={navigation} title={title} scroll={false}>
      <View style={s.outcomeCard} accessibilityLiveRegion={success ? 'polite' : 'assertive'}>
        <View style={[s.outcomeMark, success ? s.successMark : failed ? s.failedMark : s.pendingMark]}>
          <Text style={[s.outcomeMarkText, success ? s.successText : failed ? s.failedText : s.pendingText]}>{mark}</Text>
        </View>
        <Text style={s.outcomeTitle}>{title}</Text>
        <Text style={s.outcomeBody}>{body}</Text>
        {params.amount ? <Text style={s.amount}>{`₹${Number(params.amount).toLocaleString('en-IN')}`}</Text> : null}
        {params.paymentId ? <Text style={s.reference}>Reference: {params.paymentId}</Text> : null}
        {success ? (
          <TouchableOpacity style={[shared.button, s.fullButton]} onPress={() => navigation.navigate('Main', { screen: 'Profile' })}>
            <Text style={shared.buttonText}>Continue to PRO</Text>
          </TouchableOpacity>
        ) : failed ? (
          <>
            <TouchableOpacity style={[shared.button, s.fullButton]} onPress={() => navigation.replace('Upgrade', { selectedPlan: params.plan })}>
              <Text style={shared.buttonText}>Try payment again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.textButton} onPress={() => navigation.navigate('Support')}><Text style={s.textButtonLabel}>Contact support</Text></TouchableOpacity>
          </>
        ) : (
          <PendingActions navigation={navigation} params={params} />
        )}
      </View>
    </InfoPageLayout>
  );
};

const PendingActions = ({ navigation, params }) => {
  const { refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const checkStatus = async () => {
    setChecking(true);
    try {
      const status = await api.subscriptionStatus();
      if (status.is_active) {
        await refreshUser();
        navigation.replace('PaymentSuccess', params);
      } else {
        Toast.show({ type: 'info', text1: 'Payment is still pending' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: error.message || 'Could not check payment status' });
    } finally {
      setChecking(false);
    }
  };
  return (
    <>
      <TouchableOpacity style={[shared.button, s.fullButton]} onPress={checkStatus} disabled={checking}>
        {checking ? <ActivityIndicator color={colors.textInverse} /> : <Text style={shared.buttonText}>Check payment status</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={s.textButton} onPress={() => navigation.navigate('Support')}><Text style={s.textButtonLabel}>Contact support</Text></TouchableOpacity>
    </>
  );
};

export const PaymentSuccess = (props) => <PaymentOutcome {...props} status="success" />;
export const PaymentFailed = (props) => <PaymentOutcome {...props} status="failed" />;
export const PaymentPending = (props) => <PaymentOutcome {...props} status="pending" />;

const shared = infoPageStyles;
const s = createThemedStyles(() => ({
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.lg },
  planCard: { width: '48%', minHeight: 116, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  planCardSelected: { borderColor: colors.accentPurple, backgroundColor: 'rgba(139,92,246,0.1)' },
  planName: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  price: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 6 },
  planDetail: { color: colors.textMuted, fontSize: 10, marginTop: 5 },
  disabled: { opacity: 0.55 },
  secureNote: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 12 },
  secondary: { marginTop: 10 },
  comparison: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  comparisonColumn: { flex: 1 },
  comparisonEyebrow: { color: colors.accentPurple, fontSize: 9, fontWeight: '900', marginBottom: 5 },
  comparisonTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '900', marginBottom: 5 },
  comparisonCopy: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  comparisonArrow: { color: colors.accentPurple, fontSize: 22, fontWeight: '800', marginHorizontal: 12 },
  dangerButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.accentCoral },
  dangerButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  outcomeCard: { alignItems: 'center', padding: spacing.xl, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl },
  outcomeMark: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 26, marginBottom: 20, borderWidth: 1 },
  successMark: { backgroundColor: 'rgba(200,241,53,0.12)', borderColor: 'rgba(200,241,53,0.3)' },
  failedMark: { backgroundColor: 'rgba(248,113,113,0.12)', borderColor: 'rgba(248,113,113,0.3)' },
  pendingMark: { backgroundColor: 'rgba(245,166,35,0.12)', borderColor: 'rgba(245,166,35,0.3)' },
  outcomeMarkText: { fontSize: 21, fontWeight: '900' },
  successText: { color: colors.accentLime },
  failedText: { color: colors.accentCoral },
  pendingText: { color: colors.accentAmber },
  outcomeTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  outcomeBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  amount: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', marginTop: 18 },
  reference: { color: colors.textMuted, fontSize: 10, marginTop: 6 },
  fullButton: { width: '100%', marginTop: 22 },
  textButton: { padding: 13, marginTop: 3 },
  textButtonLabel: { color: colors.accentPurple, fontSize: 13, fontWeight: '700' },
}));
