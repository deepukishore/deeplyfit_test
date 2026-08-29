import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';
import AppBackdrop from '../components/AppBackdrop';
import PasswordInput from '../components/PasswordInput';
import { FloatingView, MotionPressable, MotionView } from '../components/Motion';

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
      <AppBackdrop compact />
      <MotionView style={s.logo} delay={30} variant="fade">
        <FloatingView distance={6} duration={1900}>
          <Image source={require('../../assets/icon.png')} style={s.logoImage} resizeMode="cover" />
        </FloatingView>
        <Text style={s.logoTitle}>Deeply Fit</Text>
        <Text style={s.logoSub}>Your intelligent guide to a deeper, fitter you.</Text>
      </MotionView>

      <MotionView style={s.card} delay={120}>
        <Text style={s.cardTitle}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
        <Text style={s.subtitle}>{mode === 'login' ? 'Sign in to continue your journey' : 'Start your transformation today'}</Text>

        {mode === 'register' && (
          <MotionView style={s.inputGroup} variant="fade">
            <Text style={s.label}>Full Name</Text>
            <TextInput style={s.input} placeholder="Alex Johnson" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoComplete="name" />
          </MotionView>
        )}

        <View style={s.inputGroup}>
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="alex@example.com" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Password</Text>
          <PasswordInput style={s.input} placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'} placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {mode === 'login' && (
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
              <Text style={{ color: colors.accentLime, fontSize: 13 }}>Forgot password?</Text>
            </TouchableOpacity>
          )}
        </View>

        <MotionPressable style={s.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>{mode === 'login' ? '\u2192 Sign In' : '\u2192 Create Account'}</Text>}
        </MotionPressable>

        <View style={s.switchRow}>
          <Text style={s.switchText}>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}</Text>
          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={s.switchLink}>{mode === 'login' ? 'Sign up free' : 'Sign in'}</Text>
          </TouchableOpacity>
        </View>
      </MotionView>

      <Text style={s.terms}>By continuing, you agree to our policies</Text>
      <View style={s.policyLinks}>
        <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}><Text style={s.policyLink}>Terms</Text></TouchableOpacity>
        <Text style={s.policyDot}>•</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}><Text style={s.policyLink}>Privacy</Text></TouchableOpacity>
        <Text style={s.policyDot}>•</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CookiePreferences')}><Text style={s.policyLink}>Cookies</Text></TouchableOpacity>
        <Text style={s.policyDot}>•</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Support')}><Text style={s.policyLink}>Support</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const s = createThemedStyles(() => ({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.xl, paddingTop: 60 },
  logo: { alignItems: 'center', marginBottom: 28 },
  logoImage: { width: 82, height: 82, borderRadius: 22 },
  logoTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginTop: 8 },
  logoSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: colors.bgCard, borderRadius: 26, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, shadowColor: '#48236f', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
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
  policyLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: 7 },
  policyLink: { color: colors.accentPurple, fontSize: 11, fontWeight: '700', paddingHorizontal: 5, paddingVertical: 4 },
  policyDot: { color: colors.textMuted, fontSize: 10 },
}));

export default Login;
