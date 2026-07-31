export const NUTRIENT_FIELDS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'sodium',
  'vitamin_c',
  'vitamin_d',
  'vitamin_b12',
  'iron',
  'calcium',
  'potassium',
];

export const parseServingGrams = (servingSize) => {
  const text = String(servingSize || '');
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return match[2].toLowerCase() === 'kg' ? value * 1000 : value;
};

export const scaleNutrition = (food, amountValue, amountUnit) => {
  const amount = Number(amountValue);
  if (!food || !Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter an amount greater than zero');
  }

  const basis = String(food.nutrition_basis || '').toLowerCase();
  const servingGrams = parseServingGrams(food.serving_size);
  let factor;

  if (amountUnit === 'grams') {
    if (basis.includes('100g')) {
      factor = amount / 100;
    } else if (servingGrams) {
      factor = amount / servingGrams;
    } else {
      throw new Error('This food has no gram-based serving size. Use portions instead.');
    }
  } else if (amountUnit === 'portions') {
    if (basis.includes('100g')) {
      factor = amount * ((servingGrams || 100) / 100);
    } else {
      factor = amount;
    }
  } else {
    throw new Error('Choose grams or portions');
  }

  return Object.fromEntries(
    NUTRIENT_FIELDS.map((field) => [
      field,
      Number((Number(food[field] || 0) * factor).toFixed(1)),
    ])
  );
};

export const formatFoodAmount = (amountValue, amountUnit, food = null) => {
  const amount = Number(amountValue);
  if (amountUnit === 'grams') return `${amount} g`;
  const servingGrams = parseServingGrams(food?.serving_size);
  const portionLabel = `${amount} ${amount === 1 ? 'portion' : 'portions'}`;
  return servingGrams ? `${portionLabel} (${servingGrams} g each)` : portionLabel;
};
