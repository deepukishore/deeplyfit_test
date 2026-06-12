import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api';

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

const WorkoutPlannerModal = ({ date, onClose, onSuccess }) => {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planKey, setPlanKey] = useState('');
  const [dayName, setDayName] = useState('');
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('60');
  const [calories, setCalories] = useState('250');
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
    if (!selectedPlan || !selectedDay || !workoutName.trim()) {
      toast.error('Choose a plan and workout day first');
      return;
    }

    setSaving(true);
    try {
      await api.logDetailedWorkout({
        date,
        workout_type: workoutName.trim(),
        duration_minutes: parseInt(duration, 10) || 0,
        calories_burned: parseFloat(calories) || 0,
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
                <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>

            <div className="planner-grid">
              <div className="input-group">
                <label>Calories Burned</label>
                <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional session notes" />
              </div>
            </div>

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
              <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={saving}>
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
