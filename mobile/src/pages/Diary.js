import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, RefreshControl, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { addDays, formatDate, formatDisplayDate, getMealIcon } from '../utils/fitness';
import { createEmptySummary, getCachedDiaryDate, getFavorites, setFavorites as saveFavorites } from '../utils/storage';
import FoodScannerModal from '../components/FoodScannerModal';
import AppBackdrop from '../components/AppBackdrop';
import { AnimatedProgressFill, MotionPressable, MotionView } from '../components/Motion';
import { colors, createThemedStyles, radius, spacing } from '../utils/theme';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];

const MICRO_FIELDS = [
  { key: 'fiber', label: 'Fiber', unit: 'g', color: 'accentPurple' },
  { key: 'sugar', label: 'Sugar', unit: 'g', color: 'accentCoral' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', color: 'accentBlue' },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg', color: 'accentPurple' },
  { key: 'vitamin_d', label: 'Vitamin D', unit: 'mcg', color: 'accentAmber' },
  { key: 'vitamin_b12', label: 'Vitamin B12', unit: 'mcg', color: 'accentPurple' },
  { key: 'iron', label: 'Iron', unit: 'mg', color: 'accentCoral' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', color: 'accentBlue' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', color: 'accentAmber' },
];

const EMPTY_FORM = { food_name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', sodium: '', vitamin_c: '', vitamin_d: '', vitamin_b12: '', iron: '', calcium: '', potassium: '', quantity: '1' };

const buildPayload = (form, meal, date) => ({
  date, meal_type: meal, food_name: form.food_name,
  calories: parseFloat(form.calories) || 0, protein: parseFloat(form.protein) || 0,
  carbs: parseFloat(form.carbs) || 0, fat: parseFloat(form.fat) || 0,
  fiber: parseFloat(form.fiber) || 0, sugar: parseFloat(form.sugar) || 0,
  sodium: parseFloat(form.sodium) || 0, vitamin_c: parseFloat(form.vitamin_c) || 0,
  vitamin_d: parseFloat(form.vitamin_d) || 0, vitamin_b12: parseFloat(form.vitamin_b12) || 0,
  iron: parseFloat(form.iron) || 0, calcium: parseFloat(form.calcium) || 0,
  potassium: parseFloat(form.potassium) || 0, quantity: parseFloat(form.quantity) || 1,
});

const fillForm = (result) => ({
  food_name: result.name || '', calories: result.calories ? String(result.calories) : '',
  protein: result.protein ? String(result.protein) : '', carbs: result.carbs ? String(result.carbs) : '',
  fat: result.fat ? String(result.fat) : '', fiber: result.fiber ? String(result.fiber) : '',
  sugar: result.sugar ? String(result.sugar) : '', sodium: result.sodium ? String(result.sodium) : '',
  vitamin_c: result.vitamin_c ? String(result.vitamin_c) : '', vitamin_d: result.vitamin_d ? String(result.vitamin_d) : '',
  vitamin_b12: result.vitamin_b12 ? String(result.vitamin_b12) : '', iron: result.iron ? String(result.iron) : '',
  calcium: result.calcium ? String(result.calcium) : '', potassium: result.potassium ? String(result.potassium) : '',
  quantity: '1',
});

const startOfWeek = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return formatDate(date);
};

const formatWeekLabel = (dateString) => {
  const start = new Date(dateString);
  const end = new Date(dateString);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const formatWeekday = (dateString) => new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const emptyMealPlan = (weekStart) => ({
  entries: [],
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  shopping_list: [],
  start_date: weekStart,
  end_date: addDays(weekStart, 6),
});

const ModalSheet = ({ visible, title, onClose, children }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
        <View style={s.handle} />
        <Text style={s.modalTitle}>{title}</Text>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const AddFoodModal = ({ meal, date, visible, onClose, onSave }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showMicros, setShowMicros] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 2) { Toast.show({ type: 'error', text1: 'Search for at least 2 characters' }); return; }
    setSearching(true);
    try { const data = await api.searchFoods(query.trim()); setResults(data.results || []); }
    catch (err) { Toast.show({ type: 'error', text1: err.message || 'Search failed' }); }
    finally { setSearching(false); }
  };

  const handleSave = async () => {
    if (!form.food_name || !form.calories) { Toast.show({ type: 'error', text1: 'Food name and calories are required' }); return; }
    setLoading(true);
    try {
      await api.logFood(buildPayload(form, meal, date));
      Toast.show({ type: 'success', text1: 'Food logged' });
      await onSave(); onClose();
    } catch (err) { Toast.show({ type: 'error', text1: err.message || 'Could not save food' }); }
    finally { setLoading(false); }
  };

  return (
    <ModalSheet visible={visible} title={`${getMealIcon(meal)} Add to ${meal.charAt(0).toUpperCase() + meal.slice(1)}`} onClose={onClose}>
      <View style={s.searchRow}>
        <TextInput style={[s.input, { flex: 1, marginRight: 8 }]} placeholder="Try dosa, paneer, biryani..." placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} />
        <TouchableOpacity style={s.searchBtn} onPress={handleSearch} disabled={searching}>
          <Text style={s.searchBtnText}>{searching ? '...' : 'Search'}</Text>
        </TouchableOpacity>
      </View>
      {results.slice(0, 5).map((r) => (
        <TouchableOpacity key={r.code} style={s.resultRow} onPress={() => { setForm(fillForm(r)); setResults([]); Toast.show({ type: 'success', text1: 'Nutrition details filled' }); }}>
          <Text style={s.resultName}>{r.name}</Text>
          <Text style={s.resultMeta}>{Math.round(r.calories || 0)} kcal</Text>
        </TouchableOpacity>
      ))}
      <View style={s.inputGroup}><Text style={s.label}>Food Name</Text><TextInput style={s.input} placeholder="e.g. Greek yogurt" placeholderTextColor={colors.textMuted} value={form.food_name} onChangeText={(v) => setForm((f) => ({ ...f, food_name: v }))} /></View>
      <View style={s.row}>
        <View style={{ flex: 1, marginRight: 8 }}><Text style={s.label}>Calories</Text><TextInput style={s.input} placeholder="0" placeholderTextColor={colors.textMuted} value={form.calories} onChangeText={(v) => setForm((f) => ({ ...f, calories: v }))} keyboardType="numeric" /></View>
        <View style={{ flex: 1 }}><Text style={s.label}>Multiplier</Text><TextInput style={s.input} placeholder="1" placeholderTextColor={colors.textMuted} value={form.quantity} onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))} keyboardType="numeric" /></View>
      </View>
      <View style={s.row}>
        <View style={{ flex: 1, marginRight: 8 }}><Text style={s.label}>Protein (g)</Text><TextInput style={s.input} placeholder="0" placeholderTextColor={colors.textMuted} value={form.protein} onChangeText={(v) => setForm((f) => ({ ...f, protein: v }))} keyboardType="numeric" /></View>
        <View style={{ flex: 1, marginRight: 8 }}><Text style={s.label}>Carbs (g)</Text><TextInput style={s.input} placeholder="0" placeholderTextColor={colors.textMuted} value={form.carbs} onChangeText={(v) => setForm((f) => ({ ...f, carbs: v }))} keyboardType="numeric" /></View>
        <View style={{ flex: 1 }}><Text style={s.label}>Fat (g)</Text><TextInput style={s.input} placeholder="0" placeholderTextColor={colors.textMuted} value={form.fat} onChangeText={(v) => setForm((f) => ({ ...f, fat: v }))} keyboardType="numeric" /></View>
      </View>
      <TouchableOpacity style={s.microToggle} onPress={() => setShowMicros((current) => !current)}>
        <Text style={s.microToggleText}>{showMicros ? 'Hide micronutrients' : 'Add micronutrients'}</Text>
      </TouchableOpacity>
      {showMicros && (
        <View style={s.microInputGrid}>
          {MICRO_FIELDS.map((field) => (
            <View key={field.key} style={s.microInputCell}>
              <Text style={s.label}>{field.label} ({field.unit})</Text>
              <TextInput
                style={s.input}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={form[field.key]}
                onChangeText={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
                keyboardType="decimal-pad"
              />
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Add Food</Text>}
      </TouchableOpacity>
      <View style={{ height: 20 }} />
    </ModalSheet>
  );
};

const SaveTemplateModal = ({ draft, visible, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && draft?.meal) setName(`My ${draft.meal}`);
  }, [draft?.meal, visible]);

  if (!draft) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Give this meal a name' });
      return;
    }
    setSaving(true);
    try {
      await api.createMealTemplate({
        name: name.trim(),
        meal_type: draft.meal,
        template_type: 'meal',
        servings: 1,
        foods: draft.items.map((item) => ({
          food_name: item.food_name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber || 0,
          sugar: item.sugar || 0,
          sodium: item.sodium || 0,
          vitamin_c: item.vitamin_c || 0,
          vitamin_d: item.vitamin_d || 0,
          vitamin_b12: item.vitamin_b12 || 0,
          iron: item.iron || 0,
          calcium: item.calcium || 0,
          potassium: item.potassium || 0,
          quantity: 1,
        })),
      });
      Toast.show({ type: 'success', text1: 'Meal template saved' });
      await onSaved();
      onClose();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const totals = draft.items.reduce((result, item) => ({
    calories: result.calories + Number(item.calories || 0),
    protein: result.protein + Number(item.protein || 0),
    carbs: result.carbs + Number(item.carbs || 0),
    fat: result.fat + Number(item.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <ModalSheet visible={visible} title="Save Meal Template" onClose={onClose}>
      <View style={s.inputGroup}>
        <Text style={s.label}>Template Name</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="My usual breakfast" placeholderTextColor={colors.textMuted} />
      </View>
      <View style={s.plannerHero}>
        <Text style={s.plannerEyebrow}>Summary</Text>
        <Text style={s.plannerHeroTitle}>{draft.items.length} foods</Text>
        <Text style={s.plannerHeroMeta}>{Math.round(totals.calories)} kcal · P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fat)}g</Text>
      </View>
      <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Save Template</Text>}
      </TouchableOpacity>
    </ModalSheet>
  );
};

const MealPlanEntryModal = ({ templates, weekStart, visible, onClose, onSaved }) => {
  const [templateId, setTemplateId] = useState(templates[0]?.id || null);
  const [plannedDate, setPlannedDate] = useState(weekStart);
  const [mealType, setMealType] = useState(templates[0]?.meal_type || 'dinner');
  const [servings, setServings] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const first = templates[0];
    setTemplateId(first?.id || null);
    setMealType(first?.meal_type || 'dinner');
    setPlannedDate(weekStart);
    setServings('1');
    setNotes('');
  }, [templates, visible, weekStart]);

  const selectedTemplate = templates.find((template) => template.id === templateId);

  const handleSave = async () => {
    if (!templateId) {
      Toast.show({ type: 'error', text1: 'Save a meal template before planning it' });
      return;
    }
    setSaving(true);
    try {
      await api.createMealPlanEntry({
        template_id: templateId,
        planned_date: plannedDate,
        meal_type: mealType,
        servings: parseFloat(servings) || 1,
        notes: notes.trim() || null,
      });
      Toast.show({ type: 'success', text1: 'Meal added to your week' });
      await onSaved();
      onClose();
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message || 'Could not save meal plan' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} title="Plan Meals For The Week" onClose={onClose}>
      {templates.length === 0 ? (
        <View style={s.emptyPanel}>
          <Text style={s.emptyPanelTitle}>No saved meals yet</Text>
          <Text style={s.emptyPanelText}>Use Save on any logged meal, then add it to your weekly plan.</Text>
        </View>
      ) : (
        <>
          <Text style={s.label}>Template or Recipe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.choiceScroll}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[s.choiceChip, templateId === template.id && s.choiceChipActive]}
                onPress={() => { setTemplateId(template.id); setMealType(template.meal_type || mealType); }}
              >
                <Text style={[s.choiceChipText, templateId === template.id && s.choiceChipTextActive]}>{template.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>Planned Date</Text>
          <View style={s.weekChoiceRow}>
            {Array.from({ length: 7 }).map((_, index) => {
              const value = addDays(weekStart, index);
              const selected = plannedDate === value;
              return (
                <TouchableOpacity key={value} style={[s.dayChoice, selected && s.dayChoiceActive]} onPress={() => setPlannedDate(value)}>
                  <Text style={[s.dayChoiceName, selected && s.dayChoiceTextActive]}>{new Date(value).toLocaleDateString('en-US', { weekday: 'narrow' })}</Text>
                  <Text style={[s.dayChoiceDate, selected && s.dayChoiceTextActive]}>{new Date(value).getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.label}>Meal Type</Text>
          <View style={s.mealChoiceRow}>
            {MEALS.map((meal) => (
              <TouchableOpacity key={meal} style={[s.mealChoice, mealType === meal && s.choiceChipActive]} onPress={() => setMealType(meal)}>
                <Text style={[s.mealChoiceText, mealType === meal && s.choiceChipTextActive]}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.label}>Servings</Text>
              <TextInput style={s.input} value={servings} onChangeText={setServings} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={s.label}>Notes</Text>
              <TextInput style={s.input} value={notes} onChangeText={setNotes} placeholder="Prep Sunday night" placeholderTextColor={colors.textMuted} />
            </View>
          </View>

          {selectedTemplate && (
            <View style={s.plannerHero}>
              <Text style={s.plannerEyebrow}>Selected</Text>
              <Text style={s.plannerHeroTitle}>{selectedTemplate.name}</Text>
              <Text style={s.plannerHeroMeta}>{selectedTemplate.template_type || 'meal'} · {(selectedTemplate.foods || []).length} foods</Text>
            </View>
          )}
          <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Add To Week</Text>}
          </TouchableOpacity>
        </>
      )}
    </ModalSheet>
  );
};

const MealSection = ({ meal, items, onAdd, onScan, onDelete, onFavorite, onSaveTemplate, motionDelay = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const mealItems = items.filter((i) => i.meal_type === meal);
  const mealCal = mealItems.reduce((s, i) => s + i.calories, 0);
  return (
    <MotionView style={s.mealSection} delay={motionDelay} layout>
      <TouchableOpacity style={s.mealHeader} onPress={() => setExpanded((e) => !e)}>
        <View style={s.mealHeaderLeft}>
          <Text style={{ fontSize: 24, marginRight: 10 }}>{getMealIcon(meal)}</Text>
          <View>
            <Text style={s.mealName}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
            <Text style={s.mealCal}>{Math.round(mealCal)} kcal</Text>
          </View>
        </View>
        <View style={s.mealActions}>
          {mealItems.length > 0 && <MotionPressable style={s.mealBtn} onPress={() => onSaveTemplate(meal, mealItems)}><Text style={s.mealBtnText}>Save</Text></MotionPressable>}
          <TouchableOpacity style={s.mealBtn} onPress={() => onScan(meal)}><Text style={s.mealBtnText}>Scan</Text></TouchableOpacity>
          <TouchableOpacity style={s.mealBtn} onPress={() => onAdd(meal)}><Text style={s.mealBtnText}>+</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View>
          {mealItems.length === 0 ? (
            <Text style={s.emptyMeal}>Nothing logged yet. Tap + to add food.</Text>
          ) : (
            mealItems.map((item) => (
              <View key={item.id} style={s.foodItem}>
                <View style={{ flex: 1 }}>
                  <Text style={s.foodName}>{item.food_name}</Text>
                  <Text style={s.foodMacros}>P: {Math.round(item.protein)}g · C: {Math.round(item.carbs)}g · F: {Math.round(item.fat)}g</Text>
                </View>
                <Text style={s.foodCal}>{Math.round(item.calories)}</Text>
                <TouchableOpacity style={s.favBtn} onPress={() => onFavorite(item)}><Text style={{ color: colors.accentAmber, fontSize: 16 }}>★</Text></TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => Alert.alert('Delete', `Remove ${item.food_name}?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) }])}>
                  <Text style={{ color: colors.accentCoral, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}
    </MotionView>
  );
};

const Diary = () => {
  const [date, setDate] = useState(formatDate(new Date()));
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(() => createEmptySummary(formatDate(new Date())));
  const [refreshing, setRefreshing] = useState(false);
  const [addModal, setAddModal] = useState(null);
  const [scanModal, setScanModal] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateDraft, setTemplateDraft] = useState(null);
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(formatDate(new Date())));
  const [mealPlan, setMealPlan] = useState(() => emptyMealPlan(startOfWeek(formatDate(new Date()))));
  const [mealPlanLoading, setMealPlanLoading] = useState(true);

  const loadData = useCallback(async () => {
    const cached = await getCachedDiaryDate(date);
    setItems(cached.logs || []);
    setSummary(cached.summary || createEmptySummary(date));
    try {
      const [logs, dailySummary] = await Promise.all([api.getFoodLogs(date), api.getDailySummary(date)]);
      setItems(logs); setSummary(dailySummary);
    } catch (err) { Toast.show({ type: 'error', text1: err.message || 'Failed to load diary' }); }
  }, [date]);

  const loadTemplates = useCallback(async () => {
    try { setTemplates(await api.getMealTemplates()); }
    catch { setTemplates([]); }
  }, []);

  const loadMealPlan = useCallback(async () => {
    setMealPlanLoading(true);
    try { setMealPlan(await api.getWeeklyMealPlan(weekStart)); }
    catch { setMealPlan(emptyMealPlan(weekStart)); }
    finally { setMealPlanLoading(false); }
  }, [weekStart]);

  const refreshDiary = useCallback(async () => {
    await Promise.all([loadData(), loadTemplates(), loadMealPlan()]);
  }, [loadData, loadMealPlan, loadTemplates]);

  useEffect(() => { refreshDiary(); getFavorites().then(setFavorites); }, [refreshDiary]);
  useRefreshRegistration(refreshDiary);

  const onRefresh = async () => { setRefreshing(true); await refreshDiary(); setRefreshing(false); };

  const navigateDate = (dir) => {
    const next = addDays(date, dir);
    if (next > formatDate(new Date())) return;
    setDate(next);
  };

  const handleDelete = async (id) => {
    try { await api.deleteFoodLog(id); Toast.show({ type: 'success', text1: 'Removed' }); await loadData(); }
    catch (err) { Toast.show({ type: 'error', text1: err.message || 'Failed to delete' }); }
  };

  const handleFavorite = async (item) => {
    const fav = { id: `${item.food_name.toLowerCase()}::${item.meal_type}`, food_name: item.food_name, meal_type: item.meal_type, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, fiber: item.fiber || 0, sugar: item.sugar || 0, sodium: item.sodium || 0, vitamin_c: item.vitamin_c || 0, vitamin_d: item.vitamin_d || 0, vitamin_b12: item.vitamin_b12 || 0, iron: item.iron || 0, calcium: item.calcium || 0, potassium: item.potassium || 0 };
    if (favorites.some((f) => f.id === fav.id)) { Toast.show({ type: 'info', text1: 'Already in favorites' }); return; }
    const next = [fav, ...favorites];
    setFavorites(next); await saveFavorites(next);
    Toast.show({ type: 'success', text1: 'Saved to favorites' });
  };

  const totalCalories = items.reduce((s, i) => s + i.calories, 0);

  return (
    <View style={s.page}>
      <AppBackdrop />
      <View style={s.header}>
        <Text style={s.headerTitle}>Food Diary</Text>
        <Text style={s.badge}>{Math.round(totalCalories)} kcal</Text>
      </View>

      <View style={s.dateNav}>
        <TouchableOpacity style={s.dateBtn} onPress={() => navigateDate(-1)}><Text style={s.dateBtnText}>{'<'}</Text></TouchableOpacity>
        <Text style={s.dateText}>{formatDisplayDate(date)}</Text>
        <TouchableOpacity style={[s.dateBtn, date >= formatDate(new Date()) && s.dateBtnDisabled]} onPress={() => navigateDate(1)} disabled={date >= formatDate(new Date())}>
          <Text style={s.dateBtnText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentLime} />}>
        {summary && (
          <MotionView style={s.summaryCard} delay={30}>
            <View style={s.rowBetween}>
              <Text style={s.summaryText}>{Math.round(summary.calories_consumed)} / {Math.round(summary.calories_target)} kcal</Text>
              <Text style={[s.summaryText, { color: summary.calories_consumed > summary.calories_target ? colors.accentCoral : colors.accentLime }]}>
                {summary.calories_consumed > summary.calories_target ? 'Over' : `${Math.round(summary.calories_target - summary.calories_consumed)} left`}
              </Text>
            </View>
            <View style={s.progressBar}><AnimatedProgressFill progress={Math.min((summary.calories_consumed / summary.calories_target) * 100, 100)} style={s.progressFill} /></View>
            <View style={s.macroRow}>
              {[{ label: 'Protein', value: summary.protein, color: '#4facfe' }, { label: 'Carbs', value: summary.carbs, color: colors.accentLime }, { label: 'Fat', value: summary.fat, color: colors.accentAmber }].map((m) => (
                <View key={m.label} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={[s.macroValue, { color: m.color }]}>{Math.round(m.value)}g</Text>
                  <Text style={s.macroLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </MotionView>
        )}

        {summary?.micronutrients && (
          <MotionView style={s.card} delay={80}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Micronutrients</Text>
              <Text style={s.infoBadge}>Daily % RDA</Text>
            </View>
            <View style={s.microGrid}>
              {MICRO_FIELDS.map((field) => {
                const total = summary.micronutrients[field.key] || 0;
                const percent = summary.micronutrients.percent_of_rda?.[field.key] || 0;
                const accent = colors[field.color];
                return (
                  <View key={field.key} style={s.microCard}>
                    <View style={s.microCardTop}>
                      <Text style={s.microCardLabel}>{field.label}</Text>
                      <Text style={s.microPercent}>{Math.round(percent)}%</Text>
                    </View>
                    <Text style={[s.microValue, { color: accent }]}>{Math.round(total)}{field.unit}</Text>
                    <View style={s.microTrack}><AnimatedProgressFill progress={percent} style={[s.microFill, { backgroundColor: accent }]} /></View>
                  </View>
                );
              })}
            </View>
          </MotionView>
        )}

        {favorites.length > 0 && (
          <MotionView style={s.card} delay={130}>
            <Text style={s.sectionTitle}>Favorite Foods</Text>
            {favorites.map((fav) => (
              <View key={fav.id} style={s.favCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.foodName}>{fav.food_name}</Text>
                  <Text style={s.foodMacros}>{fav.meal_type} · {Math.round(fav.calories)} kcal</Text>
                </View>
                <TouchableOpacity style={s.logBtn} onPress={async () => {
                  try { await api.logFood({ date, ...fav, quantity: 1 }); Toast.show({ type: 'success', text1: `${fav.food_name} logged` }); await loadData(); }
                  catch (err) { Toast.show({ type: 'error', text1: err.message }); }
                }}>
                  <Text style={s.logBtnText}>Log</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                  const next = favorites.filter((f) => f.id !== fav.id);
                  setFavorites(next); await saveFavorites(next);
                }}>
                  <Text style={{ color: colors.textMuted, fontSize: 16, marginLeft: 8 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </MotionView>
        )}

        <MotionView style={s.card} delay={180}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Meal Prep Planner</Text>
            <View style={s.plannerNav}>
              <TouchableOpacity style={s.plannerNavBtn} onPress={() => setWeekStart(addDays(weekStart, -7))}><Text style={s.plannerNavText}>Prev</Text></TouchableOpacity>
              <TouchableOpacity style={s.plannerNavBtn} onPress={() => setWeekStart(addDays(weekStart, 7))}><Text style={s.plannerNavText}>Next</Text></TouchableOpacity>
            </View>
          </View>
          <View style={s.plannerHero}>
            <Text style={s.plannerEyebrow}>Week of</Text>
            <Text style={s.plannerHeroTitle}>{formatWeekLabel(weekStart)}</Text>
            <Text style={s.plannerHeroMeta}>{mealPlan?.entries?.length || 0} planned meals · {Math.round(mealPlan?.totals?.calories || 0)} kcal total · P {Math.round(mealPlan?.totals?.protein || 0)}g</Text>
            <TouchableOpacity style={s.planWeekBtn} onPress={() => setShowMealPlanner(true)}>
              <Text style={s.planWeekBtnText}>+ Add planned meal</Text>
            </TouchableOpacity>
          </View>

          {mealPlanLoading ? (
            <ActivityIndicator color={colors.accentLime} style={{ marginVertical: 22 }} />
          ) : (
            <>
              {(mealPlan?.entries || []).map((entry) => (
                <View key={entry.id} style={s.planEntry}>
                  <View style={s.planEntryTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.planEntryTitle}>{entry.template_name}</Text>
                      <Text style={s.planEntryMeta}>{formatWeekday(entry.planned_date)} · {entry.meal_type} · {entry.servings} servings</Text>
                    </View>
                    <Text style={s.planEntryCalories}>{Math.round(entry.nutrition?.calories || 0)} kcal</Text>
                  </View>
                  {!!entry.notes && <Text style={s.planEntryMeta}>{entry.notes}</Text>}
                  <TouchableOpacity
                    style={s.removePlanBtn}
                    onPress={() => Alert.alert('Remove planned meal?', entry.template_name, [
                      { text: 'Cancel' },
                      { text: 'Remove', style: 'destructive', onPress: async () => {
                        try { await api.deleteMealPlanEntry(entry.id); await loadMealPlan(); }
                        catch (err) { Toast.show({ type: 'error', text1: err.message || 'Could not remove meal' }); }
                      } },
                    ])}
                  >
                    <Text style={s.removePlanText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {(mealPlan?.entries || []).length === 0 && (
                <View style={s.emptyPanel}>
                  <Text style={s.emptyPanelTitle}>No meals planned yet</Text>
                  <Text style={s.emptyPanelText}>Save a logged meal and add it here to build weekly macros and a shopping list.</Text>
                </View>
              )}

              <View style={s.plannerTotalsCard}>
                <Text style={s.planEntryTitle}>Weekly macro totals</Text>
                {[
                  ['Calories', `${Math.round(mealPlan?.totals?.calories || 0)} kcal`],
                  ['Protein', `${Math.round(mealPlan?.totals?.protein || 0)}g`],
                  ['Carbs', `${Math.round(mealPlan?.totals?.carbs || 0)}g`],
                  ['Fat', `${Math.round(mealPlan?.totals?.fat || 0)}g`],
                ].map(([label, value]) => (
                  <View key={label} style={s.plannerStatRow}><Text style={s.plannerStatLabel}>{label}</Text><Text style={s.plannerStatValue}>{value}</Text></View>
                ))}
              </View>

              <View style={s.plannerTotalsCard}>
                <Text style={s.planEntryTitle}>Shopping list</Text>
                {(mealPlan?.shopping_list || []).slice(0, 8).map((item) => (
                  <View key={item.food_name} style={s.plannerStatRow}>
                    <Text style={s.plannerStatLabel}>{item.food_name}</Text>
                    <Text style={s.plannerStatValue}>{item.quantity} {item.unit_hint || 'servings'}</Text>
                  </View>
                ))}
                {(mealPlan?.shopping_list || []).length === 0 && <Text style={s.emptyPanelText}>Plan meals to generate a shopping list automatically.</Text>}
              </View>
            </>
          )}
        </MotionView>

        {MEALS.map((meal, index) => (
          <MealSection key={meal} meal={meal} items={items} onAdd={setAddModal} onScan={setScanModal} onDelete={handleDelete} onFavorite={handleFavorite} onSaveTemplate={(mealName, mealItems) => setTemplateDraft({ meal: mealName, items: mealItems })} motionDelay={230 + (index * 45)} />
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {MEALS.map((meal) => (
        <AddFoodModal key={meal} meal={meal} date={date} visible={addModal === meal} onClose={() => setAddModal(null)} onSave={loadData} />
      ))}
      {scanModal && <FoodScannerModal defaultMeal={scanModal} date={date} onClose={() => setScanModal(null)} onSuccess={loadData} />}
      <SaveTemplateModal draft={templateDraft} visible={Boolean(templateDraft)} onClose={() => setTemplateDraft(null)} onSaved={loadTemplates} />
      <MealPlanEntryModal templates={templates} weekStart={weekStart} visible={showMealPlanner} onClose={() => setShowMealPlanner(false)} onSaved={loadMealPlan} />
    </View>
  );
};

const s = createThemedStyles(() => ({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.headerBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  badge: { backgroundColor: 'rgba(200,241,53,0.12)', color: colors.accentLime, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, fontSize: 12, fontWeight: '700' },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  dateBtn: { padding: 7, backgroundColor: colors.bgElevated, borderRadius: 8 },
  dateBtnDisabled: { opacity: 0.3 },
  dateBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  dateText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1, padding: spacing.md },
  summaryCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#48236f', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  summaryText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accentLime },
  macroRow: { flexDirection: 'row', marginTop: 4 },
  macroValue: { fontWeight: '700', fontSize: 14 },
  macroLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', marginTop: 2 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#48236f', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoBadge: { color: colors.accentBlue, backgroundColor: 'rgba(37,99,235,0.09)', borderWidth: 1, borderColor: 'rgba(37,99,235,0.16)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, fontSize: 9, fontWeight: '700', marginBottom: 10, overflow: 'hidden' },
  microGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  microCard: { width: '48%', minHeight: 94, backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: 11, borderWidth: 1, borderColor: colors.border },
  microCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  microCardLabel: { color: colors.textSecondary, fontSize: 9, textTransform: 'uppercase' },
  microPercent: { color: colors.accentPurple, backgroundColor: 'rgba(124,58,237,0.08)', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, fontWeight: '800' },
  microValue: { fontSize: 19, fontWeight: '800', marginTop: 10 },
  microTrack: { height: 5, backgroundColor: colors.bgCard, borderRadius: 3, overflow: 'hidden', marginTop: 9 },
  microFill: { height: '100%', borderRadius: 3 },
  favCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  logBtn: { backgroundColor: colors.accentLime, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  logBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 12 },
  mealSection: { backgroundColor: colors.bgCard, borderRadius: radius.xl, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', shadowColor: '#48236f', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  mealName: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },
  mealCal: { color: colors.textMuted, fontSize: 11 },
  mealActions: { flexDirection: 'row', gap: 6 },
  mealBtn: { backgroundColor: colors.bgElevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.border },
  mealBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  emptyMeal: { color: colors.textMuted, fontSize: 12, textAlign: 'center', padding: 14 },
  foodItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  foodName: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  foodMacros: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  foodCal: { color: colors.accentAmber, fontWeight: '700', fontSize: 13, marginRight: 6 },
  favBtn: { padding: 5, marginRight: 3 },
  delBtn: { padding: 5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '90%' },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 18 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, color: colors.textSecondary, marginBottom: 5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { backgroundColor: colors.bgElevated, borderRadius: 10, padding: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', marginBottom: 14 },
  microToggle: { alignItems: 'center', justifyContent: 'center', padding: 10, marginBottom: 12, backgroundColor: colors.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  microToggleText: { color: colors.accentPurple, fontSize: 12, fontWeight: '700' },
  microInputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  microInputCell: { width: '48%' },
  searchRow: { flexDirection: 'row', marginBottom: 10 },
  searchBtn: { backgroundColor: colors.accentPurple, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 9, backgroundColor: colors.bgElevated, borderRadius: 8, marginBottom: 5 },
  resultName: { color: colors.textPrimary, fontSize: 13, flex: 1 },
  resultMeta: { color: colors.accentAmber, fontSize: 13, fontWeight: '600' },
  plannerNav: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  plannerNavBtn: { backgroundColor: colors.bgElevated, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: colors.border },
  plannerNavText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  plannerHero: { backgroundColor: 'rgba(124,58,237,0.07)', borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)', marginBottom: 12 },
  plannerEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  plannerHeroTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 7 },
  plannerHeroMeta: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 5 },
  planWeekBtn: { alignSelf: 'flex-start', marginTop: 11, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.accentPurple },
  planWeekBtnText: { color: colors.textInverse, fontSize: 10, fontWeight: '800' },
  planEntry: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 9 },
  planEntryTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  planEntryTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800', marginBottom: 5 },
  planEntryMeta: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  planEntryCalories: { color: colors.accentBlue, fontSize: 10, fontWeight: '800', marginLeft: 8 },
  removePlanBtn: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  removePlanText: { color: colors.accentCoral, fontSize: 9, fontWeight: '700' },
  emptyPanel: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  emptyPanelTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800', marginBottom: 5 },
  emptyPanelText: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  plannerTotalsCard: { backgroundColor: colors.bgElevated, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border, marginTop: 9 },
  plannerStatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  plannerStatLabel: { flex: 1, color: colors.textMuted, fontSize: 10, marginRight: 8 },
  plannerStatValue: { color: colors.textPrimary, fontSize: 10, fontWeight: '700', textAlign: 'right' },
  choiceScroll: { marginBottom: 14 },
  choiceChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, marginRight: 7 },
  choiceChipActive: { backgroundColor: 'rgba(124,58,237,0.13)', borderColor: colors.accentPurple },
  choiceChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  choiceChipTextActive: { color: colors.accentPurple },
  weekChoiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  dayChoice: { width: 37, height: 49, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  dayChoiceActive: { backgroundColor: colors.accentPurple, borderColor: colors.accentPurple },
  dayChoiceName: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  dayChoiceDate: { color: colors.textPrimary, fontSize: 12, fontWeight: '800', marginTop: 3 },
  dayChoiceTextActive: { color: colors.textInverse },
  mealChoiceRow: { flexDirection: 'row', gap: 5, marginBottom: 14 },
  mealChoice: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  mealChoiceText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
}));

export default Diary;
