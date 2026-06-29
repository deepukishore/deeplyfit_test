from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict
from datetime import date, datetime


# Allergens
class AllergenUpdate(BaseModel):
    allergens: List[str]  # List of allergen names like ["gluten", "lactose", "nuts"]


class AllergenCheckRequest(BaseModel):
    food_name: str
    allergen_list: List[str]


class AllergenCheckResponse(BaseModel):
    food_name: str
    detected_allergens: List[str]
    has_allergens: bool


# Auth
class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


# Onboarding
class OnboardingData(BaseModel):
    age: int
    gender: str
    height: float
    current_weight: float
    goal_weight: float
    activity_level: str
    fitness_goal: str


# User
class UserUpdate(BaseModel):
    name: Optional[str] = None
    goal_weight: Optional[float] = None
    activity_level: Optional[str] = None
    fitness_goal: Optional[str] = None
    dark_mode: Optional[int] = None
    water_goal: Optional[int] = None
    bio: Optional[str] = None
    public_profile_slug: Optional[str] = None
    profile_visibility: Optional[str] = None
    share_achievements: Optional[int] = None
    allergens: Optional[List[str]] = None


class PremiumActivationRequest(BaseModel):
    plan: str
    payment_reference: str
    payment_method: str = "upi"


class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    age: Optional[int]
    gender: Optional[str]
    height: Optional[float]
    current_weight: Optional[float]
    goal_weight: Optional[float]
    activity_level: Optional[str]
    fitness_goal: Optional[str]
    bmr: Optional[float]
    tdee: Optional[float]
    calorie_target: Optional[float]
    protein_target: Optional[float]
    carbs_target: Optional[float]
    fat_target: Optional[float]
    onboarding_complete: int
    dark_mode: int
    water_goal: int = 8
    bio: Optional[str] = None
    public_profile_slug: Optional[str] = None
    profile_visibility: str = "public"
    share_achievements: int = 1
    allergens: Optional[List[str]] = None
    premium_status: str = "free"
    premium_plan: Optional[str] = None
    premium_activated_at: Optional[datetime] = None
    premium_expires_at: Optional[datetime] = None
    premium_payment_ref: Optional[str] = None
    free_ai_scans_used: int = 0
    free_ai_scans_reset_on: Optional[date] = None
    free_ai_messages_used: int = 0
    free_ai_messages_reset_on: Optional[date] = None

    @field_validator(
        "onboarding_complete",
        "dark_mode",
        "share_achievements",
        "free_ai_scans_used",
        "free_ai_messages_used",
        mode="before",
    )
    @classmethod
    def default_zero_ints(cls, value):
        return 0 if value is None else value

    @field_validator("water_goal", mode="before")
    @classmethod
    def default_water_goal(cls, value):
        return 8 if value is None else value

    @field_validator("profile_visibility", mode="before")
    @classmethod
    def default_profile_visibility(cls, value):
        return "public" if value is None else value

    @field_validator("premium_status", mode="before")
    @classmethod
    def default_premium_status(cls, value):
        return "free" if value is None else value

    class Config:
        from_attributes = True


# Food Logs
class FoodLogCreate(BaseModel):
    date: date
    meal_type: str
    food_name: str
    calories: float
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    vitamin_c: float = 0
    vitamin_d: float = 0
    vitamin_b12: float = 0
    iron: float = 0
    calcium: float = 0
    potassium: float = 0
    quantity: float = 1


class FoodLogResponse(BaseModel):
    id: int
    date: date
    meal_type: str
    food_name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float
    sugar: float
    sodium: float
    vitamin_c: float
    vitamin_d: float
    vitamin_b12: float
    iron: float
    calcium: float
    potassium: float
    quantity: float

    class Config:
        from_attributes = True


# AI Food Scan
class FoodScanRequest(BaseModel):
    image_base64: str
    meal_type: str
    date: date


class FoodScanResponse(BaseModel):
    name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    vitamin_c: float = 0
    vitamin_d: float = 0
    vitamin_b12: float = 0
    iron: float = 0
    calcium: float = 0
    potassium: float = 0


class BarcodeLogCreate(BaseModel):
    barcode: str
    date: date
    meal_type: str
    quantity: float = 1


class BarcodeLookupResponse(BaseModel):
    barcode: str
    name: str
    brand: Optional[str] = None
    image_url: Optional[str] = None
    quantity_label: Optional[str] = None
    serving_size: Optional[str] = None
    nutrition_basis: str
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    vitamin_c: float = 0
    vitamin_d: float = 0
    vitamin_b12: float = 0
    iron: float = 0
    calcium: float = 0
    potassium: float = 0


class FoodSearchResult(BaseModel):
    code: str
    name: str
    brand: Optional[str] = None
    image_url: Optional[str] = None
    quantity_label: Optional[str] = None
    serving_size: Optional[str] = None
    nutrition_basis: str
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    vitamin_c: float = 0
    vitamin_d: float = 0
    vitamin_b12: float = 0
    iron: float = 0
    calcium: float = 0
    potassium: float = 0


class FoodSearchResponse(BaseModel):
    query: str
    total_results: int
    page: int
    page_size: int
    results: List[FoodSearchResult]


# Workouts
class WorkoutCreate(BaseModel):
    date: date
    workout_type: str
    duration_minutes: int
    calories_burned: float = 0
    notes: Optional[str] = None


class WorkoutResponse(BaseModel):
    id: int
    date: date
    workout_type: str
    duration_minutes: int
    calories_burned: float
    notes: Optional[str]

    class Config:
        from_attributes = True


class WorkoutSetInput(BaseModel):
    reps: int
    weight: float = 0


class WorkoutExerciseInput(BaseModel):
    name: str
    sets: List[WorkoutSetInput]


class DetailedWorkoutCreate(BaseModel):
    date: date
    workout_type: str
    duration_minutes: int
    calories_burned: float = 0
    notes: Optional[str] = None
    exercises: List[WorkoutExerciseInput]


class WorkoutSetResponse(BaseModel):
    id: int
    exercise_name: str
    set_number: int
    reps: int
    weight: float

    class Config:
        from_attributes = True


class WorkoutExerciseResponse(BaseModel):
    name: str
    sets: List[WorkoutSetResponse]


class DetailedWorkoutResponse(BaseModel):
    id: int
    date: date
    workout_type: str
    duration_minutes: int
    calories_burned: float
    notes: Optional[str]
    exercises: List[WorkoutExerciseResponse]


class WorkoutLibraryExercise(BaseModel):
    name: str
    target_sets: int
    rep_range: str
    notes: str


class WorkoutLibraryDay(BaseModel):
    name: str
    goal: str
    exercises: List[WorkoutLibraryExercise]


class WorkoutLibraryPlan(BaseModel):
    key: str
    name: str
    description: str
    frequency: str
    days: List[WorkoutLibraryDay]


class WorkoutLibraryResponse(BaseModel):
    plans: List[WorkoutLibraryPlan]


# Water Logs
class WaterLogCreate(BaseModel):
    date: date
    glasses: int


class WaterLogResponse(BaseModel):
    id: int
    date: date
    glasses: int

    class Config:
        from_attributes = True


# Weight Logs
class WeightLogCreate(BaseModel):
    date: date
    weight: float
    notes: Optional[str] = None


class WeightLogResponse(BaseModel):
    id: int
    date: date
    weight: float
    notes: Optional[str]

    class Config:
        from_attributes = True


class BMIPoint(BaseModel):
    date: date
    weight: float
    bmi: float


class BMIHistoryResponse(BaseModel):
    height_cm: float
    latest_bmi: Optional[float] = None
    bmi_category: Optional[str] = None
    healthy_bmi_min: float
    healthy_bmi_max: float
    healthy_weight_min: float
    healthy_weight_max: float
    history: List[BMIPoint]


class TemplateFoodItem(BaseModel):
    food_name: str
    calories: float
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0
    sugar: float = 0
    sodium: float = 0
    vitamin_c: float = 0
    vitamin_d: float = 0
    vitamin_b12: float = 0
    iron: float = 0
    calcium: float = 0
    potassium: float = 0
    quantity: float = 1


class MealTemplateCreate(BaseModel):
    name: str
    meal_type: str
    foods: List[TemplateFoodItem]
    template_type: str = "meal"
    servings: float = 1


class MealTemplateLogRequest(BaseModel):
    date: date
    meal_type: Optional[str] = None
    servings_multiplier: float = 1


class CopyMealsRequest(BaseModel):
    source_date: date
    target_date: date
    meal_type: Optional[str] = None


class MealTemplateResponse(BaseModel):
    id: int
    name: str
    meal_type: str
    foods: List[TemplateFoodItem]
    template_type: str = "meal"
    servings: float = 1


class MicronutrientSummary(BaseModel):
    fiber: float
    sugar: float
    sodium: float
    vitamin_c: float
    vitamin_d: float
    vitamin_b12: float
    iron: float
    calcium: float
    potassium: float
    percent_of_rda: Dict[str, float]


class RecipeNutritionResponse(BaseModel):
    calories: float
    protein: float
    carbs: float
    fat: float
    micronutrients: MicronutrientSummary


class MacroRemaining(BaseModel):
    calories: float
    protein: float
    carbs: float
    fat: float


class MealSuggestionItem(BaseModel):
    name: str
    portion_hint: str
    calories: float
    protein: float
    carbs: float
    fat: float
    reason: str


class MealSuggestionsResponse(BaseModel):
    remaining: MacroRemaining
    summary_text: str
    suggestions: List[MealSuggestionItem]


class AchievementProgress(BaseModel):
    current: int
    target: int


class AchievementResponse(BaseModel):
    key: str
    icon: str
    name: str
    description: str
    unlocked: bool
    progress: AchievementProgress


class MealPlanEntryCreate(BaseModel):
    template_id: int
    planned_date: date
    meal_type: str
    servings: float = 1
    notes: Optional[str] = None


class MealPlanEntryResponse(BaseModel):
    id: int
    planned_date: date
    meal_type: str
    servings: float
    notes: Optional[str] = None
    template_id: int
    template_name: str
    template_type: str = "meal"
    nutrition: RecipeNutritionResponse


class ShoppingListItem(BaseModel):
    food_name: str
    quantity: float
    unit_hint: Optional[str] = None


class WeeklyMealPlanResponse(BaseModel):
    start_date: date
    end_date: date
    entries: List[MealPlanEntryResponse]
    totals: RecipeNutritionResponse
    shopping_list: List[ShoppingListItem]


class CommunityCommentCreate(BaseModel):
    content: str


class CommunityPostCreate(BaseModel):
    content: str
    post_type: str = "update"
    image_base64: Optional[str] = None


class CommunityAuthor(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    public_profile_slug: Optional[str] = None


class CommunityCommentResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    author: CommunityAuthor


class CommunityPostResponse(BaseModel):
    id: int
    post_type: str
    content: str
    image_data: Optional[str] = None
    created_at: datetime
    author: CommunityAuthor
    like_count: int
    comment_count: int
    liked_by_me: bool = False
    comments: List[CommunityCommentResponse] = []


class CommunityChallengeResponse(BaseModel):
    id: str
    name: str
    icon: str
    participants: int
    daysLeft: int
    joinedByMe: bool = False
    joinedCount: int = 0


class CommunityChallengeJoinResponse(CommunityChallengeResponse):
    message: str = "Joined challenge"


class PublicProfileStats(BaseModel):
    calorie_target: Optional[float] = None
    protein_target: Optional[float] = None
    carbs_target: Optional[float] = None
    fat_target: Optional[float] = None
    current_weight: Optional[float] = None
    goal_weight: Optional[float] = None
    total_posts: int = 0
    achievements_unlocked: int = 0


class PublicProfileResponse(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    public_profile_slug: str
    fitness_goal: Optional[str] = None
    activity_level: Optional[str] = None
    share_achievements: int = 1
    stats: PublicProfileStats
    recent_posts: List[CommunityPostResponse] = []


# Daily Summary
class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class DailySummary(BaseModel):
    date: date
    calories_consumed: float
    calories_burned: float
    calories_target: float
    protein: float
    carbs: float
    fat: float
    water_glasses: int
    micronutrients: MicronutrientSummary
    food_logs: List[FoodLogResponse]
    workouts: List[WorkoutResponse]
