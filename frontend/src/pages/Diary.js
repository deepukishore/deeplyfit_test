import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useRefreshRegistration } from '../context/RefreshContext';
import { api } from '../utils/api';
import { addDays, formatDate, formatDisplayDate, getMealIcon } from '../utils/fitness';
import FoodScannerModal from '../components/FoodScannerModal';
import '../styles/dashboard.css';
import '../styles/scanner.css';
import '../styles/animations.css';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
const FAVORITES_KEY = 'deeply_fit_favorite_foods_v1';

const MICRO_FIELDS = [
  { key: 'fiber', label: 'Fiber', unit: 'g', accent: 'var(--accent-lime)' },
  { key: 'sugar', label: 'Sugar', unit: 'g', accent: 'var(--accent-coral)' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', accent: 'var(--accent-blue)' },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg', accent: 'var(--accent-lime)' },
  { key: 'vitamin_d', label: 'Vitamin D', unit: 'mcg', accent: 'var(--accent-amber)' },
  { key: 'vitamin_b12', label: 'Vitamin B12', unit: 'mcg', accent: 'var(--accent-purple)' },
  { key: 'iron', label: 'Iron', unit: 'mg', accent: 'var(--accent-coral)' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', accent: 'var(--accent-blue)' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', accent: 'var(--accent-amber)' },
];

const EMPTY_FOOD_FORM = {
  food_name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  sodium: '',
  vitamin_c: '',
  vitamin_d: '',
  vitamin_b12: '',
  iron: '',
  calcium: '',
  potassium: '',
  quantity: '1',
};

const PORTION_GUIDE = [
  { food: 'Chicken breast (1 serving)', size: 'Your palm', grams: '~85g', cal: '~130 kcal' },
  { food: 'Cooked rice (1 cup)', size: 'Tennis ball', grams: '~180g', cal: '~240 kcal' },
  { food: 'Peanut butter (1 tbsp)', size: 'Your thumb', grams: '~16g', cal: '~95 kcal' },
  { food: 'Pasta (1 serving)', size: 'Cupped hand', grams: '~75g dry', cal: '~270 kcal' },
  { food: 'Cheese (1 serving)', size: '2 dice', grams: '~30g', cal: '~110 kcal' },
  { food: 'Olive oil (1 tbsp)', size: 'Thumb tip', grams: '~14g', cal: '~120 kcal' },
  { food: 'Nuts (1 serving)', size: 'Golf ball', grams: '~30g', cal: '~170 kcal' },
  { food: 'Steak (1 serving)', size: 'Deck of cards', grams: '~85g', cal: '~180 kcal' },
  { food: 'Butter (1 tsp)', size: 'Fingertip', grams: '~5g', cal: '~35 kcal' },
  { food: 'Vegetables (1 cup)', size: 'Baseball', grams: '~90g', cal: '~25 kcal' },
];

const readFavorites = () => {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch (err) {
    return [];
  }
};

const writeFavorites = (favorites) => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

const favoriteIdFor = (item) => `${item.food_name.toLowerCase()}::${item.meal_type}`;

const toFavorite = (item) => ({
  id: favoriteIdFor(item),
  food_name: item.food_name,
  meal_type: item.meal_type,
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
});

const startOfWeek = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatDate(date);
};

const formatWeekLabel = (dateString) => {
  const start = new Date(dateString);
  const end = new Date(dateString);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const formatWeekday = (dateString) => new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const numberOrZero = (value) => Number(value || 0);

const sumNutrition = (items) => {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    micronutrients: Object.fromEntries(MICRO_FIELDS.map((field) => [field.key, 0])),
  };

  items.forEach((item) => {
    totals.calories += numberOrZero(item.calories);
    totals.protein += numberOrZero(item.protein);
    totals.carbs += numberOrZero(item.carbs);
    totals.fat += numberOrZero(item.fat);
    MICRO_FIELDS.forEach((field) => {
      totals.micronutrients[field.key] += numberOrZero(item[field.key]);
    });
  });

  return {
    calories: Number(totals.calories.toFixed(1)),
    protein: Number(totals.protein.toFixed(1)),
    carbs: Number(totals.carbs.toFixed(1)),
    fat: Number(totals.fat.toFixed(1)),
    micronutrients: Object.fromEntries(
      Object.entries(totals.micronutrients).map(([key, value]) => [key, Number(value.toFixed(1))])
    ),
  };
};

const fillFoodForm = (result) => ({
  food_name: result.name || '',
  calories: result.calories ? String(result.calories) : '',
  protein: result.protein ? String(result.protein) : '',
  carbs: result.carbs ? String(result.carbs) : '',
  fat: result.fat ? String(result.fat) : '',
  fiber: result.fiber ? String(result.fiber) : '',
  sugar: result.sugar ? String(result.sugar) : '',
  sodium: result.sodium ? String(result.sodium) : '',
  vitamin_c: result.vitamin_c ? String(result.vitamin_c) : '',
  vitamin_d: result.vitamin_d ? String(result.vitamin_d) : '',
  vitamin_b12: result.vitamin_b12 ? String(result.vitamin_b12) : '',
  iron: result.iron ? String(result.iron) : '',
  calcium: result.calcium ? String(result.calcium) : '',
  potassium: result.potassium ? String(result.potassium) : '',
  quantity: '1',
});

const buildLogPayload = (form, meal, date) => ({
  date,
  meal_type: meal,
  food_name: form.food_name,
  calories: parseFloat(form.calories) || 0,
  protein: parseFloat(form.protein) || 0,
  carbs: parseFloat(form.carbs) || 0,
  fat: parseFloat(form.fat) || 0,
  fiber: parseFloat(form.fiber) || 0,
  sugar: parseFloat(form.sugar) || 0,
  sodium: parseFloat(form.sodium) || 0,
  vitamin_c: parseFloat(form.vitamin_c) || 0,
  vitamin_d: parseFloat(form.vitamin_d) || 0,
  vitamin_b12: parseFloat(form.vitamin_b12) || 0,
  iron: parseFloat(form.iron) || 0,
  calcium: parseFloat(form.calcium) || 0,
  potassium: parseFloat(form.potassium) || 0,
  quantity: parseFloat(form.quantity) || 1,
});

const FoodSearchBox = ({ onSelect, compact = false }) => {
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const selectedQuantity = Math.max(parseFloat(quantity) || 1, 0.1);

  const handleSearch = async () => {
    const cleaned = query.trim();
    if (cleaned.length < 2) {
      toast.error('Search for at least 2 characters');
      return;
    }

    setSearching(true);
    setSearched(true);
    try {
      const data = await api.searchFoods(cleaned);
      setResults(data.results || []);
    } catch (err) {
      setResults([]);
      toast.error(err.message || 'Food search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="food-search-panel">
      <div className="food-search-head">
        <div>
          <p className="food-search-title">Search 500,000+ foods</p>
          <p className="food-search-copy">Choose a quantity, then tap a result to log it instantly.</p>
        </div>
        {!compact && <span className="badge badge-blue">No camera needed</span>}
      </div>
      <div className="food-search-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try: yogurt, oats, chicken breast" />
        <input
          type="number"
          value={quantity}
          min="0.1"
          step="0.5"
          onChange={(event) => setQuantity(event.target.value)}
          aria-label="Quantity"
          title="Quantity"
          placeholder="Qty"
          style={{ maxWidth: 92 }}
        />
        <button className="btn btn-secondary btn-sm" onClick={handleSearch} disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>
      {results.length > 0 && (
        <div className="food-search-results">
          {results.slice(0, compact ? 4 : 6).map((result) => (
            <button key={`${result.code}-${result.name}`} className="food-search-result" onClick={() => onSelect(result, selectedQuantity)}>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p className="food-search-result-name">{result.name}</p>
                <p className="food-search-result-meta">{result.brand || 'Open Food Facts'} · {result.nutrition_basis}</p>
              </div>
              <span className="badge badge-amber">{Math.round((result.calories || 0) * selectedQuantity)} kcal</span>
            </button>
          ))}
        </div>
      )}
      {searched && !searching && results.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No close matches found. You can still enter nutrition manually.</p>
      )}
    </div>
  );
};

const MicronutrientInputs = ({ form, setForm }) => (
  <div className="micro-input-grid">
    {MICRO_FIELDS.map((field) => (
      <div key={field.key} className="input-group">
        <label>{field.label} ({field.unit})</label>
        <input
          type="number"
          placeholder="0"
          value={form[field.key]}
          onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
        />
      </div>
    ))}
  </div>
);

const PortionGuideModal = ({ onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-sheet" onClick={(event) => event.stopPropagation()} style={{ maxHeight: '85vh' }}>
      <div className="modal-handle" />
      <h3 className="modal-title">Portion Visual Guide</h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>No scale nearby? Use everyday objects to estimate portions fast.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {PORTION_GUIDE.map((entry) => (
          <div key={entry.food} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{entry.food}</p>
              <p style={{ fontSize: 13, color: 'var(--accent-lime)' }}>{entry.size}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.grams}</p>
              <p style={{ fontSize: 12, color: 'var(--accent-amber)', fontWeight: 600 }}>{entry.cal}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const QuickAddModal = ({ meal, date, onClose, onSave }) => {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);

  const parseInput = (value) => {
    const calorieMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:cal|kcal|calories?)/i);
    const calories = calorieMatch ? parseFloat(calorieMatch[1]) : null;
    const name = value.replace(/(\d+(?:\.\d+)?)\s*(?:cal|kcal|calories?)/i, '').replace(/,|roughly|about|around|~|approx/gi, '').trim() || 'Quick add';
    return calories ? { food_name: name.charAt(0).toUpperCase() + name.slice(1), calories } : null;
  };

  const handleSave = async () => {
    if (!parsed) {
      toast.error('Include a calorie amount, for example "burger 600 cal"');
      return;
    }

    setLoading(true);
    try {
      await api.logFood({ date, meal_type: meal, food_name: parsed.food_name, calories: parsed.calories, protein: 0, carbs: 0, fat: 0, quantity: 1 });
      toast.success(navigator.onLine ? 'Quick-logged' : 'Saved offline and queued');
      await onSave();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not log that item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">Quick Add Calories</h3>
        <div className="modal-form">
          <div className="input-group">
            <label>Describe what you ate</label>
            <input
              placeholder='Example: "Had a burger, roughly 600 cal"'
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setParsed(parseInput(event.target.value));
              }}
              autoFocus
            />
          </div>
          {parsed && (
            <div style={{ background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.2)', borderRadius: 'var(--radius-lg)', padding: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Detected</p>
              <div className="stat-row">
                <span className="stat-label">{parsed.food_name}</span>
                <span className="stat-value" style={{ color: 'var(--accent-lime)' }}>{parsed.calories} kcal</span>
              </div>
            </div>
          )}
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading || !parsed}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Log It'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SaveTemplateModal = ({ meal, items, onClose, onSaved }) => {
  const [name, setName] = useState(`My ${meal}`);
  const [loading, setLoading] = useState(false);
  const totals = useMemo(() => sumNutrition(items), [items]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Give this template a name');
      return;
    }

    setLoading(true);
    try {
      await api.createMealTemplate({
        name: name.trim(),
        meal_type: meal,
        template_type: 'meal',
        servings: 1,
        foods: items.map((item) => ({
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
      toast.success('Meal template saved');
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">Save Meal Template</h3>
        <div className="modal-form">
          <div className="input-group">
            <label>Template Name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="My usual breakfast" />
          </div>
          <div className="planner-hero">
            <p className="planner-eyebrow">Summary</p>
            <h4>{items.length} ingredients</h4>
            <p>{Math.round(totals.calories)} kcal · P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fat)}g</p>
          </div>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AddFoodModal = ({ meal, date, onClose, onSave }) => {
  const [form, setForm] = useState(EMPTY_FOOD_FORM);
  const [loading, setLoading] = useState(false);
  const [showMicros, setShowMicros] = useState(false);

  const handleSearchLog = async (result, quantity) => {
    const searchedForm = {
      ...fillFoodForm(result),
      quantity: String(quantity),
    };

    setForm(searchedForm);
    setShowMicros(true);
    setLoading(true);
    try {
      await api.logFood(buildLogPayload(searchedForm, meal, date));
      toast.success(navigator.onLine ? `${result.name} logged` : 'Saved offline and queued');
      await onSave();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save food');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.food_name || !form.calories) {
      toast.error('Food name and calories are required');
      return;
    }

    setLoading(true);
    try {
      await api.logFood(buildLogPayload(form, meal, date));
      toast.success(navigator.onLine ? 'Food logged' : 'Saved offline and queued');
      await onSave();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save food');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">{getMealIcon(meal)} Add to {meal.charAt(0).toUpperCase() + meal.slice(1)}</h3>
        <div className="modal-form">
          <FoodSearchBox onSelect={handleSearchLog} />
          <div className="input-group">
            <label>Food Name</label>
            <input value={form.food_name} onChange={(event) => setForm((current) => ({ ...current, food_name: event.target.value }))} placeholder="Example: Greek yogurt" autoFocus />
          </div>
          <div className="planner-grid">
            <div className="input-group">
              <label>Calories</label>
              <input type="number" value={form.calories} onChange={(event) => setForm((current) => ({ ...current, calories: event.target.value }))} placeholder="0" />
            </div>
            <div className="input-group">
              <label>Multiplier</label>
              <input type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="1" step="0.5" min="0.5" />
            </div>
          </div>
          <div className="planner-grid">
            <div className="input-group"><label>Protein (g)</label><input type="number" value={form.protein} onChange={(event) => setForm((current) => ({ ...current, protein: event.target.value }))} placeholder="0" /></div>
            <div className="input-group"><label>Carbs (g)</label><input type="number" value={form.carbs} onChange={(event) => setForm((current) => ({ ...current, carbs: event.target.value }))} placeholder="0" /></div>
          </div>
          <div className="planner-grid">
            <div className="input-group"><label>Fat (g)</label><input type="number" value={form.fat} onChange={(event) => setForm((current) => ({ ...current, fat: event.target.value }))} placeholder="0" /></div>
            <div className="input-group"><label>Fiber (g)</label><input type="number" value={form.fiber} onChange={(event) => setForm((current) => ({ ...current, fiber: event.target.value }))} placeholder="0" /></div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowMicros((current) => !current)}>
            {showMicros ? 'Hide micronutrients' : 'Add micronutrients'}
          </button>
          {showMicros && <MicronutrientInputs form={form} setForm={setForm} />}
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Add Food'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RecipeBuilderModal = ({ onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState('dinner');
  const [servings, setServings] = useState('1');
  const [ingredientForm, setIngredientForm] = useState(EMPTY_FOOD_FORM);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const totals = useMemo(() => sumNutrition(ingredients), [ingredients]);

  const addIngredient = () => {
    if (!ingredientForm.food_name || !ingredientForm.calories) {
      toast.error('Add at least a name and calories for each ingredient');
      return;
    }

    const item = {
      ...buildLogPayload(ingredientForm, mealType, formatDate(new Date())),
      id: `${ingredientForm.food_name}-${Date.now()}`,
    };
    setIngredients((current) => [...current, item]);
    setIngredientForm(EMPTY_FOOD_FORM);
  };

  const saveRecipe = async () => {
    if (!name.trim() || ingredients.length === 0) {
      toast.error('Name your recipe and add at least one ingredient');
      return;
    }

    setLoading(true);
    try {
      await api.createMealTemplate({
        name: name.trim(),
        meal_type: mealType,
        template_type: 'recipe',
        servings: parseFloat(servings) || 1,
        foods: ingredients.map((ingredient) => ({
          food_name: ingredient.food_name,
          calories: ingredient.calories,
          protein: ingredient.protein,
          carbs: ingredient.carbs,
          fat: ingredient.fat,
          fiber: ingredient.fiber,
          sugar: ingredient.sugar,
          sodium: ingredient.sodium,
          vitamin_c: ingredient.vitamin_c,
          vitamin_d: ingredient.vitamin_d,
          vitamin_b12: ingredient.vitamin_b12,
          iron: ingredient.iron,
          calcium: ingredient.calcium,
          potassium: ingredient.potassium,
          quantity: ingredient.quantity,
        })),
      });
      toast.success('Recipe saved as a template');
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet planner-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">Recipe Builder</h3>
        <div className="modal-form">
          <div className="planner-grid">
            <div className="input-group">
              <label>Recipe Name</label>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Turkey chili" />
            </div>
            <div className="input-group">
              <label>Meal Type</label>
              <select value={mealType} onChange={(event) => setMealType(event.target.value)}>
                {MEALS.map((meal) => <option key={meal} value={meal}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Recipe Servings</label>
            <input type="number" value={servings} onChange={(event) => setServings(event.target.value)} min="1" step="1" />
          </div>

          <FoodSearchBox onSelect={(result, quantity) => {
            setIngredientForm({ ...fillFoodForm(result), quantity: String(quantity) });
            toast.success('Ingredient filled from search');
          }} compact />

          <div className="planner-grid">
            <div className="input-group">
              <label>Ingredient</label>
              <input value={ingredientForm.food_name} onChange={(event) => setIngredientForm((current) => ({ ...current, food_name: event.target.value }))} placeholder="Black beans" />
            </div>
            <div className="input-group">
              <label>Qty</label>
              <input type="number" value={ingredientForm.quantity} onChange={(event) => setIngredientForm((current) => ({ ...current, quantity: event.target.value }))} placeholder="1" />
            </div>
          </div>
          <div className="planner-grid">
            <div className="input-group"><label>Calories</label><input type="number" value={ingredientForm.calories} onChange={(event) => setIngredientForm((current) => ({ ...current, calories: event.target.value }))} placeholder="0" /></div>
            <div className="input-group"><label>Protein</label><input type="number" value={ingredientForm.protein} onChange={(event) => setIngredientForm((current) => ({ ...current, protein: event.target.value }))} placeholder="0" /></div>
          </div>
          <div className="planner-grid">
            <div className="input-group"><label>Carbs</label><input type="number" value={ingredientForm.carbs} onChange={(event) => setIngredientForm((current) => ({ ...current, carbs: event.target.value }))} placeholder="0" /></div>
            <div className="input-group"><label>Fat</label><input type="number" value={ingredientForm.fat} onChange={(event) => setIngredientForm((current) => ({ ...current, fat: event.target.value }))} placeholder="0" /></div>
          </div>
          <div className="planner-grid">
            <div className="input-group"><label>Fiber</label><input type="number" value={ingredientForm.fiber} onChange={(event) => setIngredientForm((current) => ({ ...current, fiber: event.target.value }))} placeholder="0" /></div>
            <div className="input-group"><label>Sodium</label><input type="number" value={ingredientForm.sodium} onChange={(event) => setIngredientForm((current) => ({ ...current, sodium: event.target.value }))} placeholder="0" /></div>
          </div>
          <button className="btn btn-secondary btn-full" onClick={addIngredient}>Add Ingredient</button>

          <div className="planner-hero">
            <p className="planner-eyebrow">Recipe total</p>
            <h4>{Math.round(totals.calories)} kcal</h4>
            <p>P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fat)}g · Fiber {Math.round(totals.micronutrients.fiber)}g</p>
          </div>

          <div className="planner-exercises">
            {ingredients.map((ingredient) => (
              <div key={ingredient.id} className="planner-exercise-card">
                <div className="planner-exercise-head">
                  <div>
                    <h5>{ingredient.food_name}</h5>
                    <p>{Math.round(ingredient.calories)} kcal · qty {ingredient.quantity}</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setIngredients((current) => current.filter((entry) => entry.id !== ingredient.id))}>Remove</button>
                </div>
              </div>
            ))}
            {ingredients.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Add ingredients one by one to build the recipe.</p>}
          </div>

          <button className="btn btn-primary btn-full" onClick={saveRecipe} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Save Recipe Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CopyMealsModal = ({ targetDate, onClose, onCopied }) => {
  const [sourceDate, setSourceDate] = useState(addDays(targetDate, -1));
  const [recentDays, setRecentDays] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [copying, setCopying] = useState(false);

  const loadRecentDays = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const previousDates = Array.from({ length: 7 }, (_, index) => addDays(targetDate, -(index + 1)));
      const summaries = await Promise.all(previousDates.map((day) => api.getDailySummary(day).catch(() => null)));
      setRecentDays(
        summaries.filter((summary) => summary?.food_logs?.length).map((summary) => ({
          date: summary.date,
          count: summary.food_logs.length,
          calories: summary.calories_consumed,
        }))
      );
    } finally {
      setLoadingRecent(false);
    }
  }, [targetDate]);

  useEffect(() => {
    loadRecentDays();
  }, [loadRecentDays]);

  const handleCopy = async () => {
    setCopying(true);
    try {
      const result = await api.copyMealsFromDay({ source_date: sourceDate, target_date: targetDate });
      toast.success(navigator.onLine ? `Copied ${result.count || 0} food items` : 'Copy queued for sync');
      await onCopied();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not copy meals');
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">Copy Meals From Another Day</h3>
        <div className="modal-form">
          <div className="input-group">
            <label>Source Date</label>
            <input type="date" value={sourceDate} onChange={(event) => setSourceDate(event.target.value)} max={targetDate} />
          </div>
          <div className="copy-day-panel">
            <div className="section-header" style={{ marginBottom: 10 }}>
              <h4 className="section-title" style={{ fontSize: 15 }}>Recent logged days</h4>
              <button className="btn btn-ghost btn-sm" onClick={loadRecentDays}>Refresh</button>
            </div>
            {loadingRecent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: 54, borderRadius: 16 }} />)}
              </div>
            ) : recentDays.length > 0 ? (
              <div className="copy-day-list">
                {recentDays.map((entry) => (
                  <button key={entry.date} className={`copy-day-row ${sourceDate === entry.date ? 'active' : ''}`} onClick={() => setSourceDate(entry.date)}>
                    <div style={{ textAlign: 'left' }}>
                      <p className="copy-day-row-title">{formatDisplayDate(entry.date)}</p>
                      <p className="copy-day-row-meta">{entry.count} foods · {Math.round(entry.calories)} kcal</p>
                    </div>
                    <span className="badge badge-lime">{entry.date}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No recent logged days yet.</p>
            )}
          </div>
          <button className="btn btn-primary btn-full" onClick={handleCopy} disabled={copying}>
            {copying ? <><span className="spinner" /> Copying...</> : 'Copy Meals'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MealPlanEntryModal = ({ templates, weekStart, onClose, onSaved }) => {
  const [form, setForm] = useState({
    template_id: templates[0]?.id || '',
    planned_date: weekStart,
    meal_type: templates[0]?.meal_type || 'dinner',
    servings: '1',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const selectedTemplate = templates.find((template) => template.id === Number(form.template_id));

  const handleSave = async () => {
    if (!form.template_id) {
      toast.error('Pick a meal or recipe template');
      return;
    }

    setSaving(true);
    try {
      await api.createMealPlanEntry({
        template_id: Number(form.template_id),
        planned_date: form.planned_date,
        meal_type: form.meal_type,
        servings: parseFloat(form.servings) || 1,
        notes: form.notes || null,
      });
      toast.success('Meal added to your week');
      await onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save meal plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">Plan Meals For The Week</h3>
        <div className="modal-form">
          <div className="input-group">
            <label>Template or Recipe</label>
            <select
              value={form.template_id}
              onChange={(event) => {
                const template = templates.find((entry) => entry.id === Number(event.target.value));
                setForm((current) => ({
                  ...current,
                  template_id: event.target.value,
                  meal_type: template?.meal_type || current.meal_type,
                }));
              }}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.name} ({template.template_type || 'meal'})</option>
              ))}
            </select>
          </div>
          <div className="planner-grid">
            <div className="input-group"><label>Planned Date</label><input type="date" value={form.planned_date} onChange={(event) => setForm((current) => ({ ...current, planned_date: event.target.value }))} /></div>
            <div className="input-group"><label>Meal Type</label><select value={form.meal_type} onChange={(event) => setForm((current) => ({ ...current, meal_type: event.target.value }))}>{MEALS.map((meal) => <option key={meal} value={meal}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</option>)}</select></div>
          </div>
          <div className="planner-grid">
            <div className="input-group"><label>Servings</label><input type="number" value={form.servings} onChange={(event) => setForm((current) => ({ ...current, servings: event.target.value }))} min="0.5" step="0.5" /></div>
            <div className="input-group"><label>Notes</label><input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Prep Sunday night" /></div>
          </div>
          {selectedTemplate && (
            <div className="planner-hero">
              <p className="planner-eyebrow">Selected</p>
              <h4>{selectedTemplate.name}</h4>
              <p>{selectedTemplate.template_type || 'meal'} · {selectedTemplate.foods.length} ingredients</p>
            </div>
          )}
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Saving...</> : 'Add To Week'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SwipeableFoodItem = ({ item, onDelete, onFavorite }) => {
  const startRef = useRef(null);
  const modeRef = useRef('idle');
  const [offset, setOffset] = useState(0);

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
    modeRef.current = 'pending';
  };

  const handleTouchMove = (event) => {
    if (!startRef.current) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - startRef.current.x;
    const deltaY = touch.clientY - startRef.current.y;
    if (modeRef.current === 'pending') {
      modeRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }
    if (modeRef.current !== 'horizontal') return;
    event.preventDefault();
    setOffset(Math.max(-92, Math.min(92, deltaX)));
  };

  const handleTouchEnd = () => {
    if (offset <= -64) onDelete(item.id);
    if (offset >= 64) onFavorite(item);
    setOffset(0);
    startRef.current = null;
    modeRef.current = 'idle';
  };

  return (
    <div className="food-item-swipe-shell" data-swipe-lock="true">
      <div className="food-item-swipe-actions">
        <span className="food-item-action favorite">Favorite</span>
        <span className="food-item-action delete">Delete</span>
      </div>
      <div className="food-item" style={{ transform: `translateX(${offset}px)` }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
        <div style={{ flex: 1 }}>
          <p className="food-item-name">{item.food_name}</p>
          <p className="food-item-macros">P: {Math.round(item.protein)}g · C: {Math.round(item.carbs)}g · F: {Math.round(item.fat)}g · Fiber: {Math.round(item.fiber || 0)}g</p>
        </div>
        <span className="food-item-cal">{Math.round(item.calories)}</span>
        <button className="food-item-delete" onClick={() => onDelete(item.id)} title="Delete">x</button>
      </div>
    </div>
  );
};

const MealSection = ({ meal, items, onAdd, onScan, onDelete, onFavorite, onSaveTemplate, onQuickAdd }) => {
  const [expanded, setExpanded] = useState(true);
  const mealItems = items.filter((item) => item.meal_type === meal);
  const mealCalories = mealItems.reduce((sum, item) => sum + item.calories, 0);

  return (
    <div className="meal-section animate-slide-up">
      <div className="meal-header" onClick={() => setExpanded((current) => !current)}>
        <div className="meal-header-left">
          <span className="meal-icon">{getMealIcon(meal)}</span>
          <div>
            <p className="meal-name">{meal.charAt(0).toUpperCase() + meal.slice(1)}</p>
            <p className="meal-calories">{Math.round(mealCalories)} kcal</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {mealItems.length > 0 && <button className="btn btn-ghost btn-sm" onClick={(event) => { event.stopPropagation(); onSaveTemplate(meal, mealItems); }}>Save</button>}
          <button className="btn btn-ghost btn-sm" onClick={(event) => { event.stopPropagation(); onScan(meal); }}>Scan</button>
          <button className="btn btn-ghost btn-sm" onClick={(event) => { event.stopPropagation(); onQuickAdd(meal); }}>Quick</button>
          <button className="meal-add-btn tap-feedback" onClick={(event) => { event.stopPropagation(); onAdd(meal); }}>+</button>
        </div>
      </div>
      {expanded && (
        <div className="meal-items">
          {mealItems.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>Nothing logged yet. Tap + to add food.</p>
          ) : (
            mealItems.map((item) => <SwipeableFoodItem key={item.id} item={item} onDelete={onDelete} onFavorite={onFavorite} />)
          )}
        </div>
      )}
    </div>
  );
};

const Diary = () => {
  const [date, setDate] = useState(formatDate(new Date()));
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(null);
  const [scanModal, setScanModal] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateDraft, setTemplateDraft] = useState(null);
  const [showPortionGuide, setShowPortionGuide] = useState(false);
  const [quickAddModal, setQuickAddModal] = useState(null);
  const [favorites, setFavorites] = useState(() => readFavorites());
  const [showCopyMeals, setShowCopyMeals] = useState(false);
  const [showRecipeBuilder, setShowRecipeBuilder] = useState(false);
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(formatDate(new Date())));
  const [mealPlan, setMealPlan] = useState(null);
  const [mealPlanLoading, setMealPlanLoading] = useState(true);
  const swipeStartRef = useRef(null);
  const swipeModeRef = useRef('idle');

  const templateCards = useMemo(() => templates.filter((template) => (template.template_type || 'meal') === 'meal'), [templates]);
  const recipeCards = useMemo(() => templates.filter((template) => (template.template_type || 'meal') === 'recipe'), [templates]);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplates(await api.getMealTemplates());
    } catch (err) {
      setTemplates([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logs, dailySummary] = await Promise.all([api.getFoodLogs(date), api.getDailySummary(date)]);
      setItems(logs);
      setSummary(dailySummary);
    } catch (err) {
      toast.error(err.message || 'Failed to load diary');
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadMealPlan = useCallback(async () => {
    setMealPlanLoading(true);
    try {
      setMealPlan(await api.getWeeklyMealPlan(weekStart));
    } catch (err) {
      setMealPlan({ entries: [], totals: sumNutrition([]), shopping_list: [], start_date: weekStart, end_date: addDays(weekStart, 6) });
    } finally {
      setMealPlanLoading(false);
    }
  }, [weekStart]);

  const refreshDiary = useCallback(async () => {
    await Promise.all([loadData(), loadTemplates(), loadMealPlan()]);
  }, [loadData, loadMealPlan, loadTemplates]);

  useRefreshRegistration(refreshDiary);

  useEffect(() => {
    refreshDiary();
    setFavorites(readFavorites());
  }, [refreshDiary]);

  useEffect(() => {
    const handleSync = (event) => {
      if ((event.detail?.dates || []).includes(date)) {
        loadData();
      }
    };
    window.addEventListener('deeplyfit:diary-sync-complete', handleSync);
    return () => window.removeEventListener('deeplyfit:diary-sync-complete', handleSync);
  }, [date, loadData]);

  const navigateDate = (direction) => {
    const nextDate = addDays(date, direction);
    if (nextDate > formatDate(new Date())) return;
    setDate(nextDate);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteFoodLog(id);
      toast.success(navigator.onLine ? 'Removed' : 'Removed offline and queued');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleApplyTemplate = async (template) => {
    try {
      await api.applyMealTemplate(template.id, { date });
      toast.success(navigator.onLine ? `${template.name} logged` : 'Template queued for sync');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to apply template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await api.deleteMealTemplate(templateId);
      toast.success('Template removed');
      await Promise.all([loadTemplates(), loadMealPlan()]);
    } catch (err) {
      toast.error(err.message || 'Failed to delete template');
    }
  };

  const handleFavorite = (item) => {
    const favorite = toFavorite(item);
    if (favorites.some((entry) => entry.id === favorite.id)) {
      toast('Already in favorites');
      return;
    }
    const nextFavorites = [favorite, ...favorites];
    setFavorites(nextFavorites);
    writeFavorites(nextFavorites);
    toast.success('Saved to favorites');
  };

  const handleLogFavorite = async (favorite) => {
    try {
      await api.logFood({
        date,
        meal_type: favorite.meal_type,
        food_name: favorite.food_name,
        calories: favorite.calories,
        protein: favorite.protein,
        carbs: favorite.carbs,
        fat: favorite.fat,
        fiber: favorite.fiber,
        sugar: favorite.sugar,
        sodium: favorite.sodium,
        vitamin_c: favorite.vitamin_c,
        vitamin_d: favorite.vitamin_d,
        vitamin_b12: favorite.vitamin_b12,
        iron: favorite.iron,
        calcium: favorite.calcium,
        potassium: favorite.potassium,
        quantity: 1,
      });
      toast.success(navigator.onLine ? `${favorite.food_name} logged` : 'Favorite saved offline and queued');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Could not log favorite');
    }
  };

  const handlePageTouchStart = (event) => {
    if (event.target.closest('.modal-overlay') || event.target.closest('[data-swipe-lock="true"]')) {
      swipeModeRef.current = 'blocked';
      return;
    }
    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeModeRef.current = 'pending';
  };

  const handlePageTouchMove = (event) => {
    if (!swipeStartRef.current || swipeModeRef.current === 'blocked') return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    if (swipeModeRef.current === 'pending') {
      swipeModeRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }
  };

  const handlePageTouchEnd = (event) => {
    if (!swipeStartRef.current || swipeModeRef.current !== 'horizontal') {
      swipeStartRef.current = null;
      swipeModeRef.current = 'idle';
      return;
    }
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    if (deltaX <= -72) navigateDate(1);
    if (deltaX >= 72) navigateDate(-1);
    swipeStartRef.current = null;
    swipeModeRef.current = 'idle';
  };

  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);

  return (
    <div className="page-content" onTouchStart={handlePageTouchStart} onTouchMove={handlePageTouchMove} onTouchEnd={handlePageTouchEnd} onTouchCancel={handlePageTouchEnd}>
      <div className="page-header">
        <div className="page-header-inner">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Food Diary</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPortionGuide(true)}>Guide</button>
            <span className="badge badge-lime">{Math.round(totalCalories)} kcal</span>
          </div>
        </div>
      </div>

      <div className="diary-date-nav">
        <button className="date-nav-btn" onClick={() => navigateDate(-1)}>{'<'}</button>
        <div className="date-display">{formatDisplayDate(date)}</div>
        <button className="date-nav-btn" onClick={() => navigateDate(1)} disabled={date >= formatDate(new Date())}>{'>'}</button>
      </div>

      <div className="diary-action-row">
        <button className="btn btn-secondary btn-sm" onClick={() => setShowCopyMeals(true)}>Copy meals</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowRecipeBuilder(true)}>Build recipe</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowMealPlanner(true)}>Plan week</button>
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        <p className="diary-action-copy">Swipe foods right to favorite, left to delete. Swipe the page sideways to change dates.</p>
      </div>

      {summary && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{Math.round(summary.calories_consumed)} / {Math.round(summary.calories_target)} kcal</span>
              <span style={{ fontSize: 13, color: summary.calories_consumed > summary.calories_target ? 'var(--accent-coral)' : 'var(--accent-lime)', fontWeight: 600 }}>
                {summary.calories_consumed > summary.calories_target ? 'Over' : `${Math.round(summary.calories_target - summary.calories_consumed)} left`}
              </span>
            </div>
            <div className="progress-bar">
              <div className={`progress-bar-fill ${summary.calories_consumed >= summary.calories_target ? 'danger' : 'success'}`} style={{ width: `${Math.min((summary.calories_consumed / summary.calories_target) * 100, 100)}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
              {[{ label: 'Protein', value: summary.protein, color: 'var(--accent-blue)' }, { label: 'Carbs', value: summary.carbs, color: 'var(--accent-lime)' }, { label: 'Fat', value: summary.fat, color: 'var(--accent-amber)' }].map((macro) => (
                <div key={macro.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: macro.color, fontFamily: 'var(--font-display)' }}>{Math.round(macro.value)}g</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{macro.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {summary?.micronutrients && (
        <div style={{ padding: '0 16px 16px' }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 className="section-title">Micronutrients</h2>
            <span className="badge badge-blue">Daily % RDA</span>
          </div>
          <div className="micro-card-grid">
            {MICRO_FIELDS.map((field) => {
              const total = summary.micronutrients[field.key] || 0;
              const percent = summary.micronutrients.percent_of_rda?.[field.key] || 0;
              return (
                <div key={field.key} className="micro-card">
                  <div className="micro-card-top">
                    <p className="micro-card-label">{field.label}</p>
                    <span className="badge badge-lime">{Math.round(percent)}%</span>
                  </div>
                  <div className="micro-card-value" style={{ color: field.accent }}>{Math.round(total)}{field.unit}</div>
                  <div className="progress-bar" style={{ marginTop: 10 }}>
                    <div className="progress-bar-fill success" style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {favorites.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 className="section-title">Favorite Foods</h2>
            <span className="badge badge-blue">{favorites.length} saved</span>
          </div>
          <div className="favorite-grid">
            {favorites.map((favorite) => (
              <div key={favorite.id} className="template-card favorite-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div>
                    <h3 className="template-card-title">{favorite.food_name}</h3>
                    <p className="template-card-meta">{favorite.meal_type} · {Math.round(favorite.calories)} kcal</p>
                  </div>
                  <span className="badge badge-lime">Favorite</span>
                </div>
                <p className="template-card-meta" style={{ marginBottom: 12 }}>P {Math.round(favorite.protein)}g · C {Math.round(favorite.carbs)}g · F {Math.round(favorite.fat)}g · Fiber {Math.round(favorite.fiber || 0)}g</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleLogFavorite(favorite)}>Log Again</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const nextFavorites = favorites.filter((entry) => entry.id !== favorite.id);
                    setFavorites(nextFavorites);
                    writeFavorites(nextFavorites);
                  }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(templateCards.length > 0 || recipeCards.length > 0) && (
        <div style={{ padding: '0 16px 16px' }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 className="section-title">Recipes & Templates</h2>
            <span className="badge badge-lime">{templates.length} saved</span>
          </div>
          <div className="template-grid">
            {[...recipeCards, ...templateCards].map((template) => {
              const totals = sumNutrition(template.foods || []);
              return (
                <div key={template.id} className="template-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div>
                      <h3 className="template-card-title">{template.name}</h3>
                      <p className="template-card-meta">{template.meal_type} · {(template.template_type || 'meal') === 'recipe' ? `Recipe · ${template.servings || 1} servings` : `${template.foods.length} items`}</p>
                    </div>
                    <span className="badge badge-amber">{Math.round(totals.calories)} kcal</span>
                  </div>
                  <p className="template-card-meta" style={{ marginBottom: 12 }}>{template.foods.map((food) => food.food_name).slice(0, 3).join(', ')}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleApplyTemplate(template)}>{(template.template_type || 'meal') === 'recipe' ? 'Log Recipe' : 'Log Again'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteTemplate(template.id)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px 16px' }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <h2 className="section-title">Meal Prep Planner</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>Prev</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next</button>
          </div>
        </div>
        <div className="planner-hero" style={{ marginBottom: 12 }}>
          <p className="planner-eyebrow">Week of</p>
          <h4>{formatWeekLabel(weekStart)}</h4>
          <p>{mealPlan?.entries?.length || 0} planned meals · {Math.round(mealPlan?.totals?.calories || 0)} kcal total · P {Math.round(mealPlan?.totals?.protein || 0)}g</p>
        </div>
        {mealPlanLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map((item) => <div key={item} className="skeleton" style={{ height: 76, borderRadius: 20 }} />)}
          </div>
        ) : (
          <>
            <div className="template-grid" style={{ marginBottom: 12 }}>
              {(mealPlan?.entries || []).map((entry) => (
                <div key={entry.id} className="template-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <div>
                      <h3 className="template-card-title">{entry.template_name}</h3>
                      <p className="template-card-meta">{formatWeekday(entry.planned_date)} · {entry.meal_type} · {entry.servings} servings</p>
                    </div>
                    <span className="badge badge-blue">{Math.round(entry.nutrition.calories)} kcal</span>
                  </div>
                  {entry.notes && <p className="template-card-meta" style={{ marginBottom: 10 }}>{entry.notes}</p>}
                  <button className="btn btn-ghost btn-sm" onClick={async () => { await api.deleteMealPlanEntry(entry.id); await loadMealPlan(); }}>Remove</button>
                </div>
              ))}
              {(mealPlan?.entries || []).length === 0 && (
                <div className="template-card">
                  <h3 className="template-card-title">No meals planned yet</h3>
                  <p className="template-card-meta">Add your saved meals and recipes to build a week of prep, weekly macros, and a shopping list.</p>
                </div>
              )}
            </div>
            <div className="planner-grid">
              <div className="template-card">
                <h3 className="template-card-title">Weekly macro totals</h3>
                <div className="stat-row"><span className="stat-label">Calories</span><span className="stat-value">{Math.round(mealPlan?.totals?.calories || 0)} kcal</span></div>
                <div className="stat-row"><span className="stat-label">Protein</span><span className="stat-value">{Math.round(mealPlan?.totals?.protein || 0)}g</span></div>
                <div className="stat-row"><span className="stat-label">Carbs</span><span className="stat-value">{Math.round(mealPlan?.totals?.carbs || 0)}g</span></div>
                <div className="stat-row"><span className="stat-label">Fat</span><span className="stat-value">{Math.round(mealPlan?.totals?.fat || 0)}g</span></div>
              </div>
              <div className="template-card">
                <h3 className="template-card-title">Shopping list</h3>
                {(mealPlan?.shopping_list || []).slice(0, 8).map((item) => (
                  <div key={item.food_name} className="stat-row">
                    <span className="stat-label">{item.food_name}</span>
                    <span className="stat-value">{item.quantity} {item.unit_hint || 'servings'}</span>
                  </div>
                ))}
                {(mealPlan?.shopping_list || []).length === 0 && <p className="template-card-meta">Plan meals to generate a shopping list automatically.</p>}
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton" style={{ height: 88, borderRadius: 24 }} />)}
          </div>
        ) : (
          MEALS.map((meal) => (
            <MealSection
              key={meal}
              meal={meal}
              items={items}
              onAdd={setAddModal}
              onScan={setScanModal}
              onDelete={handleDelete}
              onFavorite={handleFavorite}
              onSaveTemplate={(mealName, mealItems) => setTemplateDraft({ meal: mealName, items: mealItems })}
              onQuickAdd={setQuickAddModal}
            />
          ))
        )}
      </div>

      <div style={{ margin: '16px 16px 0', padding: '14px 16px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 'var(--radius-md)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Search foods, save recipes, plan your week, and keep an eye on fiber, sodium, vitamins, and minerals alongside macros.</p>
      </div>

      {addModal && <AddFoodModal meal={addModal} date={date} onClose={() => setAddModal(null)} onSave={loadData} />}
      {scanModal && <FoodScannerModal defaultMeal={scanModal} date={date} onClose={() => setScanModal(null)} onSuccess={loadData} />}
      {templateDraft && <SaveTemplateModal meal={templateDraft.meal} items={templateDraft.items} onClose={() => setTemplateDraft(null)} onSaved={loadTemplates} />}
      {showPortionGuide && <PortionGuideModal onClose={() => setShowPortionGuide(false)} />}
      {quickAddModal && <QuickAddModal meal={quickAddModal} date={date} onClose={() => setQuickAddModal(null)} onSave={loadData} />}
      {showCopyMeals && <CopyMealsModal targetDate={date} onClose={() => setShowCopyMeals(false)} onCopied={loadData} />}
      {showRecipeBuilder && <RecipeBuilderModal onClose={() => setShowRecipeBuilder(false)} onSaved={async () => { await Promise.all([loadTemplates(), loadMealPlan()]); }} />}
      {showMealPlanner && <MealPlanEntryModal templates={templates} weekStart={weekStart} onClose={() => setShowMealPlanner(false)} onSaved={loadMealPlan} />}
    </div>
  );
};

export default Diary;
