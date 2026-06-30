from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    height = Column(Float, nullable=True)
    current_weight = Column(Float, nullable=True)
    goal_weight = Column(Float, nullable=True)
    activity_level = Column(String(50), nullable=True)
    fitness_goal = Column(String(50), nullable=True)
    bmr = Column(Float, nullable=True)
    tdee = Column(Float, nullable=True)
    calorie_target = Column(Float, nullable=True)
    protein_target = Column(Float, nullable=True)
    carbs_target = Column(Float, nullable=True)
    fat_target = Column(Float, nullable=True)
    onboarding_complete = Column(Integer, default=0)
    dark_mode = Column(Integer, default=0)
    water_goal = Column(Integer, default=8)
    bio = Column(Text, nullable=True)
    public_profile_slug = Column(String(120), unique=True, index=True, nullable=True)
    profile_visibility = Column(String(20), default="public")
    share_achievements = Column(Integer, default=1)
    allergens_json = Column(Text, nullable=True)
    premium_status = Column(String(20), default="free")
    premium_plan = Column(String(20), nullable=True)
    premium_activated_at = Column(DateTime(timezone=True), nullable=True)
    premium_expires_at = Column(DateTime(timezone=True), nullable=True)
    premium_payment_ref = Column(String(120), nullable=True)
    premium_pending_plan = Column(String(20), nullable=True)
    premium_pending_payment_ref = Column(String(120), nullable=True)
    premium_pending_requested_at = Column(DateTime(timezone=True), nullable=True)
    free_ai_scans_used = Column(Integer, default=0)
    free_ai_scans_reset_on = Column(Date, nullable=True)
    free_ai_messages_used = Column(Integer, default=0)
    free_ai_messages_reset_on = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    food_logs = relationship("FoodLog", back_populates="user")
    workouts = relationship("Workout", back_populates="user")
    water_logs = relationship("WaterLog", back_populates="user")
    weight_logs = relationship("WeightLog", back_populates="user")
    meal_templates = relationship("MealTemplate", back_populates="user")
    meal_plan_entries = relationship("MealPlanEntry", back_populates="user")
    community_posts = relationship("CommunityPost", back_populates="user")
    community_comments = relationship("CommunityComment", back_populates="user")
    community_likes = relationship("CommunityPostLike", back_populates="user")


class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    meal_type = Column(String(50), nullable=False)
    food_name = Column(String(255), nullable=False)
    calories = Column(Float, default=0)
    protein = Column(Float, default=0)
    carbs = Column(Float, default=0)
    fat = Column(Float, default=0)
    fiber = Column(Float, default=0)
    sugar = Column(Float, default=0)
    sodium = Column(Float, default=0)
    vitamin_c = Column(Float, default=0)
    vitamin_d = Column(Float, default=0)
    vitamin_b12 = Column(Float, default=0)
    iron = Column(Float, default=0)
    calcium = Column(Float, default=0)
    potassium = Column(Float, default=0)
    quantity = Column(Float, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="food_logs")


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    workout_type = Column(String(100), nullable=False)
    duration_minutes = Column(Integer, default=0)
    calories_burned = Column(Float, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="workouts")
    sets = relationship("WorkoutSet", back_populates="workout", cascade="all, delete-orphan")


class WaterLog(Base):
    __tablename__ = "water_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    glasses = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="water_logs")


class WeightLog(Base):
    __tablename__ = "weight_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    weight = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="weight_logs")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MealTemplate(Base):
    __tablename__ = "meal_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(120), nullable=False)
    meal_type = Column(String(50), nullable=False)
    foods_json = Column(Text, nullable=False)
    template_type = Column(String(30), default="meal")
    servings = Column(Float, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="meal_templates")


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=False)
    exercise_name = Column(String(120), nullable=False)
    set_number = Column(Integer, nullable=False)
    reps = Column(Integer, nullable=False)
    weight = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workout = relationship("Workout", back_populates="sets")


class MealPlanEntry(Base):
    __tablename__ = "meal_plan_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("meal_templates.id"), nullable=False)
    planned_date = Column(Date, nullable=False)
    meal_type = Column(String(50), nullable=False)
    servings = Column(Float, default=1)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="meal_plan_entries")
    template = relationship("MealTemplate")


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_type = Column(String(30), default="update")
    content = Column(Text, nullable=False)
    image_data = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="community_posts")
    comments = relationship("CommunityComment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("CommunityPostLike", back_populates="post", cascade="all, delete-orphan")


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="community_comments")
    post = relationship("CommunityPost", back_populates="comments")


class CommunityPostLike(Base):
    __tablename__ = "community_post_likes"
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_community_post_like_user_post"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="community_likes")
    post = relationship("CommunityPost", back_populates="likes")


class CommunityChallengeJoin(Base):
    __tablename__ = "community_challenge_joins"
    __table_args__ = (
        UniqueConstraint("user_id", "challenge_id", name="uq_community_challenge_join_user_challenge"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    challenge_id = Column(String(50), nullable=False, index=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
