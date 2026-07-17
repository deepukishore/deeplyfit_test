import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../utils/theme';

const Login = ({ navigation }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' });
      return;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        Toast.show({ type: 'success', text1: `Welcome back! ${'\u{1F4AA}'}` });
      } else {
        await register(email, password, name);
        Toast.show({ type: 'success', text1: `Account created! Let's set up your profile ${'\u{1F3AF}'}` });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.logo}>
        <Image source={require('../../assets/icon.png')} style={s.logoImage} resizeMode="cover" />
        <Text style={s.logoTitle}>Deeply Fit</Text>
        <Text style={s.logoSub}>Your intelligent guide to a deeper, fitter you.</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
        <Text style={s.subtitle}>{mode === 'login' ? 'Sign in to continue your journey' : 'Start your transformation today'}</Text>

        {mode === 'register' && (
          <View style={s.inputGroup}>
            <Text style={s.label}>Full Name</Text>
            <TextInput style={s.input} placeholder="Alex Johnson" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoComplete="name" />
          </View>
        )}

        <View style={s.inputGroup}>
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="alex@example.com" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'} placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {mode === 'login' && (
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
              <Text style={{ color: colors.accentLime, fontSize: 13 }}>Forgot password?</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>{mode === 'login' ? '\u2192 Sign In' : '\u2192 Create Account'}</Text>}
        </TouchableOpacity>

        <View style={s.switchRow}>
          <Text style={s.switchText}>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}</Text>
          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={s.switchLink}>{mode === 'login' ? 'Sign up free' : 'Sign in'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={s.terms}>By continuing, you agree to our Terms & Privacy Policy</Text>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.xl, paddingTop: 60 },
  logo: { alignItems: 'center', marginBottom: 28 },
  logoImage: { width: 82, height: 82, borderRadius: 22 },
  logoTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginTop: 8 },
  logoSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, color: colors.textSecondary, marginBottom: 5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  btn: { backgroundColor: colors.accentLime, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  switchText: { color: colors.textSecondary, fontSize: 13 },
  switchLink: { color: colors.accentLime, fontSize: 13, fontWeight: '700' },
  terms: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 20 },
});

export default Login;
