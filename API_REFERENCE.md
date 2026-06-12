# Data Structure Reference

## Database Schema Changes

### Users Table
```sql
ALTER TABLE users ADD COLUMN allergens_json TEXT NULL;
```

**Field:** `allergens_json`
- Type: TEXT (JSON)
- Nullable: Yes
- Format: JSON array of allergen strings
- Example: `["gluten", "lactose", "nuts"]`

---

## API Request/Response Examples

### 1. Set User Allergens

**Request:**
```json
PUT /users/allergens
{
  "allergens": ["gluten", "lactose", "eggs"]
}
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "allergens": ["gluten", "lactose", "eggs"],
  ...other user fields...
}
```

---

### 2. Get User Allergens

**Request:**
```
GET /users/allergens
```

**Response:**
```json
{
  "allergens": ["gluten", "lactose", "eggs"]
}
```

---

### 3. Check Food for Allergens

**Request:**
```json
POST /food/check-allergens
{
  "food_name": "wheat bread"
}
```

**Response:**
```json
{
  "food_name": "wheat bread",
  "detected_allergens": ["gluten"],
  "has_allergens": true
}
```

---

### 4. Get Workout Streaks

**Request:**
```
GET /workouts/streak
```

**Response:**
```json
{
  "current_streak": 7,
  "best_streak": 15
}
```

---

### 5. Get Workout Calendar

**Request:**
```
GET /workouts/calendar
```

**Response:**
```json
{
  "2024-05-07": 2,
  "2024-05-06": 1,
  "2024-05-05": 3,
  "2024-05-04": 0,
  "2024-05-03": 1,
  "2024-05-02": 2,
  "2024-05-01": 1,
  ...past 90 days...
}
```

---

## Allergen Detection Logic

### Common Allergen Database
```python
COMMON_ALLERGENS = [
    "gluten", "lactose", "nuts", "peanuts", "eggs",
    "soy", "shellfish", "fish", "sesame", "mustard"
]

FOOD_ALLERGEN_MAP = {
    "bread": ["gluten"],
    "pasta": ["gluten"],
    "milk": ["lactose"],
    "cheese": ["lactose"],
    "eggs": ["eggs"],
    "peanut": ["peanuts", "nuts"],
    "almonds": ["nuts"],
    "shrimp": ["shellfish"],
    "soy sauce": ["soy"],
    # ...and more
}
```

### Detection Algorithm
1. Normalize food name to lowercase
2. Check food-allergen mapping for partial matches
3. Check for direct allergen name matches
4. Return list of detected allergens or empty list

---

## Frontend Component Props

### AllergenSettingsModal
```jsx
<AllergenSettingsModal
  onClose={() => {}}        // Called when closing without saving
  onSave={() => {}}         // Called after successful save
/>
```

### AllergenWarningModal
```jsx
<AllergenWarningModal
  foodName="string"         // Name of the food being logged
  allergens={[]}           // List of detected allergens
  onLogAnyway={() => {}}   // User chooses to log despite warning
  onCancel={() => {}}      // User cancels the food log
/>
```

### WorkoutStreakCalendar
```jsx
<WorkoutStreakCalendar />
```
Props: None (fetches data via API internally)

---

## Color Scheme for Calendar

| Color | RGB | Usage |
|-------|-----|-------|
| Gray | #E0E0E0 | No workouts |
| Light Green | #90EE90 | 1 workout |
| Lime Green | #32CD32 | 2 workouts |
| Forest Green | #228B22 | 3+ workouts |
| Primary | var(--primary) | Today's border |

---

## Common Allergen Mappings

| Allergen | Common Foods |
|----------|--------------|
| gluten | bread, pasta, cereal, flour, wheat, barley, oats, bagel, pancake |
| lactose | milk, cheese, yogurt, butter, cream, ice cream |
| nuts | almonds, cashews, walnuts, pecans, pistachios, hazelnuts |
| peanuts | peanuts, peanut butter |
| eggs | eggs, mayonnaise, omelets |
| soy | soy, tofu, edamame, soy sauce, tempeh |
| shellfish | shrimp, crab, lobster, oyster, clam, scallop |
| fish | salmon, tuna, cod, bass, tilapia, anchovy |
| sesame | sesame, tahini |
| mustard | mustard |

