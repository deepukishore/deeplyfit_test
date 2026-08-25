import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { createEmptySummary, getCachedDiaryDate } from '../utils/storage';
import { getGreeting, getDailyQuote, formatDate, getWorkoutSuggestions, getInitials } from '../utils/fitness';
import { formatFoodAmount, scaleNutrition } from '../utils/nutrition';
import { estimateWorkoutCalories } from '../utils/workoutCalories';
import { isPro } from '../utils/premium';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';
import WorkoutPlannerModal from '../components/WorkoutPlannerModal';
import UserAvatar from '../components/UserAvatar';
import AppBackdrop from '../components/AppBackdrop';
import NoSearchResults from '../components/NoSearchResults';
import AchievementsSection from '../components/AchievementsSection';
import { AnimatedProgressFill, FloatingView, MotionPressable, MotionView } from '../components/Motion';
import BannerAdComponent from '../components/BannerAdComponent';

const MACRO_COLORS = ['#4facfe', '#a855f7', '#f5a623'];
const QUICK_ACTION_META = {
  'Log Food': { detail: 'Track a meal', tone: 'rgba(168,85,247,0.14)' },
  'Log Workout': { detail: 'Start moving', tone: 'rgba(245,166,35,0.14)' },
  'Log Weight': { detail: 'Record progress', tone: 'rgba(220,38,38,0.1)' },
  Planner: { detail: 'Plan ahead', tone: 'rgba(37,99,235,0.12)' },
  Progress: { detail: 'See your trends', tone: 'rgba(37,99,235,0.12)' },
  Community: { detail: 'Stay motivated', tone: 'rgba(168,85,247,0.14)' },
};
const QUICK_ACTION_ICONS = {
  'Log Food': '\u{1F37D}\uFE0F',
  'Log Workout': '\u{1F3CB}\uFE0F',
  'Log Weight': '\u2696\uFE0F',
  Planner: '\u{1F4D6}',
  Progress: '\u{1F4C8}',
  Community: '\u{1F91D}',
};

const LogModal = ({ title, onClose, children }) => (
  <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView
      style={s.keyboardAvoider}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={s.handle} />
          <Text style={s.modalTitle}>{title}</Text>
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </KeyboardAvoidingView>
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
      const data = await api.searchFoods(query, 1, 12);
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
      <ScrollView
        style={s.modalScroll}
        contentContainerStyle={s.modalScrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
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
            placeholder="e.g. dosa, chutney, allam pachadi, sambar"
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
            {results.slice(0, 12).map((result) => (
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
          <NoSearchResults query={form.food_name} onClear={() => { setResults([]); setSearched(false); }} compact />
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

const LogWorkoutModal = ({ user, preset, onClose, onSave }) => {
  const suggestedDuration = String(preset?.detail || '').match(/\d+/)?.[0] || '';
  const [form, setForm] = useState({
    workout_type: preset?.name || '',
    duration_minutes: suggestedDuration,
    notes: '',
  });
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
  const insets = useSafeAreaInsets();
  const today = formatDate(new Date());
  const [summary, setSummary] = useState(() => createEmptySummary(today, { calories_target: user?.calorie_target || 2000 }));
  const [suggestionsData, setSuggestionsData] = useState(null);
  const [recentWorkoutHistory, setRecentWorkoutHistory] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [waterGoal, setWaterGoal] = useState(8);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestionsRefreshing, setSuggestionsRefreshing] = useState(false);
  const [modal, setModal] = useState(null);
  const [workoutPreset, setWorkoutPreset] = useState(null);
  const [showPlanner, setShowPlanner] = useState(false);
  const suggestionVariantRef = useRef(0);
  const loadSummary = useCallback(async ({ rotateSuggestions = false } = {}) => {
    const cached = await getCachedDiaryDate(today);
    if (cached.summary) setSummary(cached.summary);
    const variant = rotateSuggestions
      ? suggestionVariantRef.current + 1
      : suggestionVariantRef.current;

    const [summaryResult, suggestionsResult, workoutsResult, achievementsResult] = await Promise.allSettled([
      api.getDailySummary(today),
      api.getMealSuggestions(today, { variant }),
      api.getWorkoutHistory(3),
      api.getAchievements(),
    ]);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    if (suggestionsResult.status === 'fulfilled') {
      suggestionVariantRef.current = variant;
      setSuggestionsData(suggestionsResult.value);
    }
    if (workoutsResult.status === 'fulfilled') setRecentWorkoutHistory(workoutsResult.value);
    if (achievementsResult.status === 'fulfilled') setAchievements(achievementsResult.value);
  }, [today]);

  const refreshHomeData = useCallback(async ({ rotateSuggestions = false } = {}) => {
    const [, water] = await Promise.all([
      loadSummary({ rotateSuggestions }),
      api.getWaterGoal().catch(() => null),
    ]);
    if (water) setWaterGoal(water.water_goal || 8);
  }, [loadSummary]);

  useEffect(() => {
    refreshHomeData();
  }, [refreshHomeData]);

  const refreshWithRotation = useCallback(() => refreshHomeData({ rotateSuggestions: true }), [refreshHomeData]);
  useRefreshRegistration(refreshWithRotation);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshHomeData({ rotateSuggestions: true });
    setRefreshing(false);
  };

  const refreshSuggestions = useCallback(async () => {
    if (suggestionsRefreshing) return;
    const nextVariant = suggestionVariantRef.current + 1;
    const currentNames = (suggestionsData?.suggestions || []).map(({ name }) => name);
    setSuggestionsRefreshing(true);
    try {
      const data = await api.getMealSuggestions(today, {
        variant: nextVariant,
        exclude: currentNames,
      });
      suggestionVariantRef.current = nextVariant;
      setSuggestionsData(data);
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not refresh meal suggestions' });
    } finally {
      setSuggestionsRefreshing(false);
    }
  }, [suggestionsData, suggestionsRefreshing, today]);

  const handleAddGlass = async () => {
    try {
      await api.addGlass();
      setSummary((s) => ({ ...s, water_glasses: (s?.water_glasses || 0) + 1 }));
      api.getAchievements().then(setAchievements).catch(() => {});
      Toast.show({ type: 'success', text1: 'Hydration tracked! 💧' });
    } catch { Toast.show({ type: 'error', text1: 'Failed to log water' }); }
  };

  const openWorkout = (preset = null) => {
    setWorkoutPreset(preset);
    setModal('workout');
  };

  const remaining = (summary?.calories_target || 0) - (summary?.calories_consumed || 0) + (summary?.calories_burned || 0);
  const progress = Math.min(((summary?.calories_consumed || 0) / (summary?.calories_target || 2000)) * 100, 100);
  const suggestions = getWorkoutSuggestions(user?.fitness_goal);
  const initials = getInitials(user?.name, user?.email);
  const streakAchievement = achievements.find((achievement) => achievement.key === 'streak_7');
  const streakDays = Math.min(Number(streakAchievement?.progress?.current || 0), 7);
  const macroRows = [
    { name: 'Protein', value: summary?.protein || 0, target: user?.protein_target || 140, color: MACRO_COLORS[0] },
    { name: 'Carbs', value: summary?.carbs || 0, target: user?.carbs_target || 200, color: MACRO_COLORS[1] },
    { name: 'Fat', value: summary?.fat || 0, target: user?.fat_target || 65, color: MACRO_COLORS[2] },
  ];
  const hydrationTarget = Math.min(waterGoal, 4);
  const dailyMissions = [
    {
      key: 'food',
      icon: '\u{1F957}',
      title: 'Fuel your day',
      detail: 'Log your first meal',
      complete: Number(summary?.calories_consumed || 0) > 0 || Boolean(summary?.food_logs?.length),
      action: () => setModal('food'),
    },
    {
      key: 'move',
      icon: '\u{1F3C3}',
      title: 'Move your body',
      detail: 'Complete one activity',
      complete: Number(summary?.calories_burned || 0) > 0 || Boolean(summary?.workouts?.length),
      action: () => openWorkout(),
    },
    {
      key: 'water',
      icon: '\u{1F4A7}',
      title: 'Hydration boost',
      detail: `${Math.min(summary?.water_glasses || 0, hydrationTarget)}/${hydrationTarget} glasses`,
      complete: Number(summary?.water_glasses || 0) >= hydrationTarget,
      action: handleAddGlass,
    },
  ];
  const completedMissions = dailyMissions.filter((mission) => mission.complete).length;
  const missionProgress = (completedMissions / dailyMissions.length) * 100;
  const missionMessage = completedMissions === dailyMissions.length
    ? 'Daily win unlocked. Keep the momentum going!'
    : completedMissions === 0
      ? 'Three small actions can make today a healthy win.'
      : `${dailyMissions.length - completedMissions} small ${dailyMissions.length - completedMissions === 1 ? 'step' : 'steps'} left for today.`;

  return (
    <View style={s.page}>
      <AppBackdrop />
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <View>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.name}>{user?.name || user?.email?.split('@')[0] || 'Athlete'} 👋</Text>
        </View>
        <TouchableOpacity style={s.avatar} onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Open your profile">
          <UserAvatar value={user?.profile_picture} initials={initials} size={40} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: spacing.xl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentLime} />}
        showsVerticalScrollIndicator={false}
      >
        <MotionView depth accentColor={colors.glowBlue} style={s.quoteCard} delay={20} variant="fade">
          <Text style={s.quoteText}>💬 "{getDailyQuote()}"</Text>
        </MotionView>

        <MotionView depth accentColor="rgba(245,166,35,0.18)" style={[s.card, s.missionCard]} delay={50}>
          <View style={s.missionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.missionEyebrow}>DAILY MOMENTUM</Text>
              <Text style={s.missionTitle}>Your healthy wins</Text>
            </View>
            <View style={[s.missionScore, completedMissions === dailyMissions.length && s.missionScoreComplete]} accessibilityLiveRegion="polite" accessibilityLabel={`${completedMissions} of 3 daily missions complete`}>
              <Text style={s.missionScoreValue}>{completedMissions}/3</Text>
              <Text style={s.missionScoreLabel}>done</Text>
            </View>
          </View>
          <Text style={s.missionMessage}>{missionMessage}</Text>
          <View style={s.missionTrack}>
            <AnimatedProgressFill progress={missionProgress} style={s.missionFill} duration={800} />
          </View>
          <View style={s.missionList}>
            {dailyMissions.map((mission) => (
              <MotionPressable
                key={mission.key}
                style={[s.missionRow, mission.complete && s.missionRowComplete]}
                onPress={mission.action}
                disabled={mission.key === 'water' && Number(summary?.water_glasses || 0) >= waterGoal}
                accessibilityLabel={`${mission.title}. ${mission.complete ? 'Completed' : mission.detail}`}
                accessibilityState={{ checked: mission.complete }}
              >
                <View style={[s.missionIcon, mission.complete && s.missionIconComplete]}>
                  <Text style={s.missionIconText}>{mission.complete ? '\u2713' : mission.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.missionRowTitle, mission.complete && s.missionRowTitleComplete]}>{mission.title}</Text>
                  <Text style={s.missionRowDetail}>{mission.complete ? 'Completed today' : mission.detail}</Text>
                </View>
                <Text style={[s.missionAction, mission.complete && s.missionActionComplete]}>
                  {mission.complete ? 'Done' : 'Start'}
                </Text>
              </MotionPressable>
            ))}
          </View>
        </MotionView>

        <MotionView depth style={s.card} delay={70}>
          <Text style={s.sectionTitle}>{remaining < 0 ? "Above today's target" : 'Calories Remaining'}</Text>
          <Text style={[s.bigNumber, remaining < 0 && { color: colors.accentAmber }]}>{Math.abs(Math.round(remaining))}</Text>
          {remaining < 0 && <Text style={s.goalNudge}>{Math.abs(Math.round(remaining))} kcal above your food target. A short walk or balanced next meal can help.</Text>}
          <View style={s.formulaRow}><Text style={s.formulaLabel}>Goal</Text><Text style={s.formulaValue}>{Math.round(summary?.calories_target || 0)}</Text></View>
          <View style={s.formulaRow}><Text style={s.formulaLabel}>Food −</Text><Text style={s.formulaValue}>{Math.round(summary?.calories_consumed || 0)}</Text></View>
          <View style={s.formulaRow}><Text style={s.formulaLabel}>Exercise +</Text><Text style={s.formulaValue}>{Math.round(summary?.calories_burned || 0)}</Text></View>
          <View style={s.progressBar}><AnimatedProgressFill progress={progress} style={[s.progressFill, { backgroundColor: progress >= 100 ? colors.accentCoral : progress >= 80 ? colors.accentAmber : colors.accentLime }]} /></View>
          <Text style={s.progressLabel}>{Math.round(progress)}% of goal</Text>
        </MotionView>

        {streakAchievement && (
          <MotionView depth accentColor="rgba(245,166,35,0.16)" style={[s.card, s.streakCard]} delay={120}>
            <View style={s.streakHead}>
              <View style={s.streakIcon}><Text style={s.streakIconText}>F</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.streakTitle}>Consistency streak</Text>
                <Text style={s.streakSubtitle}>Best activity run: {streakDays} days</Text>
              </View>
              <Text style={s.streakCount}>{streakDays}/7</Text>
            </View>
            <View style={s.streakProgress}><AnimatedProgressFill progress={(streakDays / 7) * 100} style={s.streakProgressFill} /></View>
            <View style={s.streakWeek}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day, index) => (
                <View key={day} style={s.streakDay}>
                  <View style={[s.streakDayCircle, index < streakDays && s.streakDayComplete]}>
                    <Text style={[s.streakDayCheck, index < streakDays && s.streakDayCheckComplete]}>{index < streakDays ? '\u2713' : ''}</Text>
                  </View>
                  <Text style={s.streakDayLabel}>{day}</Text>
                </View>
              ))}
            </View>
            <Text style={s.streakNudge}>
              {streakDays === 7 ? 'Week Warrior unlocked.' : `Keep logging. ${7 - streakDays} more consecutive ${7 - streakDays === 1 ? 'day' : 'days'} to unlock Week Warrior.`}
            </Text>
          </MotionView>
        )}

        <AchievementsSection achievements={achievements} delay={150} />

        <MotionView depth accentColor={colors.glowBlue} style={s.card} delay={170}>
          <View style={s.rowBetweenCompact}>
            <Text style={[s.sectionTitle, s.sectionTitleFlush]}>Macro balance</Text>
            <Text style={s.sectionKicker}>Today</Text>
          </View>
          {macroRows.map((macro) => {
            const macroProgress = Math.min((macro.value / macro.target) * 100, 100);
            return (
              <View key={macro.name} style={s.macroBlock}>
                <View style={s.macroCopy}>
                  <View style={s.macroNameWrap}>
                    <View style={[s.macroDot, { backgroundColor: macro.color }]} />
                    <Text style={s.macroLabel}>{macro.name}</Text>
                  </View>
                  <Text style={s.macroValue}>{Math.round(macro.value)}g <Text style={s.macroTarget}>/ {Math.round(macro.target)}g</Text></Text>
                </View>
                <View style={s.macroTrack}><AnimatedProgressFill progress={macroProgress} style={[s.macroFill, { backgroundColor: macro.color }]} /></View>
              </View>
            );
          })}
          {!macroRows.some((macro) => macro.value > 0) && <Text style={s.macroEmpty}>Log food to start building your macro picture.</Text>}
        </MotionView>

        <MotionView depth accentColor={colors.glowBlue} style={s.card} delay={220}>
          <View style={s.rowBetween}>
            <View>
              <Text style={s.sectionTitle}>Water Intake</Text>
              <Text style={s.bigNumber}>{summary?.water_glasses || 0}</Text>
              <Text style={s.subText}>of {waterGoal} glasses</Text>
            </View>
            <FloatingView distance={5} duration={1600}><Text style={{ fontSize: 40 }}>💧</Text></FloatingView>
          </View>
          <View style={s.glassRow}>
            {Array.from({ length: waterGoal }).map((_, i) => (
              <Text key={i} style={[s.glass, i < (summary?.water_glasses || 0) && s.glassFilled]}>💧</Text>
            ))}
          </View>
          <MotionPressable style={s.btnSecondary} onPress={handleAddGlass} disabled={(summary?.water_glasses || 0) >= waterGoal} accessibilityLabel="Add one glass of water">
            <Text style={s.btnSecText}>+ Add Glass</Text>
          </MotionPressable>
        </MotionView>

        {suggestionsData && (
          <MotionView depth style={s.card} delay={270}>
            <View style={s.suggestionHeader}>
              <Text style={[s.sectionTitle, s.sectionTitleFlush]}>AI Meal Suggestions</Text>
              <TouchableOpacity style={s.refreshBtn} onPress={refreshSuggestions} disabled={suggestionsRefreshing} accessibilityRole="button" accessibilityLabel="Refresh meal suggestions">
                {suggestionsRefreshing
                  ? <ActivityIndicator size="small" color={colors.accentLime} />
                  : <Text style={s.refreshBtnText}>Refresh</Text>}
              </TouchableOpacity>
            </View>
            <Text style={s.suggestionSummary}>{suggestionsData.summary_text}</Text>
            {(suggestionsData.suggestions || []).map((suggestion) => (
              <MotionView key={suggestion.name} style={s.suggestionTile} variant="fade" layout>
                <View style={s.suggestionTop}>
                  <Text style={s.suggestionName}>{suggestion.name}</Text>
                  <Text style={s.suggestionCalories}>{Math.round(suggestion.calories)} kcal</Text>
                </View>
                <View style={s.suggestionBadges}>
                  {suggestion.cuisine === 'south_indian' && <Text style={s.suggestionCuisine}>South Indian</Text>}
                  <Text style={[s.suggestionDiet, suggestion.diet_type !== 'vegetarian' && s.suggestionDietNonVeg]}>
                    {suggestion.diet_type === 'vegetarian' ? 'Veg' : 'Non-veg'}
                  </Text>
                </View>
                <Text style={s.suggestionPortion}>{suggestion.portion_hint}</Text>
                <Text style={s.suggestionReason}>{suggestion.reason}</Text>
                <View style={s.suggestionMacros}>
                  <Text style={s.suggestionMacro}>P {Math.round(suggestion.protein)}g</Text>
                  <Text style={s.suggestionMacro}>C {Math.round(suggestion.carbs)}g</Text>
                  <Text style={s.suggestionMacro}>F {Math.round(suggestion.fat)}g</Text>
                </View>
              </MotionView>
            ))}
          </MotionView>
        )}

        <MotionView depth accentColor="rgba(245,166,35,0.14)" style={s.card} delay={320}>
          <View style={s.rowBetweenCompact}>
            <Text style={[s.sectionTitle, s.sectionTitleFlush]}>Quick Actions</Text>
            <Text style={s.sectionKicker}>One tap away</Text>
          </View>
          <View style={s.quickActions}>
            {[
              { icon: '🍽️', label: 'Log Food', action: () => setModal('food') },
              { icon: '🏋️', label: 'Log Workout', action: () => setModal('workout') },
              { icon: '⚖️', label: 'Log Weight', action: () => setModal('weight') },
              { icon: '📚', label: 'Planner', action: () => setShowPlanner(true) },
            ].concat([
              { icon: '\u{1F4C8}', label: 'Progress', action: () => navigation.navigate('Progress') },
              { icon: '\u{1F91D}', label: 'Community', action: () => navigation.navigate('Community') },
            ]).map((a) => (
              <TouchableOpacity
                key={a.label}
                style={s.quickBtn}
                onPress={a.action}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel={`${a.label}. ${QUICK_ACTION_META[a.label]?.detail || 'Open action'}`}
              >
                <View style={[s.quickIcon, { backgroundColor: QUICK_ACTION_META[a.label]?.tone || colors.glowPurple }]}><Text style={s.quickIconText}>{QUICK_ACTION_ICONS[a.label] || a.icon}</Text></View>
                <View style={s.quickCopy}>
                  <Text style={s.quickLabel}>{a.label}</Text>
                  <Text style={s.quickDetail}>{QUICK_ACTION_META[a.label]?.detail || 'Open'}</Text>
                </View>
                <Text style={s.quickArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </MotionView>

        <MotionView depth accentColor={colors.glowBlue} style={s.card} delay={370}>
          <View style={s.rowBetweenCompact}>
            <Text style={[s.sectionTitle, s.sectionTitleFlush]}>Suggested Workouts</Text>
            <Text style={s.sectionKicker}>Tap to prefill</Text>
          </View>
          {suggestions.map((sg) => (
            <MotionPressable key={sg.name} style={s.workoutRow} onPress={() => openWorkout(sg)} accessibilityLabel={`Start ${sg.name}. ${sg.detail}`}>
              <Text style={{ fontSize: 28, marginRight: 12 }}>{sg.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.workoutName}>{sg.name}</Text>
                <Text style={s.workoutDetail}>{sg.detail}</Text>
              </View>
              <View style={s.workoutCta}>
                <Text style={s.workoutCal}>~{sg.calories} kcal</Text>
                <Text style={s.workoutStart}>Start ›</Text>
              </View>
            </MotionPressable>
          ))}
        </MotionView>

        {!isPro(user) && <BannerAdComponent style={s.bannerAd} />}
      </ScrollView>

      {modal === 'food' && <LogFoodModal onClose={() => setModal(null)} onSave={refreshHomeData} />}
      {modal === 'workout' && <LogWorkoutModal user={user} preset={workoutPreset} onClose={() => { setModal(null); setWorkoutPreset(null); }} onSave={refreshHomeData} />}
      {modal === 'weight' && <LogWeightModal onClose={() => setModal(null)} onSave={refreshHomeData} />}
      {showPlanner && <WorkoutPlannerModal visible={showPlanner} user={user} date={today} onClose={() => setShowPlanner(false)} onSuccess={refreshHomeData} />}
    </View>
  );
};

const s = createThemedStyles(() => ({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { zIndex: 2, minHeight: 78, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.headerBackground, borderBottomWidth: 1, borderBottomColor: colors.border, shadowColor: '#3b1c63', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  greeting: { fontSize: 11, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  name: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.accentPurple, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accentPurple, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  bannerAd: { marginBottom: spacing.md },
  quoteCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(124,58,237,0.16)', shadowColor: '#4b2679', shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  quoteText: { color: colors.textSecondary, fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#4b2679', shadowOpacity: 0.09, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  missionCard: { borderColor: 'rgba(245,166,35,0.22)' },
  missionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  missionEyebrow: { color: colors.accentAmber, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  missionTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '800', marginTop: 2 },
  missionScore: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(245,166,35,0.11)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.22)', alignItems: 'center', justifyContent: 'center' },
  missionScoreComplete: { backgroundColor: 'rgba(124,58,237,0.13)', borderColor: colors.accentLime },
  missionScoreValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  missionScoreLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },
  missionMessage: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginBottom: 10 },
  missionTrack: { height: 7, backgroundColor: colors.bgElevated, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  missionFill: { height: '100%', borderRadius: 4, backgroundColor: colors.accentAmber },
  missionList: { gap: 8 },
  missionRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', padding: 9, borderRadius: radius.lg, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  missionRowComplete: { backgroundColor: 'rgba(124,58,237,0.07)', borderColor: 'rgba(124,58,237,0.2)' },
  missionIcon: { width: 38, height: 38, borderRadius: 13, marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  missionIconComplete: { backgroundColor: colors.accentLime, borderColor: colors.accentLime },
  missionIconText: { fontSize: 17, color: colors.textInverse, fontWeight: '900' },
  missionRowTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  missionRowTitleComplete: { color: colors.accentLime },
  missionRowDetail: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  missionAction: { color: colors.accentPurple, fontSize: 10, fontWeight: '800', paddingHorizontal: 8 },
  missionActionComplete: { color: colors.textMuted },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  bigNumber: { fontSize: 42, fontWeight: '800', color: colors.accentLime, lineHeight: 46 },
  goalNudge: { color: colors.accentAmber, fontSize: 11, lineHeight: 17, marginBottom: 5 },
  subText: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  formulaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  formulaLabel: { color: colors.textMuted, fontSize: 12 },
  formulaValue: { color: colors.textPrimary, fontWeight: '600', fontSize: 12 },
  progressBar: { height: 7, backgroundColor: colors.bgElevated, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowBetweenCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionKicker: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitleFlush: { marginBottom: 0 },
  streakHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  streakCard: { flexGrow: 0, minHeight: 0 },
  streakIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(245,166,35,0.13)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  streakIconText: { color: colors.accentAmber, fontSize: 17, fontWeight: '900' },
  streakTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  streakSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  streakCount: { color: colors.accentLime, fontSize: 13, fontWeight: '800' },
  streakProgress: { height: 6, backgroundColor: colors.bgElevated, borderRadius: 4, overflow: 'hidden' },
  streakProgressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.accentPurple },
  streakWeek: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  streakDay: { alignItems: 'center' },
  streakDayCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  streakDayComplete: { backgroundColor: colors.accentPurple, borderColor: colors.accentPurple },
  streakDayCheck: { color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  streakDayCheckComplete: { color: colors.textInverse },
  streakDayLabel: { color: colors.textMuted, fontSize: 9, marginTop: 4 },
  streakNudge: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  macroBlock: { marginBottom: 12 },
  macroCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  macroNameWrap: { flexDirection: 'row', alignItems: 'center' },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  macroLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  macroValue: { color: colors.textPrimary, fontWeight: '800', fontSize: 12 },
  macroTarget: { color: colors.textMuted, fontWeight: '500' },
  macroTrack: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.bgElevated },
  macroFill: { height: '100%', borderRadius: 4 },
  macroEmpty: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  glassRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  glass: { fontSize: 18, opacity: 0.3 },
  glassFilled: { opacity: 1 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: { flexBasis: '47%', flexGrow: 1, minHeight: 66, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgElevated, borderRadius: radius.lg, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(124,58,237,0.16)', shadowColor: '#4b2679', shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  quickIconText: { fontSize: 18 },
  quickCopy: { flex: 1 },
  quickLabel: { color: colors.textPrimary, fontSize: 11.5, fontWeight: '800' },
  quickDetail: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  quickArrow: { color: colors.textMuted, fontSize: 18, marginLeft: 3 },
  workoutRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  workoutName: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  workoutDetail: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  workoutCal: { color: colors.accentAmber, fontSize: 12, fontWeight: '600' },
  workoutCta: { alignItems: 'flex-end' },
  workoutStart: { color: colors.accentPurple, fontSize: 9, fontWeight: '800', marginTop: 3 },
  suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  refreshBtn: { minWidth: 62, height: 30, borderRadius: 9, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  refreshBtnText: { color: colors.textPrimary, fontSize: 10, fontWeight: '700' },
  suggestionSummary: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginBottom: 12 },
  suggestionTile: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: 13, borderWidth: 1, borderColor: colors.border, marginBottom: 9 },
  suggestionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  suggestionName: { flex: 1, color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '800', marginRight: 10 },
  suggestionBadges: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  suggestionCuisine: { color: colors.accentPurple, fontSize: 9, fontWeight: '800', backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
  suggestionDiet: { color: colors.accentLime, fontSize: 9, fontWeight: '800', backgroundColor: 'rgba(200,241,53,0.12)', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
  suggestionDietNonVeg: { color: colors.accentAmber, backgroundColor: 'rgba(245,166,35,0.12)' },
  suggestionCalories: { color: colors.accentLime, fontSize: 10, fontWeight: '800', backgroundColor: 'rgba(124,58,237,0.09)', borderRadius: 12, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  suggestionPortion: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 9 },
  suggestionReason: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  suggestionMacros: { flexDirection: 'row', marginTop: 9, gap: 14 },
  suggestionMacro: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  keyboardAvoider: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xl, maxHeight: '90%', borderWidth: 1, borderColor: 'rgba(124,58,237,0.17)', shadowColor: '#24113f', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: -9 }, elevation: 22 },
  handle: { width: 42, height: 5, backgroundColor: colors.accentPurple, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 18 },
  modalScroll: { flexGrow: 0 },
  modalScrollContent: { paddingBottom: spacing.sm },
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
}));

export default Home;
