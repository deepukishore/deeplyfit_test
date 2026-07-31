import { estimateWorkoutCalories } from './workoutCalories';

describe('workout calorie estimation', () => {
  test('estimates calories from activity, duration, and profile weight', () => {
    expect(estimateWorkoutCalories({
      workoutType: 'Weight Training',
      durationMinutes: 45,
      weightKg: 70,
    })).toMatchObject({
      calories: 276,
      activity: 'Strength training',
      intensity: 'moderate',
      weightKg: 70,
      usedDefaultWeight: false,
    });
  });

  test('uses workout-specific MET values', () => {
    const walking = estimateWorkoutCalories({
      workoutType: 'Walking',
      durationMinutes: 30,
      weightKg: 80,
    });
    const running = estimateWorkoutCalories({
      workoutType: 'Running',
      durationMinutes: 30,
      weightKg: 80,
    });

    expect(walking.calories).toBe(147);
    expect(running.calories).toBeGreaterThan(walking.calories);
  });

  test('uses note wording to adjust intensity', () => {
    const easy = estimateWorkoutCalories({
      workoutType: 'Cycling',
      durationMinutes: 40,
      weightKg: 75,
      notes: 'Easy recovery session',
    });
    const vigorous = estimateWorkoutCalories({
      workoutType: 'Cycling',
      durationMinutes: 40,
      weightKg: 75,
      notes: 'Very hard, fast pace',
    });

    expect(easy.intensity).toBe('light');
    expect(vigorous.intensity).toBe('vigorous');
    expect(vigorous.calories).toBeGreaterThan(easy.calories);
  });

  test('falls back to 70 kg when profile weight is unavailable', () => {
    expect(estimateWorkoutCalories({
      workoutType: 'Yoga',
      durationMinutes: 60,
    })).toMatchObject({
      weightKg: 70,
      usedDefaultWeight: true,
    });
  });

  test('rejects blank workouts and invalid durations', () => {
    expect(() => estimateWorkoutCalories({
      workoutType: '',
      durationMinutes: 30,
      weightKg: 70,
    })).toThrow('Enter a workout type');

    expect(() => estimateWorkoutCalories({
      workoutType: 'Running',
      durationMinutes: 0,
      weightKg: 70,
    })).toThrow('Enter a duration from 1 to 600 whole minutes');

    expect(() => estimateWorkoutCalories({
      workoutType: 'Running',
      durationMinutes: 45.5,
      weightKg: 70,
    })).toThrow('Enter a duration from 1 to 600 whole minutes');
  });
});
