import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { createEmptySummary, getCachedDiaryDate } from '../utils/storage';
import { getGreeting, getDailyQuote, formatDate, getWorkoutSuggestions, getInitials } from '../utils/fitness';
import { formatFoodAmount, scaleNutrition } from '../utils/nutrition';
import { estimateWorkoutCalories } from '../utils/workoutCalories';
import { colors, radius, spacing } from '../utils/theme';
import WorkoutPlannerModal from '../components/WorkoutPlannerModal';
import UserAvatar from '../components/UserAvatar';

const MACRO_COLORS = ['#4facfe', '#a855f7', '#f5a623'];

const LogModal = ({ title, onClose, children }) => (
  <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
        <View style={s.handle} />
        <Text style={s.modalTitle}>{title}</Text>
        {children}
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const LogFoodModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    food_name: '',
    meal_type: 'breakfast',
    amount: '100',
    amount_unit: 'grams',
  });
  const [results, setResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const today = formatDate(new Date());

  const calculation = useMemo(() => {
    if (!selectedFood) return { nutrition: null, error: null };
    try {
      return {
        nutrition: scaleNutrition(selectedFood, form.amount, form.amount_unit),
        error: null,
      };
    } catch (err) {
      return { nutrition: null, error: err.message };
    }
  }, [selectedFood, form.amount, form.amount_unit]);

  const selectFood = (food) => {
    setSelectedFood(food);
    setForm((current) => ({ ...current, food_name: food.name }));
  };

  const handleFoodNameChange = (value) => {
    setForm((current) => ({ ...current, food_name: value }));
    setSelectedFood(null);
    setResults([]);
    setSearched(false);
  };

  const handleUnitChange = (unit) => {
    setForm((current) => ({
      ...current,
      amount_unit: unit,
      amount: unit === 'grams' ? '100' : '1',
    }));
  };

  const handleCalculate = async () => {
    const query = form.food_name.trim();
    if (query.length < 2) {
      Toast.show({ type: 'error', text1: 'Enter at least 2 characters of the food name' });
      return;
    }

    setSearching(true);
    setSearched(true);
    try {
      const data = await api.searchFoods(query, 1, 6);
      const matches = (data.results || []).filter((food) => Number(food.calories) > 0);
      setResults(matches);
      if (matches.length) selectFood(matches[0]);
      else setSelectedFood(null);
    } catch (err) {
      setResults([]);
      setSelectedFood(null);
      Toast.show({ type: 'error', text1: err.message || 'Could not calculate nutrition' });
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFood || !calculation.nutrition) {
      Toast.show({ type: 'error', text1: calculation.error || 'Calculate and select a food match first' });
      return;
    }

    const amountLabel = formatFoodAmount(form.amount, form.amount_unit, selectedFood);
    setLoading(true);
    try {
      await api.logFood({
        date: today,
        meal_type: form.meal_type,
        food_name: `${selectedFood.name} (${amountLabel})`,
        ...calculation.nutrition,
        quantity: 1,
      });
      Toast.show({ type: 'success', text1: 'Food logged! 🍽️' });
      onSave(); onClose();
    } catch (err) { Toast.show({ type: 'error', text1: err.message }); }
    finally { setLoading(false); }
  };
  return (
    <LogModal title="🍽️ Log Food" onClose={onClose}>
      <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.inputGroup}><Text style={s.label}>Meal</Text>
          <View style={s.mealRow}>
            {['breakfast', 'lunch', 'dinner', 'snacks'].map((m) => (
              <TouchableOpacity key={m} style={[s.mealChip, form.meal_type === m && s.mealChipActive]} onPress={() => setForm((f) => ({ ...f, meal_type: m }))}>
                <Text style={[s.mealChipText, form.meal_type === m && s.mealChipTextActive]}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Food Name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Chicken breast, dosa, banana"
            placeholderTextColor={colors.textMuted}
            value={form.food_name}
            onChangeText={handleFoodNameChange}
            onSubmitEditing={handleCalculate}
            returnKeyType="search"
          />
          <TouchableOpacity style={s.calculateBtn} onPress={handleCalculate} disabled={searching}>
            {searching
              ? <ActivityIndicator color={colors.textPrimary} />
              : <Text style={s.calculateBtnText}>Calculate nutrition</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.row}>
          <View style={{ flex: 0.8, marginRight: 8 }}>
            <Text style={s.label}>Amount</Text>
            <TextInput
              style={s.input}
              placeholder={form.amount_unit === 'grams' ? '100' : '1'}
              placeholderTextColor={colors.textMuted}
              value={form.amount}
              onChangeText={(value) => setForm((current) => ({ ...current, amount: value }))}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1.2 }}>
            <Text style={s.label}>Measure</Text>
            <View style={s.measureRow}>
              {[
                ['grams', 'Grams'],
                ['portions', 'Portions'],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[s.measureChip, form.amount_unit === value && s.measureChipActive]}
                  onPress={() => handleUnitChange(value)}
                >
                  <Text style={[s.measureChipText, form.amount_unit === value && s.measureChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {results.length > 0 && (
          <View style={s.matchList}>
            <Text style={s.matchHelp}>Choose the closest match</Text>
            {results.slice(0, 4).map((result) => (
              <TouchableOpacity
                key={`${result.code}-${result.name}`}
                style={[s.matchRow, selectedFood === result && s.matchRowActive]}
                onPress={() => selectFood(result)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.matchName}>{result.name}</Text>
                  <Text style={s.matchMeta} numberOfLines={1}>
                    {result.brand || 'Nutrition estimate'} · {result.nutrition_basis}
                  </Text>
                </View>
                <Text style={s.matchCalories}>{Math.round(result.calories || 0)} kcal</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {searched && !searching && results.length === 0 && (
          <Text style={s.nutritionMessage}>No nutrition match was found. Try a simpler food name.</Text>
        )}

        {calculation.error && <Text style={[s.nutritionMessage, s.nutritionError]}>{calculation.error}</Text>}

        {calculation.nutrition && (
          <View style={s.nutritionPreview}>
            <View style={s.nutritionHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.nutritionTitle}>Estimated nutrition</Text>
                <Text style={s.nutritionBasis}>
                  {selectedFood.name} · {formatFoodAmount(form.amount, form.amount_unit, selectedFood)}
                </Text>
              </View>
              <Text style={s.nutritionCalories}>{Math.round(calculation.nutrition.calories)} kcal</Text>
            </View>
            <View style={s.nutritionMacroRow}>
              {[
                ['Protein', calculation.nutrition.protein],
                ['Carbs', calculation.nutrition.carbs],
                ['Fat', calculation.nutrition.fat],
              ].map(([label, value]) => (
                <View key={label} style={s.nutritionMacro}>
                  <Text style={s.nutritionMacroLabel}>{label}</Text>
                  <Text style={s.nutritionMacroValue}>{value} g</Text>
                </View>
              ))}
            </View>
            <Text style={s.nutritionDisclaimer}>Estimates vary by recipe and preparation.</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.btn, (loading || !calculation.nutrition) && s.btnDisabled]}
          onPress={handleSave}
          disabled={loading || !calculation.nutrition}
        >
          {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Log Food</Text>}
        </TouchableOpacity>
      </ScrollView>
    </LogModal>
  );
};

const LogWorkoutModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({ workout_type: '', duration_minutes: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const today = formatDate(new Date());

  const estimate = useMemo(() => {
    if (!form.workout_type.trim() || !form.duration_minutes) return { value: null, error: null };
    try {
      return {
        value: estimateWorkoutCalories({
          workoutType: form.workout_type,
          durationMinutes: form.duration_minutes,
          weightKg: user?.current_weight,
          notes: form.notes,
        }),
        error: null,
      };
    } catch (err) {
      return { value: null, error: err.message };
    }
  }, [form.workout_type, form.duration_minutes, form.notes, user?.current_weight]);

  const handleSave = async () => {
    if (!estimate.value) {
      Toast.show({ type: 'error', text1: estimate.error || 'Workout type and duration are required' });
      return;
    }
    setLoading(true);
    try {
      await api.logWorkout({
        ...form,
        date: today,
        duration_minutes: Number(form.duration_minutes),
        calories_burned: estimate.value.calories,
      });
      Toast.show({ type: 'success', text1: 'Workout logged! 💪' });
      onSave(); onClose();
    } catch (err) { Toast.show({ type: 'error', text1: err.message }); }
    finally { setLoading(false); }
  };
  return (
    <LogModal title="💪 Log Workout" onClose={onClose}>
      <View style={s.inputGroup}><Text style={s.label}>Workout Type</Text><TextInput style={s.input} placeholder="e.g. Weight Training" placeholderTextColor={colors.textMuted} value={form.workout_type} onChangeText={(v) => setForm((f) => ({ ...f, workout_type: v }))} /></View>
      <View style={s.inputGroup}><Text style={s.label}>Duration (min)</Text><TextInput style={s.input} placeholder="45" placeholderTextColor={colors.textMuted} value={form.duration_minutes} onChangeText={(v) => setForm((f) => ({ ...f, duration_minutes: v }))} keyboardType="numeric" /></View>
      <View style={s.inputGroup}><Text style={s.label}>Notes (optional)</Text><TextInput style={s.input} placeholder="e.g. Easy pace, heavy sets, very intense" placeholderTextColor={colors.textMuted} value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} /></View>

      {estimate.error && <Text style={[s.nutritionMessage, s.nutritionError]}>{estimate.error}</Text>}

      {estimate.value && (
        <View style={s.workoutEstimate}>
          <View style={s.workoutEstimateHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.workoutEstimateTitle}>Estimated calories burned</Text>
              <Text style={s.workoutEstimateBasis}>
                {estimate.value.activity} · {estimate.value.intensity} intensity · {estimate.value.weightKg} kg
              </Text>
            </View>
            <Text style={s.workoutEstimateCalories}>{estimate.value.calories} kcal</Text>
          </View>
          <Text style={s.workoutEstimateDisclaimer}>
            Automatically estimated from workout, duration, profile weight, and note intensity.
            {estimate.value.usedDefaultWeight ? ' Add your current weight in Profile for a more personal estimate.' : ' Actual burn may vary.'}
          </Text>
        </View>
      )}

      <TouchableOpacity style={[s.btn, (loading || !estimate.value) && s.btnDisabled]} onPress={handleSave} disabled={loading || !estimate.value}>
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Log Workout</Text>}
      </TouchableOpacity>
    </LogModal>
  );
};

const LogWeightModal = ({ onClose, onSave }) => {
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const today = formatDate(new Date());
  const handleSave = async () => {
    if (!weight || parseFloat(weight) < 30 || parseFloat(weight) > 300) { Toast.show({ type: 'error', text1: 'Enter a valid weight (30–300 kg)' }); return; }
    setLoading(true);
    try {
      await api.logWeight({ date: today, weight: parseFloat(weight) });
      Toast.show({ type: 'success', text1: 'Weight logged! ⚖️' });
      onSave(); onClose();
    } catch (err) { Toast.show({ type: 'error', text1: err.message }); }
    finally { setLoading(false); }
  };
  return (
    <LogModal title="⚖️ Log Weight" onClose={onClose}>
      <View style={s.inputGroup}><Text style={s.label}>Today's Weight (kg)</Text><TextInput style={s.input} placeholder="75.0" placeholderTextColor={colors.textMuted} value={weight} onChangeText={setWeight} keyboardType="numeric" /></View>
      <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Log Weight</Text>}
      </TouchableOpacity>
    </LogModal>
  );
};

const Home = ({ navigation }) => {
  const { user } = useAuth();
  const today = formatDate(new Date());
  const [summary, setSummary] = useState(() => createEmptySummary(today, { calories_target: user?.calorie_target || 2000 }));
  const [suggestionsData, setSuggestionsData] = useState(null);
  const [recentWorkoutHistory, setRecentWorkoutHistory] = useState([]);
  const [calorieStreak, setCalorieStreak] = useState(null);
  const [waterGoal, setWaterGoal] = useState(8);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const suggestionVariantRef = useRef(0);
  const loadSummary = useCallback(async ({ rotateSuggestions = false } = {}) => {
    const cached = await getCachedDiaryDate(today);
    if (cached.summary) setSummary(cached.summary);
    const variant = rotateSuggestions
      ? suggestionVariantRef.current + 1
      : suggestionVariantRef.current;

    const [summaryResult, suggestionsResult, workoutsResult] = await Promise.allSettled([
      api.getDailySummary(today),
      api.getMealSuggestions(today, { variant }),
      api.getWorkoutHistory(3),
    ]);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    if (suggestionsResult.status === 'fulfilled') {
      suggestionVariantRef.current = variant;
      setSuggestionsData(suggestionsResult.value);
    }
    if (workoutsResult.status === 'fulfilled') setRecentWorkoutHistory(workoutsResult.value);
  }, [today]);

  useEffect(() => {
    loadSummary();
    api.getCalorieStreak().then(setCalorieStreak).catch(() => {});
    api.getWaterGoal().then((d) => setWaterGoal(d.water_goal || 8)).catch(() => {});
  }, [loadSummary]);

  useRefreshRegistration(() => loadSummary({ rotateSuggestions: true }));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSummary({ rotateSuggestions: true });
    setRefreshing(false);
  };

  const handleAddGlass = async () => {
    try {
      await api.addGlass();
      setSummary((s) => ({ ...s, water_glasses: (s?.water_glasses || 0) + 1 }));
      Toast.show({ type: 'success', text1: 'Hydration tracked! 💧' });
    } catch { Toast.show({ type: 'error', text1: 'Failed to log water' }); }
  };

  const remaining = (summary?.calories_target || 0) - (summary?.calories_consumed || 0) + (summary?.calories_burned || 0);
  const progress = Math.min(((summary?.calories_consumed || 0) / (summary?.calories_target || 2000)) * 100, 100);
  const suggestions = getWorkoutSuggestions(user?.fitness_goal);
  const initials = getInitials(user?.name, user?.email);

  return (
    <View style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.name}>{user?.name || user?.email?.split('@')[0] || 'Athlete'} 👋</Text>
        </View>
        <TouchableOpacity style={s.avatar} onPress={() => navigation.navigate('Profile')}>
          <UserAvatar value={user?.profile_picture} initials={initials} size={40} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentLime} />}>
        <View style={s.quoteCard}>
          <Text style={s.quoteText}>💬 "{getDailyQuote()}"</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Calories Remaining</Text>
          <Text style={[s.bigNumber, remaining < 0 && { color: colors.accentCoral }]}>{Math.abs(Math.round(remaining))}</Text>
          {remaining < 0 && <Text style={{ color: colors.accentCoral, fontSize: 12 }}>Over goal by {Math.abs(Math.round(remaining))} kcal</Text>}
          <View style={s.formulaRow}><Text style={s.formulaLabel}>Goal</Text><Text style={s.formulaValue}>{Math.round(summary?.calories_target || 0)}</Text></View>
          <View style={s.formulaRow}><Text style={s.formulaLabel}>Food −</Text><Text style={s.formulaValue}>{Math.round(summary?.calories_consumed || 0)}</Text></View>
          <View style={s.formulaRow}><Text style={s.formulaLabel}>Exercise +</Text><Text style={s.formulaValue}>{Math.round(summary?.calories_burned || 0)}</Text></View>
          <View style={s.progressBar}><View style={[s.progressFill, { width: `${progress}%`, backgroundColor: progress >= 100 ? colors.accentCoral : progress >= 80 ? colors.accentAmber : colors.accentLime }]} /></View>
          <Text style={s.progressLabel}>{Math.round(progress)}% of goal</Text>
        </View>

        {calorieStreak && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>🎯 Calorie Streak</Text>
            <View style={s.row}>
              <View style={[s.streakBox, { marginRight: 8 }]}>
                <Text style={[s.streakNum, { color: colors.accentLime }]}>{calorieStreak.current_streak}</Text>
                <Text style={s.streakLabel}>Current 🔥</Text>
              </View>
              <View style={s.streakBox}>
                <Text style={[s.streakNum, { color: colors.accentAmber }]}>{calorieStreak.best_streak}</Text>
                <Text style={s.streakLabel}>Best 🏆</Text>
              </View>
            </View>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.sectionTitle}>Macros Today</Text>
          {[{ name: 'Protein', val: summary?.protein, color: MACRO_COLORS[0] }, { name: 'Carbs', val: summary?.carbs, color: MACRO_COLORS[1] }, { name: 'Fat', val: summary?.fat, color: MACRO_COLORS[2] }].map((m) => (
            <View key={m.name} style={s.macroRow}>
              <View style={[s.macroDot, { backgroundColor: m.color }]} />
              <Text style={s.macroLabel}>{m.name}</Text>
              <Text style={[s.macroValue, { color: m.color }]}>{Math.round(m.val || 0)}g</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <View style={s.rowBetween}>
            <View>
              <Text style={s.sectionTitle}>Water Intake</Text>
              <Text style={s.bigNumber}>{summary?.water_glasses || 0}</Text>
              <Text style={s.subText}>of {waterGoal} glasses</Text>
            </View>
            <Text style={{ fontSize: 40 }}>💧</Text>
          </View>
          <View style={s.glassRow}>
            {Array.from({ length: waterGoal }).map((_, i) => (
              <Text key={i} style={[s.glass, i < (summary?.water_glasses || 0) && s.glassFilled]}>💧</Text>
            ))}
          </View>
          <TouchableOpacity style={[s.btnSecondary, (summary?.water_glasses || 0) >= waterGoal && s.btnDisabled]} onPress={handleAddGlass} disabled={(summary?.water_glasses || 0) >= waterGoal}>
            <Text style={s.btnSecText}>+ Add Glass</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.quickActions}>
            {[
              { icon: '🍽️', label: 'Log Food', action: () => setModal('food') },
              { icon: '🏋️', label: 'Log Workout', action: () => setModal('workout') },
              { icon: '⚖️', label: 'Log Weight', action: () => setModal('weight') },
              { icon: '📚', label: 'Planner', action: () => setShowPlanner(true) },
            ].map((a) => (
              <TouchableOpacity key={a.label} style={s.quickBtn} onPress={a.action}>
                <Text style={{ fontSize: 28 }}>{a.icon}</Text>
                <Text style={s.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Suggested Workouts</Text>
          {suggestions.map((sg, i) => (
            <View key={i} style={s.workoutRow}>
              <Text style={{ fontSize: 28, marginRight: 12 }}>{sg.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.workoutName}>{sg.name}</Text>
                <Text style={s.workoutDetail}>{sg.detail}</Text>
              </View>
              <Text style={s.workoutCal}>~{sg.calories} kcal</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {modal === 'food' && <LogFoodModal onClose={() => setModal(null)} onSave={loadSummary} />}
      {modal === 'workout' && <LogWorkoutModal user={user} onClose={() => setModal(null)} onSave={loadSummary} />}
      {modal === 'weight' && <LogWeightModal onClose={() => setModal(null)} onSave={loadSummary} />}
      {showPlanner && <WorkoutPlannerModal visible={showPlanner} user={user} date={today} onClose={() => setShowPlanner(false)} onSuccess={loadSummary} />}
    </View>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  greeting: { fontSize: 11, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  name: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.accentPurple, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  scroll: { flex: 1, padding: spacing.lg },
  quoteCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  quoteText: { color: colors.textSecondary, fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  bigNumber: { fontSize: 42, fontWeight: '800', color: colors.accentLime, lineHeight: 46 },
  subText: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  formulaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  formulaLabel: { color: colors.textMuted, fontSize: 12 },
  formulaValue: { color: colors.textPrimary, fontWeight: '600', fontSize: 12 },
  progressBar: { height: 7, backgroundColor: colors.bgElevated, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  streakBox: { flex: 1, backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: 12, alignItems: 'center' },
  streakNum: { fontSize: 30, fontWeight: '800', lineHeight: 34 },
  streakLabel: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  macroRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  macroLabel: { flex: 1, color: colors.textSecondary, fontSize: 13 },
  macroValue: { fontWeight: '700', fontSize: 13 },
  glassRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  glass: { fontSize: 18, opacity: 0.3 },
  glassFilled: { opacity: 1 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  quickBtn: { flex: 1, alignItems: 'center', backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: 10, marginHorizontal: 3 },
  quickLabel: { color: colors.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center', fontWeight: '600' },
  workoutRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  workoutName: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  workoutDetail: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  workoutCal: { color: colors.accentAmber, fontSize: 12, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '90%' },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 18 },
  modalScroll: { flexGrow: 0 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, color: colors.textSecondary, marginBottom: 5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { backgroundColor: colors.bgElevated, borderRadius: 10, padding: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  calculateBtn: { minHeight: 42, marginTop: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  calculateBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  mealRow: { flexDirection: 'row', gap: 6 },
  mealChip: { flex: 1, padding: 8, borderRadius: 8, backgroundColor: colors.bgElevated, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  mealChipActive: { backgroundColor: 'rgba(200,241,53,0.12)', borderColor: colors.accentLime },
  mealChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  mealChipTextActive: { color: colors.accentLime },
  measureRow: { minHeight: 44, flexDirection: 'row', padding: 3, borderRadius: 10, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  measureChip: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  measureChipActive: { backgroundColor: 'rgba(168,85,247,0.16)' },
  measureChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  measureChipTextActive: { color: colors.accentLime },
  matchList: { marginTop: 4, marginBottom: 14 },
  matchHelp: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 7 },
  matchRow: { minHeight: 55, flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 7, borderRadius: 10, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  matchRowActive: { borderColor: colors.accentLime, backgroundColor: 'rgba(168,85,247,0.09)' },
  matchName: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  matchMeta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  matchCalories: { color: colors.accentAmber, fontSize: 11, fontWeight: '800', marginLeft: 8 },
  nutritionMessage: { padding: 11, marginBottom: 12, borderRadius: 10, color: colors.textSecondary, backgroundColor: colors.bgElevated, fontSize: 11, lineHeight: 16 },
  nutritionError: { color: colors.accentCoral, borderWidth: 1, borderColor: 'rgba(255,107,107,0.22)' },
  nutritionPreview: { padding: 14, marginBottom: 12, borderRadius: 14, backgroundColor: 'rgba(168,85,247,0.08)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.24)' },
  nutritionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  nutritionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  nutritionBasis: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  nutritionCalories: { color: colors.accentLime, fontSize: 18, fontWeight: '800', marginLeft: 8 },
  nutritionMacroRow: { flexDirection: 'row', gap: 7 },
  nutritionMacro: { flex: 1, padding: 9, alignItems: 'center', borderRadius: 9, backgroundColor: colors.bgCard },
  nutritionMacroLabel: { color: colors.textMuted, fontSize: 9 },
  nutritionMacroValue: { color: colors.textPrimary, fontSize: 12, fontWeight: '800', marginTop: 2 },
  nutritionDisclaimer: { color: colors.textMuted, fontSize: 9, lineHeight: 13, marginTop: 9 },
  workoutEstimate: { padding: 14, marginBottom: 12, borderRadius: 14, backgroundColor: 'rgba(245,166,35,0.08)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.28)' },
  workoutEstimateHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  workoutEstimateTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  workoutEstimateBasis: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  workoutEstimateCalories: { color: colors.accentAmber, fontSize: 18, fontWeight: '800', marginLeft: 8 },
  workoutEstimateDisclaimer: { color: colors.textMuted, fontSize: 9, lineHeight: 13 },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnSecondary: { backgroundColor: colors.bgElevated, borderRadius: 12, padding: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
  btnSecText: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
});

export default Home;
