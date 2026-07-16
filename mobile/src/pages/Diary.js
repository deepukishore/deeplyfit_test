import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, RefreshControl, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { addDays, formatDate, formatDisplayDate, getMealIcon } from '../utils/fitness';
import { createEmptySummary, getCachedDiaryDate, getFavorites, setFavorites as saveFavorites } from '../utils/storage';
import FoodScannerModal from '../components/FoodScannerModal';
import { colors, radius, spacing } from '../utils/theme';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];

const MICRO_FIELDS = [
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitamin_d', label: 'Vitamin D', unit: 'mcg' },
  { key: 'vitamin_b12', label: 'Vitamin B12', unit: 'mcg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
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
        <TextInput style={[s.input, { flex: 1, marginRight: 8 }]} placeholder="Search foods..." placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} />
        <TouchableOpacity style={s.searchBtn} onPress={handleSearch} disabled={searching}>
          <Text style={s.searchBtnText}>{searching ? '...' : 'Search'}</Text>
        </TouchableOpacity>
      </View>
      {results.slice(0, 5).map((r) => (
        <TouchableOpacity key={r.code} style={s.resultRow} onPress={() => { setForm(fillForm(r)); setResults([]); Toast.show({ type: 'success', text1: 'Filled from Open Food Facts' }); }}>
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
      <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={s.btnText}>Add Food</Text>}
      </TouchableOpacity>
      <View style={{ height: 20 }} />
    </ModalSheet>
  );
};

const MealSection = ({ meal, items, onAdd, onScan, onDelete, onFavorite }) => {
  const [expanded, setExpanded] = useState(true);
  const mealItems = items.filter((i) => i.meal_type === meal);
  const mealCal = mealItems.reduce((s, i) => s + i.calories, 0);
  return (
    <View style={s.mealSection}>
      <TouchableOpacity style={s.mealHeader} onPress={() => setExpanded((e) => !e)}>
        <View style={s.mealHeaderLeft}>
          <Text style={{ fontSize: 24, marginRight: 10 }}>{getMealIcon(meal)}</Text>
          <View>
            <Text style={s.mealName}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
            <Text style={s.mealCal}>{Math.round(mealCal)} kcal</Text>
          </View>
        </View>
        <View style={s.mealActions}>
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
    </View>
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

  const loadData = useCallback(async () => {
    const cached = await getCachedDiaryDate(date);
    setItems(cached.logs || []);
    setSummary(cached.summary || createEmptySummary(date));
    try {
      const [logs, dailySummary] = await Promise.all([api.getFoodLogs(date), api.getDailySummary(date)]);
      setItems(logs); setSummary(dailySummary);
    } catch (err) { Toast.show({ type: 'error', text1: err.message || 'Failed to load diary' }); }
  }, [date]);

  useEffect(() => { loadData(); getFavorites().then(setFavorites); }, [loadData]);
  useRefreshRegistration(loadData);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

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
          <View style={s.summaryCard}>
            <View style={s.rowBetween}>
              <Text style={s.summaryText}>{Math.round(summary.calories_consumed)} / {Math.round(summary.calories_target)} kcal</Text>
              <Text style={[s.summaryText, { color: summary.calories_consumed > summary.calories_target ? colors.accentCoral : colors.accentLime }]}>
                {summary.calories_consumed > summary.calories_target ? 'Over' : `${Math.round(summary.calories_target - summary.calories_consumed)} left`}
              </Text>
            </View>
            <View style={s.progressBar}><View style={[s.progressFill, { width: `${Math.min((summary.calories_consumed / summary.calories_target) * 100, 100)}%` }]} /></View>
            <View style={s.macroRow}>
              {[{ label: 'Protein', value: summary.protein, color: '#4facfe' }, { label: 'Carbs', value: summary.carbs, color: colors.accentLime }, { label: 'Fat', value: summary.fat, color: colors.accentAmber }].map((m) => (
                <View key={m.label} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={[s.macroValue, { color: m.color }]}>{Math.round(m.value)}g</Text>
                  <Text style={s.macroLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {favorites.length > 0 && (
          <View style={s.card}>
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
          </View>
        )}

        {MEALS.map((meal) => (
          <MealSection key={meal} meal={meal} items={items} onAdd={setAddModal} onScan={setScanModal} onDelete={handleDelete} onFavorite={handleFavorite} />
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {MEALS.map((meal) => (
        <AddFoodModal key={meal} meal={meal} date={date} visible={addModal === meal} onClose={() => setAddModal(null)} onSave={loadData} />
      ))}
      {scanModal && <FoodScannerModal defaultMeal={scanModal} date={date} onClose={() => setScanModal(null)} onSuccess={loadData} />}
    </View>
  );
};

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingTop: 56, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  badge: { backgroundColor: 'rgba(200,241,53,0.12)', color: colors.accentLime, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, fontSize: 12, fontWeight: '700' },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border },
  dateBtn: { padding: 7, backgroundColor: colors.bgElevated, borderRadius: 8 },
  dateBtnDisabled: { opacity: 0.3 },
  dateBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  dateText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1, padding: spacing.md },
  summaryCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  summaryText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accentLime },
  macroRow: { flexDirection: 'row', marginTop: 4 },
  macroValue: { fontWeight: '700', fontSize: 14 },
  macroLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', marginTop: 2 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  favCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  logBtn: { backgroundColor: colors.accentLime, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  logBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 12 },
  mealSection: { backgroundColor: colors.bgCard, borderRadius: radius.xl, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
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
  searchRow: { flexDirection: 'row', marginBottom: 10 },
  searchBtn: { backgroundColor: colors.accentPurple, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 9, backgroundColor: colors.bgElevated, borderRadius: 8, marginBottom: 5 },
  resultName: { color: colors.textPrimary, fontSize: 13, flex: 1 },
  resultMeta: { color: colors.accentAmber, fontSize: 13, fontWeight: '600' },
  btn: { backgroundColor: colors.accentLime, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});

export default Diary;
