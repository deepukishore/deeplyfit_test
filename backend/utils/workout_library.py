WORKOUT_LIBRARY = [
    {
        "key": "ppl",
        "name": "Push / Pull / Legs",
        "description": "Classic hypertrophy split for building muscle with focused recovery.",
        "frequency": "3-6 days / week",
        "days": [
            {
                "name": "Push Day",
                "goal": "Chest, shoulders, triceps",
                "exercises": [
                    {"name": "Barbell Bench Press", "target_sets": 4, "rep_range": "5-8", "notes": "Drive feet into the floor and keep shoulders packed."},
                    {"name": "Incline Dumbbell Press", "target_sets": 3, "rep_range": "8-10", "notes": "Control the lowering phase."},
                    {"name": "Seated Shoulder Press", "target_sets": 3, "rep_range": "8-12", "notes": "Keep ribs down and avoid over-arching."},
                    {"name": "Cable Lateral Raise", "target_sets": 3, "rep_range": "12-15", "notes": "Pause at the top."},
                    {"name": "Tricep Pushdown", "target_sets": 3, "rep_range": "10-15", "notes": "Full elbow extension each rep."},
                ],
            },
            {
                "name": "Pull Day",
                "goal": "Back, rear delts, biceps",
                "exercises": [
                    {"name": "Deadlift", "target_sets": 3, "rep_range": "3-5", "notes": "Brace hard before every rep."},
                    {"name": "Lat Pulldown", "target_sets": 3, "rep_range": "8-12", "notes": "Pull elbows to hips."},
                    {"name": "Chest Supported Row", "target_sets": 3, "rep_range": "8-12", "notes": "Squeeze shoulder blades together."},
                    {"name": "Face Pull", "target_sets": 3, "rep_range": "12-15", "notes": "Lead with elbows."},
                    {"name": "EZ-Bar Curl", "target_sets": 3, "rep_range": "10-12", "notes": "Control the eccentric."},
                ],
            },
            {
                "name": "Leg Day",
                "goal": "Quads, glutes, hamstrings, calves",
                "exercises": [
                    {"name": "Back Squat", "target_sets": 4, "rep_range": "5-8", "notes": "Keep chest tall and knees tracking over toes."},
                    {"name": "Romanian Deadlift", "target_sets": 3, "rep_range": "8-10", "notes": "Push hips back and keep lats tight."},
                    {"name": "Leg Press", "target_sets": 3, "rep_range": "10-12", "notes": "Drive evenly through the midfoot."},
                    {"name": "Walking Lunge", "target_sets": 3, "rep_range": "10 / leg", "notes": "Take a long enough step for glute tension."},
                    {"name": "Standing Calf Raise", "target_sets": 4, "rep_range": "12-15", "notes": "Pause fully stretched at the bottom."},
                ],
            },
        ],
    },
    {
        "key": "stronglifts_5x5",
        "name": "StrongLifts 5x5",
        "description": "Simple strength-focused progression built around the big compound lifts.",
        "frequency": "3 days / week",
        "days": [
            {
                "name": "Workout A",
                "goal": "Squat, press, pull",
                "exercises": [
                    {"name": "Back Squat", "target_sets": 5, "rep_range": "5", "notes": "Add a small amount of weight when all reps are clean."},
                    {"name": "Bench Press", "target_sets": 5, "rep_range": "5", "notes": "Explode off the chest with control."},
                    {"name": "Barbell Row", "target_sets": 5, "rep_range": "5", "notes": "Brace torso and avoid jerking the bar."},
                ],
            },
            {
                "name": "Workout B",
                "goal": "Squat, overhead press, hinge",
                "exercises": [
                    {"name": "Back Squat", "target_sets": 5, "rep_range": "5", "notes": "Maintain depth and bar path consistency."},
                    {"name": "Overhead Press", "target_sets": 5, "rep_range": "5", "notes": "Squeeze glutes and stay stacked."},
                    {"name": "Deadlift", "target_sets": 1, "rep_range": "5", "notes": "Treat every rep like a single."},
                ],
            },
        ],
    },
    {
        "key": "upper_lower",
        "name": "Upper / Lower Split",
        "description": "Balanced four-day split with a mix of strength and hypertrophy work.",
        "frequency": "4 days / week",
        "days": [
            {
                "name": "Upper 1",
                "goal": "Upper body strength bias",
                "exercises": [
                    {"name": "Bench Press", "target_sets": 4, "rep_range": "5-6", "notes": "Main strength lift of the day."},
                    {"name": "Bent-Over Row", "target_sets": 4, "rep_range": "6-8", "notes": "Stay braced and avoid momentum."},
                    {"name": "Overhead Press", "target_sets": 3, "rep_range": "6-8", "notes": "Keep bar close to the face."},
                    {"name": "Pull-Up or Assisted Pull-Up", "target_sets": 3, "rep_range": "6-10", "notes": "Full stretch at the bottom."},
                ],
            },
            {
                "name": "Lower 1",
                "goal": "Lower body strength bias",
                "exercises": [
                    {"name": "Back Squat", "target_sets": 4, "rep_range": "5-6", "notes": "Prioritize consistent depth."},
                    {"name": "Romanian Deadlift", "target_sets": 3, "rep_range": "6-8", "notes": "Feel the hamstrings load."},
                    {"name": "Leg Curl", "target_sets": 3, "rep_range": "10-12", "notes": "Slow eccentric."},
                    {"name": "Calf Raise", "target_sets": 4, "rep_range": "12-15", "notes": "Pause at stretch and squeeze."},
                ],
            },
        ],
    },
]
