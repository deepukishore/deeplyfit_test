import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';

const ForgotPassword = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('email');
  const [developmentOtp, setDevelopmentOtp] = useState('');
  const normalizedEmail = email.trim().toLowerCase();

  const handleSendOtp = async () => {
    if (!normalizedEmail) {
      Toast.show({ type: 'error', text1: 'Please enter your email' });
      return;
    }
    setLoading(true);
    try {
      const response = await api.forgotPassword(normalizedEmail);
      setDevelopmentOtp(response.development_otp || '');
      setStep('otp');
      Toast.show({ type: 'success', text1: 'Verification code sent. Check your email.' });
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not send verification code' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      Toast.show({ type: 'error', text1: 'Enter the 6-digit verification code' });
      return;
    }
    setLoading(true);
    try {
      const response = await api.verifyResetOtp(normalizedEmail, otp);
      navigation.navigate('ResetPassword', { token: response.reset_token });
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Invalid verification code' });
    } finally {
      setLoading(false);
    }
  };

  const changeEmail = () => {
    setStep('email');
    setOtp('');
    setDevelopmentOtp('');
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.logo}>
        <Image source={require('../../assets/icon.png')} style={s.logoImage} resizeMode="cover" />
        <Text style={s.logoTitle}>Deeply Fit</Text>
      </View>
      <View style={s.card}>
        {step === 'otp' ? (
          <>
            <Text style={s.cardTitle}>Enter verification code</Text>
            <Text style={s.subtitle}>Enter the 6-digit code sent to {normalizedEmail}. It expires in 10 minutes.</Text>
            {developmentOtp ? <Text style={s.devCode}>Development code: {developmentOtp}</Text> : null}
            <View style={s.inputGroup}>
              <Text style={s.label}>Verification Code</Text>
              <TextInput
                style={[s.input, s.otpInput]}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={otp}
                onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
              />
            </View>
            <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleVerifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Confirm Code</Text>}
            </TouchableOpacity>
            <View style={s.otpActions}>
              <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                <Text style={s.switchLink}>Resend code</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={changeEmail} disabled={loading}>
                <Text style={s.switchLink}>Change email</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.backLink} onPress={() => navigation.navigate('Login')}>
              <Text style={s.switchText}>Back to Sign In</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.cardTitle}>Forgot password?</Text>
            <Text style={s.subtitle}>Confirm your email and we'll send you a 6-digit verification code.</Text>
            <View style={s.inputGroup}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                placeholder="alex@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
            <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Send Verification Code</Text>}
            </TouchableOpacity>
            <View style={s.switchRow}>
              <Text style={s.switchText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={s.switchLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const s = createThemedStyles(() => ({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.xl, paddingTop: 80 },
  logo: { alignItems: 'center', marginBottom: 32 },
  logoImage: { width: 82, height: 82, borderRadius: 22 },
  logoTitle: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginTop: 8 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: 14, color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  otpInput: { fontSize: 24, fontWeight: '700', letterSpacing: 10, textAlign: 'center' },
  devCode: { color: colors.accentAmber, fontSize: 13, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  btn: { backgroundColor: colors.accentLime, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.textInverse, fontWeight: '800', fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { color: colors.textSecondary, fontSize: 14 },
  switchLink: { color: colors.accentLime, fontSize: 14, fontWeight: '700' },
  otpActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  backLink: { alignItems: 'center', marginTop: 22 },
}));

export default ForgotPassword;
