import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';
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

const WorkoutPlannerModal = ({ visible, date, onClose, onSuccess }) => {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planKey, setPlanKey] = useState('');
  const [dayName, setDayName] = useState('');
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('60');
  const [calories, setCalories] = useState('250');
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

  const updateSet = (ei, si, key, value) => {
    setExercises((cur) => cur.map((ex, i) => i !== ei ? ex : { ...ex, sets: ex.sets.map((set, j) => j !== si ? set : { ...set, [key]: value }) }));
  };

  const handleSubmit = async () => {
    if (!workoutName.trim()) { Toast.show({ type: 'error', text1: 'Choose a plan and workout day first' }); return; }
    setSaving(true);
    try {
      await api.logDetailedWorkout({ date, workout_type: workoutName.trim(), duration_minutes: parseInt(duration, 10) || 0, calories_burned: parseFloat(calories) || 0, notes, exercises: exercises.map((ex) => ({ name: ex.name, sets: ex.sets.map((s) => ({ reps: parseInt(s.reps, 10) || 0, weight: parseFloat(s.weight) || 0 })) })) });
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
              <View style={s.row}>
                <View style={{ flex: 1, marginRight: 8 }}><Text style={s.label}>Duration (min)</Text><TextInput style={s.input} value={duration} onChangeText={setDuration} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Text style={s.label}>Calories Burned</Text><TextInput style={s.input} value={calories} onChangeText={setCalories} keyboardType="numeric" /></View>
              </View>
              <View style={s.inputGroup}><Text style={s.label}>Notes</Text><TextInput style={s.input} value={notes} onChangeText={setNotes} placeholder="Optional session notes" placeholderTextColor={colors.textMuted} /></View>
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
                <TouchableOpacity style={[s.btn, { flex: 2 }, saving && s.btnDisabled]} onPress={handleSubmit} disabled={saving}>
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
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '92%' },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 20 },
  heroCard: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: spacing.md, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
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
  input: { backgroundColor: colors.bgElevated, borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  exerciseCard: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: spacing.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
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
