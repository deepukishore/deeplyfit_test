import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { colors, radius, spacing } from '../utils/theme';

const TOTAL_STEPS = 4;

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 'lightly_active', label: 'Lightly Active', desc: `1${'\u2013'}3 days/week` },
  { value: 'moderately_active', label: 'Moderately Active', desc: `3${'\u2013'}5 days/week` },
  { value: 'very_active', label: 'Very Active', desc: `6${'\u2013'}7 days/week` },
  { value: 'extra_active', label: 'Extra Active', desc: 'Athlete / physical job' },
];

const FITNESS_GOALS = [
  { value: 'lose', label: `${'\u{1F4C9}'} Lose Weight`, desc: 'Caloric deficit (-500 kcal)' },
  { value: 'maintain', label: `${'\u26A1'} Maintain Weight`, desc: 'Stay at current weight' },
  { value: 'gain', label: `${'\u{1F4C8}'} Gain Muscle`, desc: 'Caloric surplus (+300 kcal)' },
];

const validateStep = (step, data) => {
  if (step === 0) {
    if (!data.age || data.age < 13 || data.age > 100) return 'Age must be between 13 and 100';
    if (!data.gender) return 'Please select your gender';
  }
  if (step === 1) {
    if (!data.height || data.height < 100 || data.height > 250) return `Height must be between 100${'\u2013'}250 cm`;
    if (!data.current_weight || data.current_weight < 30 || data.current_weight > 300) return `Weight must be between 30${'\u2013'}300 kg`;
    if (!data.goal_weight || data.goal_weight < 30 || data.goal_weight > 300) return `Goal weight must be between 30${'\u2013'}300 kg`;
  }
  if (step === 2) {
    if (!data.activity_level) return 'Please select your activity level';
    if (!data.fitness_goal) return 'Please select your fitness goal';
  }
  return null;
};

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ age: '', gender: '', height: '', current_weight: '', goal_weight: '', activity_level: '', fitness_goal: '' });
  const [calculated, setCalculated] = useState(null);
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();

  const update = (key, val) => setData((current) => ({ ...current, [key]: val }));

  const calcBMR = () => {
    const w = parseFloat(data.current_weight);
    const h = parseFloat(data.height);
    const a = parseInt(data.age);
    const g = data.gender;
    if (!w || !h || !a || !g) return null;

    const bmr = g === 'male' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    const mults = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9 };
    const tdee = bmr * (mults[data.activity_level] || 1.375);
    let cal = data.fitness_goal === 'lose' ? tdee - 500 : data.fitness_goal === 'gain' ? tdee + 300 : tdee;
    cal = Math.max(cal, 1200);
    const protein = w * 2.0;
    const fat = (cal * 0.25) / 9;
    const carbs = (cal - protein * 4 - fat * 9) / 4;

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      calories: Math.round(cal),
      protein: Math.round(protein),
      carbs: Math.round(Math.max(carbs, 0)),
      fat: Math.round(fat),
    };
  };

  const next = () => {
    const err = validateStep(step, data);
    if (err) {
      Toast.show({ type: 'error', text1: err });
      return;
    }
    if (step === 2) setCalculated(calcBMR());
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  };

  const submit = async () => {
    setLoading(true);
    try {
      await api.completeOnboarding({
        age: parseInt(data.age),
        gender: data.gender,
        height: parseFloat(data.height),
        current_weight: parseFloat(data.current_weight),
        goal_weight: parseFloat(data.goal_weight),
        activity_level: data.activity_level,
        fitness_goal: data.fitness_goal,
      });
      await refreshUser();
      Toast.show({ type: 'success', text1: `Profile complete! Let's crush your goals! ${'\u{1F525}'}` });
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Failed to save profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.dots}>
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
          <View key={index} style={[s.dot, index === step && s.dotActive, index < step && s.dotDone]} />
        ))}
      </View>
      <Text style={s.stepLabel}>Step {step + 1} of {TOTAL_STEPS}</Text>

      {step === 0 && (
        <View>
          <Text style={s.title}>{`About you ${'\u{1F464}'}`}</Text>
          <Text style={s.subtitle}>We'll use this to personalize your plan</Text>
          <View style={s.inputGroup}>
            <Text style={s.label}>Age</Text>
            <TextInput style={s.input} placeholder="25" placeholderTextColor={colors.textMuted} value={data.age} onChangeText={(value) => update('age', value)} keyboardType="numeric" />
          </View>
          <Text style={s.label}>Gender</Text>
          {[{ v: 'male', l: `${'\u2642'}${'\uFE0F'} Male` }, { v: 'female', l: `${'\u2640'}${'\uFE0F'} Female` }, { v: 'other', l: `${'\u26A7'}${'\uFE0F'} Other` }].map((gender) => (
            <TouchableOpacity key={gender.v} style={[s.radioOption, data.gender === gender.v && s.radioSelected]} onPress={() => update('gender', gender.v)}>
              <Text style={[s.radioText, data.gender === gender.v && s.radioTextSelected]}>{gender.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {step === 1 && (
        <View>
          <Text style={s.title}>{`Body stats ${'\u{1F4CF}'}`}</Text>
          <Text style={s.subtitle}>Your current measurements</Text>
          <View style={s.inputGroup}>
            <Text style={s.label}>Height (cm)</Text>
            <TextInput style={s.input} placeholder="175" placeholderTextColor={colors.textMuted} value={data.height} onChangeText={(value) => update('height', value)} keyboardType="numeric" />
          </View>
          <View style={s.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.label}>Current Weight (kg)</Text>
              <TextInput style={s.input} placeholder="75" placeholderTextColor={colors.textMuted} value={data.current_weight} onChangeText={(value) => update('current_weight', value)} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Goal Weight (kg)</Text>
              <TextInput style={s.input} placeholder="70" placeholderTextColor={colors.textMuted} value={data.goal_weight} onChangeText={(value) => update('goal_weight', value)} keyboardType="numeric" />
            </View>
          </View>
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={s.title}>{`Your goals ${'\u{1F3AF}'}`}</Text>
          <Text style={s.subtitle}>Tell us about your lifestyle</Text>
          <Text style={s.label}>Activity Level</Text>
          {ACTIVITY_LEVELS.map((activity) => (
            <TouchableOpacity key={activity.value} style={[s.radioOption, data.activity_level === activity.value && s.radioSelected]} onPress={() => update('activity_level', activity.value)}>
              <Text style={[s.radioText, data.activity_level === activity.value && s.radioTextSelected]}>{activity.label}</Text>
              <Text style={s.radioDesc}>{activity.desc}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[s.label, { marginTop: 16 }]}>Fitness Goal</Text>
          {FITNESS_GOALS.map((goal) => (
            <TouchableOpacity key={goal.value} style={[s.radioOption, data.fitness_goal === goal.value && s.radioSelected]} onPress={() => update('fitness_goal', goal.value)}>
              <Text style={[s.radioText, data.fitness_goal === goal.value && s.radioTextSelected]}>{goal.label}</Text>
              <Text style={s.radioDesc}>{goal.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {step === 3 && calculated && (
        <View>
          <Text style={s.title}>{`Your plan is ready! ${'\u{1F680}'}`}</Text>
          <Text style={s.subtitle}>Based on your profile, here's your personalized plan</Text>
          <View style={s.summaryCard}>
            {[
              { label: 'BMR (base metabolism)', value: `${calculated.bmr} kcal` },
              { label: 'TDEE (maintenance)', value: `${calculated.tdee} kcal` },
              { label: `${'\u{1F3AF}'} Calorie Target`, value: `${calculated.calories} kcal`, highlight: true },
              { label: `${'\u{1F4AA}'} Protein`, value: `${calculated.protein}g`, amber: true },
              { label: `${'\u26A1'} Carbs`, value: `${calculated.carbs}g` },
              { label: `${'\u{1F951}'} Fat`, value: `${calculated.fat}g` },
            ].map((item) => (
              <View key={item.label} style={s.statRow}>
                <Text style={s.statLabel}>{item.label}</Text>
                <Text style={[s.statValue, item.highlight && { color: colors.accentLime }, item.amber && { color: colors.accentAmber }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={s.nav}>
        {step > 0 && (
          <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1, marginRight: 8 }]} onPress={() => setStep((current) => Math.max(current - 1, 0))}>
            <Text style={s.btnSecText}>{'\u2190'} Back</Text>
          </TouchableOpacity>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity style={[s.btn, { flex: 2 }]} onPress={next}>
            <Text style={s.btnText}>Continue {'\u2192'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.btn, { flex: 2 }, loading && s.btnDisabled]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>{`Let's Go! ${'\u{1F525}'}`}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.xl, paddingTop: 60, paddingBottom: 40 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accentLime, width: 24 },
  dotDone: { backgroundColor: colors.accentPurple },
  stepLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, color: colors.textSecondary, marginBottom: 5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { backgroundColor: colors.bgElevated, borderRadius: 10, padding: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row' },
  radioOption: { backgroundColor: colors.bgCard, borderRadius: 10, padding: 12, marginBottom: 7, borderWidth: 1, borderColor: colors.border },
  radioSelected: { borderColor: colors.accentLime, backgroundColor: 'rgba(200,241,53,0.08)' },
  radioText: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  radioTextSelected: { color: colors.accentLime },
  radioDesc: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  summaryCard: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  statLabel: { color: colors.textSecondary, fontSize: 13 },
  statValue: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  nav: { flexDirection: 'row', marginTop: 28 },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnSecondary: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
  btnSecText: { color: colors.textPrimary, fontWeight: '600', fontSize: 15 },
});

export default Onboarding;
