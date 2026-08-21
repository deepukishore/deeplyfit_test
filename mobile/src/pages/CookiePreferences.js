import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Switch, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import InfoPageLayout, { infoPageStyles } from '../components/InfoPageLayout';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';

const STORAGE_KEY = 'deeply_fit_cookie_preferences_v1';
const DEFAULTS = { necessary: true, preferences: true, analytics: false, marketing: false };
const OPTIONS = [
  ['necessary', 'Strictly necessary', 'Required for secure sign-in, fraud prevention, and core service operation.'],
  ['preferences', 'Preferences', 'Remembers settings such as theme, language, and interface choices.'],
  ['analytics', 'Analytics', 'Helps us measure reliability and understand how features are used.'],
  ['marketing', 'Marketing', 'Measures campaigns and allows more relevant promotions where offered.'],
];

const CookiePreferences = ({ navigation }) => {
  const [values, setValues] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setValues({ ...DEFAULTS, ...JSON.parse(raw), necessary: true }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (nextValues = values) => {
    setSaving(true);
    try {
      const payload = { ...nextValues, necessary: true, updatedAt: new Date().toISOString() };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setValues(payload);
      Toast.show({ type: 'success', text1: 'Cookie preferences saved' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not save cookie preferences' });
    } finally {
      setSaving(false);
    }
  };

  const rejectOptional = () => {
    const next = { ...DEFAULTS, preferences: false, analytics: false, marketing: false };
    setValues(next);
    save(next);
  };

  return (
    <InfoPageLayout
      navigation={navigation}
      title="Cookie Preferences"
      eyebrow="Your privacy controls"
      intro="Choose which optional technologies Deeply Fit may use. Necessary technologies stay on because the service cannot work securely without them."
    >
      {loading ? <ActivityIndicator style={s.loader} color={colors.accentPurple} /> : (
        <View style={s.card}>
          {OPTIONS.map(([key, title, detail]) => (
            <View style={s.option} key={key}>
              <View style={s.copy}>
                <View style={s.titleRow}>
                  <Text style={s.title}>{title}</Text>
                  {key === 'necessary' ? <Text style={s.always}>ALWAYS ON</Text> : null}
                </View>
                <Text style={s.detail}>{detail}</Text>
              </View>
              <Switch
                value={Boolean(values[key])}
                disabled={key === 'necessary'}
                onValueChange={(enabled) => setValues((current) => ({ ...current, [key]: enabled }))}
                trackColor={{ false: colors.bgElevated, true: colors.accentPurple }}
                thumbColor="#ffffff"
                accessibilityLabel={`${title} cookies`}
              />
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity style={shared.button} onPress={() => save()} disabled={loading || saving}>
        {saving ? <ActivityIndicator color={colors.textInverse} /> : <Text style={shared.buttonText}>Save preferences</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[shared.secondaryButton, s.secondary]} onPress={rejectOptional} disabled={loading || saving}>
        <Text style={shared.secondaryButtonText}>Reject optional cookies</Text>
      </TouchableOpacity>
      <Text style={s.note}>These choices apply to this device. Clearing app or browser storage may reset them.</Text>
    </InfoPageLayout>
  );
};

const shared = infoPageStyles;
const s = createThemedStyles(() => ({
  loader: { marginVertical: 40 },
  card: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  option: { minHeight: 92, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  copy: { flex: 1, paddingRight: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  title: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  detail: { color: colors.textSecondary, fontSize: 11, lineHeight: 17 },
  always: { color: colors.accentPurple, fontSize: 8, fontWeight: '900', marginLeft: 8, backgroundColor: colors.bgElevated, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  secondary: { marginTop: 10 },
  note: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 13 },
}));

export default CookiePreferences;
