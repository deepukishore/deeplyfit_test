# Integration Guide - New Features

## How to Integrate into Your App

### 1. Add Allergen Settings to Profile Page

In your Profile component, import and add the AllergenSettingsModal:

```jsx
import AllergenSettingsModal from '../components/AllergenSettingsModal';

// In your Profile component, add a state:
const [showAllergenSettings, setShowAllergenSettings] = useState(false);

// Add button in profile settings:
<button onClick={() => setShowAllergenSettings(true)}>
  🚫 Allergens & Intolerances
</button>

// Add modal:
{showAllergenSettings && (
  <AllergenSettingsModal
    onClose={() => setShowAllergenSettings(false)}
    onSave={() => console.log('Allergens updated')}
  />
)}
```

### 2. Add Allergen Warning to Food Logging

In your Diary or food logging component:

```jsx
import AllergenWarningModal from '../components/AllergenWarningModal';

// Before logging food, check for allergens:
const checkAndLogFood = async (foodData) => {
  const allergenCheck = await api.checkAllergens(foodData.food_name);
  
  if (allergenCheck.has_allergens) {
    setAllergenWarning({
      foodName: foodData.food_name,
      allergens: allergenCheck.detected_allergens,
    });
    setPendingFoodLog(foodData);
  } else {
    // Log normally
    await logFood(foodData);
  }
};

// Render warning modal:
{allergenWarning && (
  <AllergenWarningModal
    foodName={allergenWarning.foodName}
    allergens={allergenWarning.allergens}
    onCancel={() => setAllergenWarning(null)}
    onLogAnyway={() => {
      logFood(pendingFoodLog);
      setAllergenWarning(null);
    }}
  />
)}
```

### 3. Add Workout Streak Calendar

In your Workouts, Progress, or Home page:

```jsx
import WorkoutStreakCalendar from '../components/WorkoutStreakCalendar';

// Simply add the component:
<WorkoutStreakCalendar />
```

## Testing the Features

### Test Allergen Detection:
1. Go to Profile → Allergens & Intolerances
2. Check "Gluten", "Lactose", "Eggs"
3. Try logging a food like "Bread" or "Milk"
4. Should see allergen warning popup

### Test Workout Streaks:
1. Log workouts for several consecutive days
2. View the calendar - should show green squares
3. Check current vs best streaks displayed

## Backend API Reference

### Allergens Endpoints
```
GET /users/allergens
  Returns: { "allergens": ["gluten", "lactose", ...] }

PUT /users/allergens
  Body: { "allergens": ["gluten", "lactose", ...] }
  Returns: Updated UserResponse

POST /food/check-allergens
  Body: { "food_name": "bread" }
  Returns: { 
    "food_name": "bread",
    "detected_allergens": ["gluten"],
    "has_allergens": true
  }
```

### Workout Endpoints
```
GET /workouts/streak
  Returns: { 
    "current_streak": 5,
    "best_streak": 12
  }

GET /workouts/calendar
  Returns: {
    "2024-05-07": 2,
    "2024-05-06": 1,
    ...
  }
```

## Notes
- Allergen detection is case-insensitive and looks for partial matches
- The common allergen list includes: gluten, lactose, nuts, peanuts, eggs, soy, shellfish, fish, sesame, mustard
- Calendar shows past 90 days with color intensity based on workout count
- Streaks calculated over 90-day lookback window
