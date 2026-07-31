import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';
import { estimateWorkoutCalories } from '../utils/workoutCalories';
import { colors, radius, spacing } from '../utils/theme';

const repDefault = (range) => {
  const match = String(range || '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 8;
};

const hydrateExercises = (day) =>
  (day?.exercises || []).map((ex) => ({
    name: ex.name, notes: ex.notes, repRange: ex.rep_range,
    sets: Array.from({ length: ex.target_sets }).map(() => ({ reps: repDefault(ex.rep_range), weight: '' })),
  }));

const WorkoutPlannerModal = ({ visible = true, user, date, onClose, onSuccess }) => {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planKey, setPlanKey] = useState('');
  const [dayName, setDayName] = useState('');
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      try {
        const response = await api.getWorkoutLibrary();
        const plans = response.plans || [];
        setLibrary(plans);
        if (plans.length) { setPlanKey(plans[0].key); setDayName(plans[0].days[0]?.name || ''); }
      } catch (err) { Toast.show({ type: 'error', text1: err.message || 'Failed to load workout library' }); }
      finally { setLoading(false); }
    };
    load();
  }, [visible]);

  const selectedPlan = useMemo(() => library.find((p) => p.key === planKey) || library[0], [library, planKey]);
  const selectedDay = useMemo(() => selectedPlan?.days.find((d) => d.name === dayName) || selectedPlan?.days?.[0], [selectedPlan, dayName]);

  useEffect(() => {
    if (!selectedPlan || !selectedDay) return;
    setWorkoutName(`${selectedPlan.name} - ${selectedDay.name}`);
    setExercises(hydrateExercises(selectedDay));
  }, [selectedPlan, selectedDay]);

  const calorieEstimate = useMemo(() => {
    if (!workoutName.trim() || !duration) return { value: null, error: null };
    try {
      return {
        value: estimateWorkoutCalories({
          workoutType: [
            workoutName,
            selectedDay?.name,
            ...exercises.map((exercise) => exercise.name),
          ].filter(Boolean).join(' '),
          durationMinutes: duration,
          weightKg: user?.current_weight,
          notes,
        }),
        error: null,
      };
    } catch (err) {
      return { value: null, error: err.message };
    }
  }, [workoutName, selectedDay?.name, exercises, duration, user?.current_weight, notes]);

  const updateSet = (ei, si, key, value) => {
    setExercises((cur) => cur.map((ex, i) => i !== ei ? ex : { ...ex, sets: ex.sets.map((set, j) => j !== si ? set : { ...set, [key]: value }) }));
  };

  const handleSubmit = async () => {
    if (!workoutName.trim() || !calorieEstimate.value) {
      Toast.show({ type: 'error', text1: calorieEstimate.error || 'Choose a plan, workout day, and valid duration first' });
      return;
    }
    setSaving(true);
    try {
      await api.logDetailedWorkout({ date, workout_type: workoutName.trim(), duration_minutes: Number(duration), calories_burned: calorieEstimate.value.calories, notes, exercises: exercises.map((ex) => ({ name: ex.name, sets: ex.sets.map((s) => ({ reps: parseInt(s.reps, 10) || 0, weight: parseFloat(s.weight) || 0 })) })) });
      Toast.show({ type: 'success', text1: 'Workout session saved' });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) { Toast.show({ type: 'error', text1: err.message || 'Failed to save workout' }); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.modalTitle}>Workout Library & Planner</Text>
          {loading ? <ActivityIndicator color={colors.accentLime} style={{ marginVertical: 40 }} /> : (
            <ScrollView keyboardShouldPersistTaps="handled">
              {selectedPlan && (
                <View style={s.heroCard}>
                  <Text style={s.heroEyebrow}>Prebuilt plans</Text>
                  <Text style={s.heroTitle}>{selectedPlan.name}</Text>
                  <Text style={s.heroDesc}>{selectedPlan.description}</Text>
                  <Text style={s.badge}>{selectedPlan.frequency}</Text>
                </View>
              )}
              <View style={s.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={s.label}>Plan</Text>
                  <View style={s.pickerWrap}>
                    {library.map((plan) => (
                      <TouchableOpacity key={plan.key} style={[s.pickerOption, planKey === plan.key && s.pickerOptionActive]} onPress={() => setPlanKey(plan.key)}>
                        <Text style={[s.pickerText, planKey === plan.key && s.pickerTextActive]}>{plan.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Day</Text>
                  <View style={s.pickerWrap}>
                    {(selectedPlan?.days || []).map((day) => (
                      <TouchableOpacity key={day.name} style={[s.pickerOption, dayName === day.name && s.pickerOptionActive]} onPress={() => setDayName(day.name)}>
                        <Text style={[s.pickerText, dayName === day.name && s.pickerTextActive]}>{day.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View style={s.inputGroup}><Text style={s.label}>Workout Name</Text><TextInput style={s.input} value={workoutName} onChangeText={setWorkoutName} /></View>
              <View style={s.inputGroup}><Text style={s.label}>Duration (min)</Text><TextInput style={s.input} value={duration} onChangeText={setDuration} keyboardType="numeric" /></View>
              <View style={s.inputGroup}><Text style={s.label}>Notes</Text><TextInput style={s.input} value={notes} onChangeText={setNotes} placeholder="Optional: easy pace, heavy sets, very intense" placeholderTextColor={colors.textMuted} /></View>

              {calorieEstimate.error && <Text style={s.estimateError}>{calorieEstimate.error}</Text>}

              {calorieEstimate.value && (
                <View style={s.caloriePreview}>
                  <View style={s.caloriePreviewHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.caloriePreviewTitle}>Estimated calories burned</Text>
                      <Text style={s.caloriePreviewBasis}>
                        {calorieEstimate.value.activity} · {calorieEstimate.value.intensity} intensity · {duration} min · {calorieEstimate.value.weightKg} kg
                      </Text>
                    </View>
                    <Text style={s.caloriePreviewValue}>{calorieEstimate.value.calories} kcal</Text>
                  </View>
                  <Text style={s.caloriePreviewDisclaimer}>
                    Calculated from the selected workout, exercises, duration, profile weight, and note intensity.
                    {calorieEstimate.value.usedDefaultWeight ? ' Add your current weight in Profile for a more personal estimate.' : ' Actual burn may vary.'}
                  </Text>
                </View>
              )}

              {exercises.map((ex, ei) => (
                <View key={ex.name} style={s.exerciseCard}>
                  <View style={s.exerciseHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.exerciseName}>{ex.name}</Text>
                      <Text style={s.exerciseDetail}>{ex.repRange} reps · {ex.notes}</Text>
                    </View>
                    <Text style={s.badge}>{ex.sets.length} sets</Text>
                  </View>
                  {ex.sets.map((set, si) => (
                    <View key={si} style={s.setRow}>
                      <Text style={s.setLabel}>Set {si + 1}</Text>
                      <TextInput style={[s.input, s.setInput]} value={String(set.reps)} onChangeText={(v) => updateSet(ei, si, 'reps', v)} placeholder="Reps" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                      <TextInput style={[s.input, s.setInput]} value={String(set.weight)} onChangeText={(v) => updateSet(ei, si, 'weight', v)} placeholder="kg" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                    </View>
                  ))}
                </View>
              ))}
              <View style={s.footerBtns}>
                <TouchableOpacity style={[s.btnSec, { flex: 1, marginRight: 8 }]} onPress={onClose}><Text style={s.btnSecText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[s.btn, { flex: 2 }, (saving || !calorieEstimate.value) && s.btnDisabled]} onPress={handleSubmit} disabled={saving || !calorieEstimate.value}>
                  {saving ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Save Workout</Text>}
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xl, maxHeight: '92%', borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)', shadowColor: '#24113f', shadowOpacity: 0.24, shadowRadius: 26, shadowOffset: { width: 0, height: -10 }, elevation: 24 },
  handle: { width: 44, height: 5, backgroundColor: colors.accentPurple, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 20 },
  heroCard: { minHeight: 142, justifyContent: 'center', backgroundColor: 'rgba(237,228,255,0.94)', borderRadius: radius.xl, padding: spacing.lg, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)', shadowColor: '#5d2d93', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  heroEyebrow: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  heroDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  badge: { backgroundColor: 'rgba(200,241,53,0.12)', color: colors.accentLime, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12, fontWeight: '700', alignSelf: 'flex-start' },
  row: { flexDirection: 'row', marginBottom: 16 },
  pickerWrap: { gap: 4 },
  pickerOption: { padding: 8, borderRadius: 8, backgroundColor: colors.bgElevated, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  pickerOptionActive: { borderColor: colors.accentLime, backgroundColor: 'rgba(200,241,53,0.08)' },
  pickerText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  pickerTextActive: { color: colors.accentLime },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  estimateError: { padding: 11, marginBottom: 12, borderRadius: 10, color: colors.accentCoral, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: 'rgba(255,107,107,0.22)', fontSize: 11, lineHeight: 16 },
  caloriePreview: { padding: 14, marginBottom: 16, borderRadius: 14, backgroundColor: 'rgba(245,166,35,0.08)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.28)' },
  caloriePreviewHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  caloriePreviewTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  caloriePreviewBasis: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  caloriePreviewValue: { color: colors.accentAmber, fontSize: 18, fontWeight: '800', marginLeft: 8 },
  caloriePreviewDisclaimer: { color: colors.textMuted, fontSize: 9, lineHeight: 13 },
  exerciseCard: { backgroundColor: 'rgba(248,245,255,0.92)', borderRadius: radius.xl, padding: spacing.md, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(91,57,143,0.13)', shadowColor: '#4b2679', shadowOpacity: 0.07, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  exerciseHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  exerciseName: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  exerciseDetail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  setLabel: { color: colors.textMuted, fontSize: 13, width: 50 },
  setInput: { flex: 1, marginLeft: 8, padding: 10, fontSize: 14 },
  footerBtns: { flexDirection: 'row', marginTop: 8 },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnSec: { backgroundColor: colors.bgElevated, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.textInverse, fontWeight: '800', fontSize: 16 },
  btnSecText: { color: colors.textPrimary, fontWeight: '700', fontSize: 16 },
});

export default WorkoutPlannerModal;
