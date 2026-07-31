import { formatFoodAmount, parseServingGrams, scaleNutrition } from './nutrition';

const PER_100G_FOOD = {
  nutrition_basis: 'per 100g estimate',
  serving_size: '100g',
  calories: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
};

describe('nutrition scaling', () => {
  test('calculates nutrients for a gram amount from a per-100g food', () => {
    expect(scaleNutrition(PER_100G_FOOD, 150, 'grams')).toMatchObject({
      calories: 247.5,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
    });
  });

  test('calculates multiple portions using a declared serving weight', () => {
    const food = {
      ...PER_100G_FOOD,
      serving_size: '1 bar (40 g)',
      calories: 200,
      protein: 10,
    };

    expect(parseServingGrams(food.serving_size)).toBe(40);
    expect(scaleNutrition(food, 2, 'portions')).toMatchObject({
      calories: 160,
      protein: 8,
    });
  });

  test('scales per-serving nutrition by grams when serving weight is known', () => {
    const food = {
      nutrition_basis: 'per serving',
      serving_size: '30 g',
      calories: 120,
      protein: 6,
      carbs: 15,
      fat: 4,
    };

    expect(scaleNutrition(food, 45, 'grams')).toMatchObject({
      calories: 180,
      protein: 9,
      carbs: 22.5,
      fat: 6,
    });
  });

  test('does not invent a gram conversion without a serving weight', () => {
    expect(() => scaleNutrition(
      { nutrition_basis: 'per serving', calories: 100 },
      50,
      'grams'
    )).toThrow('Use portions instead');
  });

  test('formats gram and portion amounts for the food log', () => {
    expect(formatFoodAmount(125, 'grams')).toBe('125 g');
    expect(formatFoodAmount(1, 'portions')).toBe('1 portion');
    expect(formatFoodAmount(2, 'portions', { serving_size: '40 g' })).toBe('2 portions (40 g each)');
  });
});
