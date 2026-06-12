import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import { api } from '../utils/api';
import { colors, radius, spacing } from '../utils/theme';
import { PREMIUM_PLANS, PRO_FEATURES, UPI_ID, openUpiPayment, formatPremiumExpiry } from '../utils/premium';

const PremiumUpgradeModal = ({ visible, onClose, onActivated, currentUser }) => {
  const [plan, setPlan] = useState('monthly');
  const [paymentReference, setPaymentReference] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedPlan = useMemo(() => PREMIUM_PLANS[plan], [plan]);

  const handleCopyUpi = async () => {
    await Clipboard.setStringAsync(UPI_ID);
    Toast.show({ type: 'success', text1: 'UPI ID copied' });
  };

  const handlePay = async () => {
    try {
      await openUpiPayment(plan);
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not open UPI app' });
    }
  };

  const handleActivate = async () => {
    const reference = paymentReference.trim();
    if (!reference) {
      Toast.show({ type: 'error', text1: 'Enter your UPI transaction reference' });
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await api.activatePremium({
        plan,
        payment_reference: reference,
        payment_method: 'upi',
      });
      Toast.show({ type: 'success', text1: 'PRO activated successfully' });
      setPaymentReference('');
      if (onActivated) onActivated(updatedUser);
      onClose();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not activate PRO' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Deeply Fit PRO</Text>
            <Text style={s.subtitle}>Unlock every premium feature for your journey</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.priceGrid}>
            {Object.values(PREMIUM_PLANS).map((option) => {
              const active = plan === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[s.planCard, active && s.planCardActive]}
                  onPress={() => setPlan(option.key)}
                >
                  <Text style={s.planTitle}>{option.title}</Text>
                  <Text style={s.planPrice}>₹{option.price}</Text>
                  <Text style={s.planSubtitle}>
                    {option.durationLabel} · {option.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>What PRO unlocks</Text>
            {PRO_FEATURES.map((feature) => (
              <View key={feature} style={s.featureRow}>
                <Text style={s.featureIcon}>💎</Text>
                <Text style={s.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Payment</Text>
            <Text style={s.detailText}>Pay to UPI ID</Text>
            <View style={s.upiBox}>
              <Text style={s.upiText}>{UPI_ID}</Text>
              <TouchableOpacity onPress={handleCopyUpi}>
                <Text style={s.copyLink}>Copy</Text>
              </TouchableOpacity>
            </View>
  <TouchableOpacity style={s.payBtn} onPress={handlePay}>
              <Text style={s.payBtnText}>Open UPI App to Pay ₹{selectedPlan.price}</Text>
            </TouchableOpacity>
            <Text style={s.noteText}>
              After payment, enter your UTR or transaction reference below. Your {selectedPlan.durationLabel.toLowerCase()} subscription starts from activation.
            </Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Activate PRO</Text>
            <TextInput
              style={s.input}
              placeholder="Enter UPI transaction reference"
              placeholderTextColor={colors.textMuted}
              value={paymentReference}
              onChangeText={setPaymentReference}
            />
            <TouchableOpacity style={[s.activateBtn, loading && s.disabled]} onPress={handleActivate} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.activateBtnText}>I’ve paid, activate PRO</Text>}
            </TouchableOpacity>
          </View>

          {currentUser?.premium_status === 'active' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Current subscription</Text>
              <Text style={s.detailText}>Plan: {currentUser.premium_plan || '—'}</Text>
              <Text style={s.detailText}>Expires: {formatPremiumExpiry(currentUser.premium_expires_at) || '—'}</Text>
              <Text style={s.detailText}>Status: PRO active</Text>
            </View>
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
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
  body: { flex: 1, padding: spacing.lg },
  priceGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  planCard: {
    flex: 1,
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
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureIcon: { fontSize: 14, marginRight: 10 },
  featureText: { color: colors.textSecondary, fontSize: 14, flex: 1 },
  detailText: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
  upiBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgElevated, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  upiText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  copyLink: { color: colors.accentLime, fontWeight: '700' },
  payBtn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center' },
  payBtnText: { color: colors.textInverse, fontWeight: '800', fontSize: 15 },
  noteText: { color: colors.textMuted, fontSize: 12, marginTop: 10, lineHeight: 18 },
  input: { backgroundColor: colors.bgElevated, borderRadius: 12, padding: 14, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  activateBtn: { backgroundColor: colors.accentPurple, borderRadius: 12, padding: 16, alignItems: 'center' },
  activateBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.6 },
});

export default PremiumUpgradeModal;
