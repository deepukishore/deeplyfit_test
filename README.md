# ⚡ Deeply Fit

> Your intelligent fitness companion — built with React, FastAPI, MySQL & Gemini AI

![Deeply Fit](https://img.shields.io/badge/DeeplyFit-AI-c8f135?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql)
![Expo](https://img.shields.io/badge/Expo-51.0-000020?style=for-the-badge&logo=expo)

---

## 📋 Features

- 🔐 **JWT Authentication** — Register, login, forgot/reset password
- 🧙 **Smart Onboarding** — BMR/TDEE/Macro auto-calculation (Mifflin-St Jeor)
- 🏠 **Home Dashboard** — Calorie summary, macro pie chart, water tracker, workout suggestions
- 📔 **AI Food Diary** — Log meals by category with AI-powered food scanning
- 🔍 **AI Food Scanner** — Photograph food → Gemini AI detects nutrition → auto-logs
- 🤖 **AI Assistant** — Chat with an AI fitness coach powered by Gemini
- 📈 **Progress Analytics** — Weight trend chart, weekly calorie area chart, workout streak calendar
- 🏆 **Achievements** — Unlock badges for fitness milestones
- 🍽️ **Meal Plans & Templates** — Save and reuse custom meal templates
- ⚠️ **Allergen Tracker** — Set food allergens, get warnings before logging
- 👥 **Community** — Social feed, challenges, leaderboard, public profiles
- 👤 **Profile** — Edit goals, dark mode toggle, macro targets
- 📴 **Offline Support** — Offline banner + local diary storage fallback
- 🔄 **Pull-to-Refresh** — Native-feel refresh on all pages
- 🌙 **Dark/Light Mode** — Full theme switching
- 📱 **React Native Mobile App** — Full Expo mobile app (iOS & Android)

---

## 🛠️ Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Web Frontend | React 18.2, Recharts, react-hot-toast, react-router-dom |
| Mobile App   | React Native 0.74, Expo 51, Victory Native              |
| Styling      | Pure CSS3 (CSS Variables, Flexbox, Grid)                |
| Backend      | Python FastAPI 0.115                                    |
| ORM          | SQLAlchemy 2.0                                          |
| Database     | MySQL 8.0                                               |
| Auth         | JWT (python-jose + bcrypt), SMTP password reset         |
| AI           | Google Gemini 2.5 Flash                                 |
| Nutrition    | Open Food Facts API integration                         |

---

## 📁 Project Structure

```
deeplyfit/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── database.py              # SQLAlchemy engine & session
│   ├── models.py                # Database models
│   ├── schemas.py               # Pydantic schemas
│   ├── migrate.py               # DB migration runner
│   ├── requirements.txt
│   ├── .env                     # Environment variables
│   ├── auth/
│   │   └── jwt.py               # JWT helpers
│   ├── routes/
│   │   ├── auth.py              # /auth endpoints (login, register, reset)
│   │   ├── users.py             # /users endpoints + allergens
│   │   ├── food_logs.py         # /food endpoints + allergen check
│   │   ├── workouts.py          # /workouts + streak & calendar
│   │   ├── water_logs.py        # /water endpoints
│   │   ├── weight_logs.py       # /weight endpoints
│   │   ├── meal_templates.py    # /meal-templates endpoints
│   │   ├── meal_plans.py        # /meal-plans endpoints
│   │   ├── achievements.py      # /achievements endpoints
│   │   ├── ai_chat.py           # /ai-chat endpoints
│   │   └── community.py         # /community endpoints
│   ├── ai/
│   │   ├── gemini_food.py       # Gemini Vision food analysis
│   │   └── meal_suggestions.py  # AI meal suggestion logic
│   └── utils/
│       ├── allergens.py         # Allergen detection & mapping
│       ├── achievements.py      # Achievement unlock logic
│       ├── community.py         # Community helpers
│       ├── nutrition.py         # Nutrition calculation helpers
│       ├── open_food_facts.py   # Open Food Facts API client
│       ├── profile.py           # Profile utilities
│       └── workout_library.py   # Workout library data
│
├── frontend/                    # React web app
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── App.js
│       ├── index.js
│       ├── context/
│       │   ├── AuthContext.js
│       │   ├── NetworkContext.js
│       │   └── RefreshContext.js
│       ├── pages/
│       │   ├── Login.js
│       │   ├── ForgotPassword.js
│       │   ├── ResetPassword.js
│       │   ├── Onboarding.js
│       │   ├── Home.js
│       │   ├── Diary.js
│       │   ├── Progress.js
│       │   ├── Community.js
│       │   ├── PublicProfile.js
│       │   ├── AIAssistant.js
│       │   └── Profile.js
│       ├── components/
│       │   ├── BottomNav.js
│       │   ├── FoodScannerModal.js
│       │   ├── WorkoutPlannerModal.js
│       │   ├── WorkoutStreakCalendar.js
│       │   ├── AllergenSettingsModal.js
│       │   ├── AllergenWarningModal.js
│       │   ├── OfflineBanner.js
│       │   └── PullToRefreshShell.js
│       ├── styles/
│       │   ├── global.css
│       │   ├── auth.css
│       │   ├── dashboard.css
│       │   ├── scanner.css
│       │   ├── assistant.css
│       │   ├── bottomNav.css
│       │   └── animations.css
│       └── utils/
│           ├── api.js
│           ├── fitness.js
│           ├── diaryStorage.js
│           └── image.js
│
└── mobile/                      # React Native / Expo app
    ├── app.json
    ├── index.js
    ├── babel.config.js
    ├── package.json
    └── src/
        ├── navigation/AppNavigator.js
        ├── context/
        ├── pages/
        ├── components/
        └── utils/
```

---

## 🚀 Step-by-Step Startup Guide

### Prerequisites

Make sure these are installed before starting:

| Tool    | Version | Download                         |
| ------- | ------- | -------------------------------- |
| Python  | 3.10+   | https://python.org               |
| Node.js | 18+     | https://nodejs.org               |
| MySQL   | 8.0+    | https://dev.mysql.com/downloads/ |
| Git     | any     | https://git-scm.com              |

---

### Step 1 — Set Up the Database

Open **MySQL Workbench** or the MySQL CLI and run:

```sql
CREATE DATABASE fittrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### Step 2 — Configure Environment Variables

Edit `backend/.env` with your credentials:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/fittrack
SECRET_KEY=your-secret-key-change-this-in-production
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_VISION_MODEL=gemini-2.5-flash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
PREMIUM_ADMIN_KEY=choose_a_private_admin_key
```

> **Get a free Gemini API key:** https://makersuite.google.com/app/apikey
> Without a Gemini key, AI chat and food scanning return a clear configuration error instead of mock data.
> For SMTP (password reset emails), generate a Gmail App Password at: https://myaccount.google.com/apppasswords

---

### Step 3 — Install Backend Dependencies

Open a terminal in the project root:

```bash
cd backend
pip install -r requirements.txt
```

---

### Step 4 — Run Database Migrations

```bash
cd backend
python migrate.py
```

This applies all schema migrations (including allergens column, etc.).

---

### Step 5 — Start the Backend Server

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

- API runs at: **http://<your-computer-ip></your>:8080**
- Interactive API docs: **http://<your-computer-ip></your>:8080/docs**
- Health check: **http://<your-computer-ip></your>:8080/health**

---

### Step 6 — Install Frontend Dependencies

Open a **new terminal**:

```bash
cd frontend
npm install
```

---

### Step 7 — Start the Frontend (Web App)

```bash
cd frontend
npm start
```

Web app opens at: **http://localhost:3000**

---

### Step 8 (Optional) — Start the Mobile App

Open a **third terminal**:

```bash
cd mobile
npm install
npm start
```

- Scan the QR code with the **Expo Go** app on your phone
- Or press `a` for Android emulator / `i` for iOS simulator

---

### Quick Start (All-in-One Script)

Alternatively, run the setup script from the project root:

```bash
setup.bat
```

---

## 🔌 API Endpoints

### Auth

| Method | Endpoint                  | Description               |
| ------ | ------------------------- | ------------------------- |
| POST   | `/auth/register`        | Register new user         |
| POST   | `/auth/login`           | Login & get JWT           |
| GET    | `/auth/me`              | Get current user          |
| POST   | `/auth/forgot-password` | Send reset email          |
| POST   | `/auth/reset-password`  | Reset password with token |

### Users & Allergens

| Method | Endpoint              | Description           |
| ------ | --------------------- | --------------------- |
| POST   | `/users/onboarding` | Complete onboarding   |
| PUT    | `/users/profile`    | Update profile        |
| GET    | `/users/allergens`  | Get user allergens    |
| PUT    | `/users/allergens`  | Update user allergens |

### Food & Nutrition

| Method | Endpoint                  | Description              |
| ------ | ------------------------- | ------------------------ |
| POST   | `/food/log`             | Log food entry           |
| GET    | `/food/logs/{date}`     | Get food logs for date   |
| DELETE | `/food/log/{id}`        | Delete food log          |
| GET    | `/food/summary/{date}`  | Get daily summary        |
| GET    | `/food/weekly-summary`  | Get 7-day summary        |
| POST   | `/food/scan`            | AI food scan & log       |
| POST   | `/food/check-allergens` | Check food for allergens |

### Workouts

| Method | Endpoint                  | Description                 |
| ------ | ------------------------- | --------------------------- |
| POST   | `/workouts/log`         | Log workout                 |
| GET    | `/workouts/logs/{date}` | Get workouts for date       |
| DELETE | `/workouts/log/{id}`    | Delete workout              |
| GET    | `/workouts/streak`      | Get current & best streak   |
| GET    | `/workouts/calendar`    | Get 90-day workout calendar |

### Water & Weight

| Method | Endpoint              | Description        |
| ------ | --------------------- | ------------------ |
| POST   | `/water/add-glass`  | Add water glass    |
| POST   | `/water/log`        | Set water for day  |
| GET    | `/water/log/{date}` | Get water for date |
| POST   | `/weight/log`       | Log weight         |
| GET    | `/weight/logs`      | Get weight history |

### Meal Templates & Plans

| Method | Endpoint                 | Description         |
| ------ | ------------------------ | ------------------- |
| GET    | `/meal-templates`      | Get saved templates |
| POST   | `/meal-templates`      | Save meal template  |
| DELETE | `/meal-templates/{id}` | Delete template     |
| GET    | `/meal-plans`          | Get meal plans      |
| POST   | `/meal-plans`          | Create meal plan    |

### Achievements & AI

| Method | Endpoint          | Description            |
| ------ | ----------------- | ---------------------- |
| GET    | `/achievements` | Get user achievements  |
| POST   | `/ai-chat`      | Chat with AI assistant |

### Community

| Method | Endpoint                    | Description        |
| ------ | --------------------------- | ------------------ |
| GET    | `/community/feed`         | Get social feed    |
| POST   | `/community/post`         | Create post        |
| POST   | `/community/like/{id}`    | Like a post        |
| GET    | `/community/leaderboard`  | Get leaderboard    |
| GET    | `/community/profile/{id}` | Get public profile |

---

## 🤖 AI Food Scanner

The scanner uses **Google Gemini 2.5 Flash** vision model by default:

1. User photographs food or uploads an image
2. Image converted to Base64
3. POST to `/food/scan` with base64 + meal_type + date
4. Backend sends to Gemini with strict JSON prompt
5. Gemini returns `{ name, calories, protein, carbs, fat }`
6. Entry auto-saved to database
7. Toast notification shown

**Without Gemini API key:** Food scanning is unavailable and the backend returns a setup error.

---

## ⚠️ Allergen Tracker

Supported allergens: `gluten`, `lactose`, `nuts`, `peanuts`, `eggs`, `soy`, `shellfish`, `fish`, `sesame`, `mustard`

- Set your allergens in Profile → Allergen Settings
- When logging food, the app automatically checks for allergens
- A warning modal appears if a match is found — you can log anyway or cancel

---

## 🏆 Workout Streak Calendar

- GitHub-style 90-day calendar on the Progress page
- Color intensity: gray (0 workouts) → light green (1) → lime (2) → forest green (3+)
- Displays current streak and personal best streak

---

## 🎨 Design System

- **Font:** Syne (display) + DM Sans (body)
- **Theme:** Dark luxury — obsidian + electric lime + warm amber
- **Primary accent:** `#c8f135` (electric lime)
- **Secondary:** `#f5a623` (warm amber)
- **Mobile-first:** max-width 420px

---

## 🔒 Security Notes

- Change `SECRET_KEY` in `.env` before deploying
- Use environment variables for all secrets — never commit `.env`
- JWT tokens expire after 7 days
- Passwords hashed with bcrypt
- SMTP credentials use Gmail App Passwords (not your main password)

---

## 💎 Premium / PRO System

### Pricing

| Plan    | Price   | Billed                    |
| ------- | ------- | ------------------------- |
| Monthly | ₹99    | Every month               |
| Annual  | ₹1,000 | Once a year (saves ₹188) |

### Payment

- Pay via UPI to: **deepu004.dk-4@okaxis**
- Open GPay / PhonePe / Paytm → send the amount → copy the transaction ID
- Enter the transaction ID in the app → request goes to pending verification
- Approve verified payments with `POST /users/premium/approve` using `PREMIUM_ADMIN_KEY`

### PRO Features

| Feature           | Free     | PRO                                  |
| ----------------- | -------- | ------------------------------------ |
| AI Food Scans     | 3/day    | ♾️ Unlimited                       |
| AI Coach Messages | 10/day   | ♾️ Unlimited                       |
| AI Coach Memory   | None     | 30 days                              |
| Weekly AI Report  | ❌       | ✅ Every Monday                      |
| Analytics History | 7 days   | 90 days                              |
| Macro Protocols   | Standard | 8 protocols (Keto, Vegan, Athlete…) |
| Calorie Heatmap   | ❌       | ✅                                   |
| Micronutrients    | ❌       | ✅ Full tracking                     |
| Meal Prep Planner | ❌       | ✅ + Shopping list                   |
| IF Fasting Timer  | ❌       | ✅ All protocols                     |
| Progress Photos   | ❌       | ✅ + Timeline                        |
| Body Measurements | ❌       | ✅ + Charts                          |
| Export Reports    | ❌       | ✅ PDF + CSV                         |
| PRO Badges        | ❌       | ✅ 10 exclusive                      |
| PRO Profile Badge | ❌       | ✅ Gold border                       |

### Implementation Files

| File                                            | Purpose                                            |
| ----------------------------------------------- | -------------------------------------------------- |
| `frontend/src/utils/premium.js`               | isPro(), scan/chat counters, local cleanup helpers |
| `frontend/src/components/PremiumModal.js`     | Plan selection + UPI payment flow                  |
| `frontend/src/pages/Profile.js`               | Get PRO button, PRO badge, gold avatar             |
| `frontend/src/components/FoodScannerModal.js` | 3-scan/day gate                                    |
| `frontend/src/pages/AIAssistant.js`           | 10-message/day gate                                |

---

## 🐛 Troubleshooting

| Problem                           | Fix                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `Access denied for user 'root'` | Check`DATABASE_URL` password in `.env`                                          |
| `ModuleNotFoundError`           | Run`pip install -r requirements.txt` again                                        |
| Frontend can't reach backend      | Ensure backend is running on port`8080`                                           |
| Gemini AI is unavailable          | Add a valid`GEMINI_API_KEY` and use `GEMINI_MODEL=gemini-2.5-flash` in `.env` |
| Mobile app can't connect          | Set`EXPO_PUBLIC_API_URL` to your backend URL, e.g. `http://192.168.1.10:8080`   |
| `migrate.py` fails              | Ensure the`fittrack` database exists in MySQL first                               |
| PRO not activating                | Verify the payment manually and approve it with`POST /users/premium/approve`      |

---

## 📄 License

MIT © Deeply Fit 2026
