import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';
import { colors, radius, spacing } from '../utils/theme';

const ResetPassword = ({ route, navigation }) => {
  const token = route?.params?.token || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!token) { Toast.show({ type: 'error', text1: 'Invalid reset link' }); return; }
    if (password.length < 6) { Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' }); return; }
    if (password !== confirm) { Toast.show({ type: 'error', text1: 'Passwords do not match' }); return; }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      Toast.show({ type: 'success', text1: 'Password updated!' });
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
        {done ? (
          <>
            <Text style={s.cardTitle}>Password updated!</Text>
            <Text style={s.subtitle}>You can now sign in with your new password.</Text>
            <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Login')}>
              <Text style={s.btnText}>→ Sign In</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.cardTitle}>Set new password</Text>
            <Text style={s.subtitle}>Choose a strong password for your account.</Text>
            <View style={s.inputGroup}>
              <Text style={s.label}>New Password</Text>
              <TextInput style={s.input} placeholder="••••••••" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.label}>Confirm Password</Text>
              <TextInput style={s.input} placeholder="••••••••" placeholderTextColor={colors.textMuted} value={confirm} onChangeText={setConfirm} secureTextEntry />
            </View>
            <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>→ Update Password</Text>}
            </TouchableOpacity>
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
});

export default ResetPassword;
