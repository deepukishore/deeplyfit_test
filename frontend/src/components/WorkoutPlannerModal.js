import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import { estimateWorkoutCalories } from '../utils/workoutCalories';

const repDefault = (range) => {
  const match = String(range || '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 8;
};

const hydrateExercises = (day) => (
  (day?.exercises || []).map((exercise) => ({
    name: exercise.name,
    notes: exercise.notes,
    repRange: exercise.rep_range,
    sets: Array.from({ length: exercise.target_sets }).map(() => ({
      reps: repDefault(exercise.rep_range),
      weight: '',
    })),
  }))
);

const WorkoutPlannerModal = ({ user, date, onClose, onSuccess }) => {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planKey, setPlanKey] = useState('');
  const [dayName, setDayName] = useState('');
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const response = await api.getWorkoutLibrary();
        const plans = response.plans || [];
        setLibrary(plans);
        if (plans.length) {
          setPlanKey(plans[0].key);
          setDayName(plans[0].days[0]?.name || '');
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load workout library');
      } finally {
        setLoading(false);
      }
    };

    loadLibrary();
  }, []);

  const selectedPlan = useMemo(
    () => library.find((plan) => plan.key === planKey) || library[0],
    [library, planKey]
  );

  const selectedDay = useMemo(
    () => selectedPlan?.days.find((day) => day.name === dayName) || selectedPlan?.days?.[0],
    [selectedPlan, dayName]
  );

  useEffect(() => {
    if (!selectedPlan || !selectedDay) return;
    setWorkoutName(`${selectedPlan.name} - ${selectedDay.name}`);
    setExercises(hydrateExercises(selectedDay));
  }, [selectedPlan, selectedDay]);

  const calorieEstimate = useMemo(() => {
    if (!workoutName.trim() || !duration) return { value: null, error: null };
    try {
      return {
        value: estimateWorkoutCalories({
          workoutType: [
            workoutName,
            selectedDay?.name,
            ...exercises.map((exercise) => exercise.name),
          ].filter(Boolean).join(' '),
          durationMinutes: duration,
          weightKg: user?.current_weight,
          notes,
        }),
        error: null,
      };
    } catch (err) {
      return { value: null, error: err.message };
    }
  }, [workoutName, selectedDay?.name, exercises, duration, user?.current_weight, notes]);

  const updateSet = (exerciseIndex, setIndex, key, value) => {
    setExercises((current) => current.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.map((setItem, j) => (
          j === setIndex ? { ...setItem, [key]: value } : setItem
        )),
      };
    }));
  };

  const handleSubmit = async () => {
    if (!selectedPlan || !selectedDay || !workoutName.trim() || !calorieEstimate.value) {
      toast.error(calorieEstimate.error || 'Choose a plan, workout day, and valid duration first');
      return;
    }

    setSaving(true);
    try {
      await api.logDetailedWorkout({
        date,
        workout_type: workoutName.trim(),
        duration_minutes: Number(duration),
        calories_burned: calorieEstimate.value.calories,
        notes,
        exercises: exercises.map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets.map((setItem) => ({
            reps: parseInt(setItem.reps, 10) || 0,
            weight: parseFloat(setItem.weight) || 0,
          })),
        })),
      });
      toast.success('Workout session saved');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet planner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">Workout Library and Planner</h3>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: 180 }}>
            <div className="spinner spinner-lg" />
            <p>Loading workout plans...</p>
          </div>
        ) : (
          <div className="planner-layout">
            <div className="planner-hero">
              <p className="planner-eyebrow">Prebuilt plans</p>
              <h4>{selectedPlan?.name || 'Workout Planner'}</h4>
              <p>{selectedPlan?.description}</p>
              <span className="badge badge-lime">{selectedPlan?.frequency}</span>
            </div>

            <div className="planner-grid">
              <div className="input-group">
                <label>Plan</label>
                <select value={selectedPlan?.key || ''} onChange={(e) => setPlanKey(e.target.value)}>
                  {library.map((plan) => (
                    <option key={plan.key} value={plan.key}>{plan.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Workout Day</label>
                <select value={selectedDay?.name || ''} onChange={(e) => setDayName(e.target.value)}>
                  {(selectedPlan?.days || []).map((day) => (
                    <option key={day.name} value={day.name}>{day.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="planner-grid">
              <div className="input-group">
                <label>Workout Name</label>
                <input value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Duration (min)</label>
                <input type="number" min="1" max="600" step="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label>Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional: easy pace, heavy sets, very intense" />
            </div>

            {calorieEstimate.error && <p className="nutrition-message error">{calorieEstimate.error}</p>}

            {calorieEstimate.value && (
              <div className="planner-calorie-preview" aria-live="polite">
                <div>
                  <p>Estimated calories burned</p>
                  <span>
                    {calorieEstimate.value.activity} · {calorieEstimate.value.intensity} intensity · {duration} min · {calorieEstimate.value.weightKg} kg
                  </span>
                </div>
                <strong>{calorieEstimate.value.calories} kcal</strong>
                <small>
                  Calculated automatically from the selected workout, exercises, duration, profile weight, and note intensity.
                  {calorieEstimate.value.usedDefaultWeight ? ' Add your current weight in Profile for a more personal estimate.' : ' Actual burn may vary.'}
                </small>
              </div>
            )}

            <div className="planner-exercises">
              {exercises.map((exercise, exerciseIndex) => (
                <div key={exercise.name} className="planner-exercise-card">
                  <div className="planner-exercise-head">
                    <div>
                      <h5>{exercise.name}</h5>
                      <p>{exercise.repRange} reps · {exercise.notes}</p>
                    </div>
                    <span className="badge badge-blue">{exercise.sets.length} sets</span>
                  </div>
                  <div className="planner-sets">
                    {exercise.sets.map((setItem, setIndex) => (
                      <div key={`${exercise.name}-${setIndex}`} className="planner-set-row">
                        <span className="planner-set-label">Set {setIndex + 1}</span>
                        <input
                          type="number"
                          value={setItem.reps}
                          onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', e.target.value)}
                          placeholder="Reps"
                        />
                        <input
                          type="number"
                          value={setItem.weight}
                          onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', e.target.value)}
                          placeholder="Weight"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="scan-footer" style={{ padding: 0 }}>
              <button className="btn btn-secondary btn-full" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={saving || !calorieEstimate.value}>
                {saving ? <><span className="spinner" /> Saving...</> : 'Save Workout'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutPlannerModal;
