import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';
import { colors, radius, spacing } from '../utils/theme';

const ForgotPassword = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) { Toast.show({ type: 'error', text1: 'Please enter your email' }); return; }
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
      Toast.show({ type: 'success', text1: 'Reset link sent! Check your inbox.' });
    } catch (err) { Toast.show({ type: 'error', text1: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.logo}>
        <Image source={require('../../assets/icon.png')} style={s.logoImage} resizeMode="cover" />
        <Text style={s.logoTitle}>Deeply Fit</Text>
      </View>
      <View style={s.card}>
        {sent ? (
          <>
            <Text style={s.cardTitle}>Check your email</Text>
            <Text style={s.subtitle}>We sent a reset link to {email}. It expires in 1 hour.</Text>
            <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Login')}>
              <Text style={s.btnText}>← Back to Sign In</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.cardTitle}>Forgot password?</Text>
            <Text style={s.subtitle}>Enter your email and we'll send you a reset link.</Text>
            <View style={s.inputGroup}>
              <Text style={s.label}>Email</Text>
              <TextInput style={s.input} placeholder="alex@example.com" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>→ Send Reset Link</Text>}
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

const s = StyleSheet.create({
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
  btn: { backgroundColor: colors.accentLime, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.textInverse, fontWeight: '800', fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { color: colors.textSecondary, fontSize: 14 },
  switchLink: { color: colors.accentLime, fontSize: 14, fontWeight: '700' },
});

export default ForgotPassword;
