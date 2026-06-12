import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import '../styles/auth.css';

const TOTAL_STEPS = 4;

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 'lightly_active', label: 'Lightly Active', desc: '1–3 days/week' },
  { value: 'moderately_active', label: 'Moderately Active', desc: '3–5 days/week' },
  { value: 'very_active', label: 'Very Active', desc: '6–7 days/week' },
  { value: 'extra_active', label: 'Extra Active', desc: 'Athlete / physical job' },
];

const FITNESS_GOALS = [
  { value: 'lose', label: '📉 Lose Weight', desc: 'Caloric deficit (-500 kcal)' },
  { value: 'maintain', label: '⚖️ Maintain Weight', desc: 'Stay at current weight' },
  { value: 'gain', label: '📈 Gain Muscle', desc: 'Caloric surplus (+300 kcal)' },
];

const validateStep = (step, data) => {
  if (step === 0) {
    if (!data.age || data.age < 13 || data.age > 100) return 'Age must be between 13 and 100';
    if (!data.gender) return 'Please select your gender';
  }
  if (step === 1) {
    if (!data.height || data.height < 100 || data.height > 250) return 'Height must be between 100–250 cm';
    if (!data.current_weight || data.current_weight < 30 || data.current_weight > 300) return 'Weight must be between 30–300 kg';
    if (!data.goal_weight || data.goal_weight < 30 || data.goal_weight > 300) return 'Goal weight must be between 30–300 kg';
  }
  if (step === 2) {
    if (!data.activity_level) return 'Please select your activity level';
    if (!data.fitness_goal) return 'Please select your fitness goal';
  }
  return null;
};

const OnboardingVisual = ({ step, calculated }) => {
  if (step === 0) {
    return (
      <div className="onboarding-visual-card profile">
        <div className="visual-orb orb-a" />
        <div className="visual-orb orb-b" />
        <div className="visual-panel">
          <div className="visual-avatar">FT</div>
          <div>
            <p className="visual-title">Personalized from day one</p>
            <p className="visual-copy">We shape your plan around your body, lifestyle, and goal.</p>
          </div>
        </div>
        <div className="visual-chip-row">
          <span className="visual-chip">Age</span>
          <span className="visual-chip">Height</span>
          <span className="visual-chip">Weight</span>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="onboarding-visual-card metrics">
        <div className="metric-ruler">
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
        <div className="visual-scale-card">
          <span className="visual-scale-number">72.4</span>
          <span className="visual-scale-unit">kg target-ready</span>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="onboarding-visual-card goal">
        <div className="visual-target-ring ring-1" />
        <div className="visual-target-ring ring-2" />
        <div className="visual-target-core">Goal</div>
        <div className="visual-floating-tag tag-a">Protein</div>
        <div className="visual-floating-tag tag-b">Calories</div>
        <div className="visual-floating-tag tag-c">Training</div>
      </div>
    );
  }

  return (
    <div className="onboarding-visual-card plan">
      <div className="visual-summary-pill">{calculated?.calories || 0} kcal / day</div>
      <div className="visual-macro-bars">
        <div><span>💪 Protein</span><strong>{calculated?.protein || 0}g</strong></div>
        <div><span>⚡ Carbs</span><strong>{calculated?.carbs || 0}g</strong></div>
        <div><span>🥑 Fat</span><strong>{calculated?.fat || 0}g</strong></div>
      </div>
      <div className="visual-plan-glow" />
    </div>
  );
};

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    age: '',
    gender: '',
    height: '',
    current_weight: '',
    goal_weight: '',
    activity_level: '',
    fitness_goal: '',
  });
  const [calculated, setCalculated] = useState(null);
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const update = (key, val) => setData(d => ({ ...d, [key]: val }));

  const calcBMR = () => {
    const w = parseFloat(data.current_weight);
    const h = parseFloat(data.height);
    const a = parseInt(data.age);
    const g = data.gender;
    if (!w || !h || !a || !g) return null;
    const bmr = g === 'male'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    const mults = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9 };
    const tdee = bmr * (mults[data.activity_level] || 1.375);
    let cal = data.fitness_goal === 'lose' ? tdee - 500 : data.fitness_goal === 'gain' ? tdee + 300 : tdee;
    cal = Math.max(cal, 1200);
    const protein = w * 2.0;
    const fat = cal * 0.25 / 9;
    const carbs = (cal - protein * 4 - fat * 9) / 4;
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      calories: Math.round(cal),
      protein: Math.round(protein),
      carbs: Math.round(Math.max(carbs, 0)),
      fat: Math.round(fat),
    };
  };

  const next = () => {
    const err = validateStep(step, data);
    if (err) { toast.error(err); return; }
    if (step === 2) {
      const calc = calcBMR();
      setCalculated(calc);
    }
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const back = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    setLoading(true);
    try {
      await api.completeOnboarding({
        age: parseInt(data.age),
        gender: data.gender,
        height: parseFloat(data.height),
        current_weight: parseFloat(data.current_weight),
        goal_weight: parseFloat(data.goal_weight),
        activity_level: data.activity_level,
        fitness_goal: data.fitness_goal,
      });
      await refreshUser();
      toast.success("Profile complete! Let's crush your goals! 🔥");
      navigate('/home');
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at 30% 10%, rgba(168,85,247,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(192,132,252,0.08) 0%, transparent 60%), var(--bg-primary)',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 420, margin: '0 auto' }}>
        <div className="onboarding-header">
          <div className="onboarding-step-indicator">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'completed' : ''}`} />
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Step {step + 1} of {TOTAL_STEPS}</p>
          <div className="onboarding-visual-wrap animate-fade-in">
            <OnboardingVisual step={step} calculated={calculated} />
          </div>
        </div>

        {/* Step 0: Basic info */}
        {step === 0 && (
          <div className="animate-slide-up">
            <h1 className="onboarding-title">About you 👤</h1>
            <p className="onboarding-subtitle">We'll use this to personalize your plan</p>

            <div className="onboarding-form" style={{ marginTop: 24 }}>
              <div className="input-group">
                <label>Age</label>
                <div className="input-with-unit">
                  <input type="number" placeholder="25" min="13" max="100" value={data.age} onChange={e => update('age', e.target.value)} />
                  <span className="input-unit">yrs</span>
                </div>
              </div>

              <div className="input-group">
                <label>Gender</label>
                <div className="radio-group">
                  {[{v:'male',l:'Male',e:'♂️'},{v:'female',l:'Female',e:'♀️'},{v:'other',l:'Other',e:'⚧️'}].map(g => (
                    <label key={g.v} className={`radio-option ${data.gender === g.v ? 'selected' : ''}`}>
                      <input type="radio" name="gender" value={g.v} checked={data.gender === g.v} onChange={e => update('gender', e.target.value)} />
                      <div className="radio-option-label">
                        <strong>{g.e} {g.l}</strong>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Body measurements */}
        {step === 1 && (
          <div className="animate-slide-up">
            <h1 className="onboarding-title">Body stats 📏</h1>
            <p className="onboarding-subtitle">Your current measurements</p>

            <div className="onboarding-form" style={{ marginTop: 24 }}>
              <div className="input-group">
                <label>Height</label>
                <div className="input-with-unit">
                  <input type="number" placeholder="175" min="100" max="250" value={data.height} onChange={e => update('height', e.target.value)} />
                  <span className="input-unit">cm</span>
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>Current Weight</label>
                  <div className="input-with-unit">
                    <input type="number" placeholder="75" min="30" max="300" step="0.1" value={data.current_weight} onChange={e => update('current_weight', e.target.value)} />
                    <span className="input-unit">kg</span>
                  </div>
                </div>
                <div className="input-group">
                  <label>Goal Weight</label>
                  <div className="input-with-unit">
                    <input type="number" placeholder="70" min="30" max="300" step="0.1" value={data.goal_weight} onChange={e => update('goal_weight', e.target.value)} />
                    <span className="input-unit">kg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <div className="animate-slide-up">
            <h1 className="onboarding-title">Your goals 🎯</h1>
            <p className="onboarding-subtitle">Tell us about your lifestyle</p>

            <div className="onboarding-form" style={{ marginTop: 24 }}>
              <div className="input-group">
                <label>Activity Level</label>
                <div className="radio-group">
                  {ACTIVITY_LEVELS.map(a => (
                    <label key={a.value} className={`radio-option ${data.activity_level === a.value ? 'selected' : ''}`}>
                      <input type="radio" name="activity" value={a.value} checked={data.activity_level === a.value} onChange={e => update('activity_level', e.target.value)} />
                      <div className="radio-option-label">
                        <strong>{a.label}</strong>
                        <span>{a.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label>Fitness Goal</label>
                <div className="radio-group">
                  {FITNESS_GOALS.map(g => (
                    <label key={g.value} className={`radio-option ${data.fitness_goal === g.value ? 'selected' : ''}`}>
                      <input type="radio" name="goal" value={g.value} checked={data.fitness_goal === g.value} onChange={e => update('fitness_goal', e.target.value)} />
                      <div className="radio-option-label">
                        <strong>{g.label}</strong>
                        <span>{g.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && calculated && (
          <div className="animate-slide-up">
            <h1 className="onboarding-title">Your plan is ready! 🚀</h1>
            <p className="onboarding-subtitle">Based on your profile, here's your personalized plan</p>

            <div className="onboarding-summary" style={{ marginTop: 24 }}>
              <h3>📊 Daily Targets</h3>
              <div className="summary-stat">
                <span className="summary-stat-label">BMR (base metabolism)</span>
                <span className="summary-stat-value">{calculated.bmr} kcal</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-label">TDEE (maintenance)</span>
                <span className="summary-stat-value">{calculated.tdee} kcal</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-label">🎯 Calorie Target</span>
                <span className="summary-stat-value lime">{calculated.calories} kcal</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-label">💪 Protein</span>
                <span className="summary-stat-value amber">{calculated.protein}g</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-label">⚡ Carbs</span>
                <span className="summary-stat-value">{calculated.carbs}g</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-label">🥑 Fat</span>
                <span className="summary-stat-value">{calculated.fat}g</span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
              These targets are calculated using the Mifflin-St Jeor equation. You can adjust them anytime in your profile.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="onboarding-nav">
          {step > 0 && (
              <button className="btn btn-secondary" onClick={back} style={{ flex: 1 }}>
              ← Back
              </button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button className="btn btn-primary" onClick={next} style={{ flex: 2 }}>
              Continue →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading ? <><span className="spinner" /> Saving...</> : "Let's Go! 🔥"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
