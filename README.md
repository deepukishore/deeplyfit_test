# Deeply Fit

Deeply Fit is a full-stack fitness and nutrition platform with a React web app, an Expo/React Native mobile app, and a FastAPI backend. It combines daily health tracking with Gemini-powered coaching and food analysis.

![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react)
![Expo](https://img.shields.io/badge/Expo-SDK%2056-000020?style=flat-square&logo=expo)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python)

## Features

- JWT registration, login, shared web/mobile accounts, and password-reset OTPs
- Goal-based onboarding with calorie and macro calculations
- Food diary with Indian-food search, barcode lookup, day copying, and allergen checks
- Gemini food-photo analysis, meal suggestions, and an AI fitness coach
- Water, weight, BMI, steps, workouts, streaks, and progress tracking
- Meal templates and weekly meal planning
- Achievements, community posts, comments, challenges, and public profiles
- Free and PRO feature limits with Razorpay subscription support
- Responsive web UI plus an Android/iOS Expo app
- Web diary caching and offline queue support

## Technology

| Area | Stack |
| --- | --- |
| Web | React 18, React Router, Recharts, Three.js, CSS |
| Mobile | Expo SDK 56, React Native 0.85, React Navigation |
| API | FastAPI, Pydantic, SQLAlchemy |
| Database | PostgreSQL in hosted environments; MySQL-compatible local fallback |
| AI and food data | Google Gemini and Open Food Facts |
| Authentication | JWT, bcrypt, Brevo password-reset email |
| Payments | Razorpay subscriptions and webhooks |

## Repository layout

```text
.
|-- backend/              FastAPI application, models, routes, utilities, and tests
|   |-- ai/               Gemini food analysis and meal suggestions
|   |-- auth/             JWT and password helpers
|   |-- routes/           API route modules
|   |-- tests/            Python unit tests
|   `-- utils/            Nutrition, food search, achievements, and shared helpers
|-- frontend/             React web application
|   |-- api/              Vercel serverless helpers
|   |-- public/           Static web assets
|   `-- src/              Pages, components, contexts, styles, and tests
|-- mobile/               Expo/React Native application
|   |-- assets/           Mobile icons and splash assets
|   `-- src/              Navigation, screens, components, hooks, and utilities
`-- setup.bat             Windows installer for backend and web dependencies
```

## Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer and npm
- PostgreSQL or MySQL
- An optional Gemini API key for AI features
- An Expo-compatible Android/iOS environment for mobile development

## Local setup

### 1. Backend

From the repository root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` and add the values needed by your environment:

```dotenv
DATABASE_URL=postgresql://postgres:password@localhost:5432/deeply_fit
SECRET_KEY=replace-with-a-long-random-value
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Optional AI features
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_VISION_MODEL=gemini-2.5-flash

# Optional password-reset email
BREVO_API_KEY=
EMAIL_SENDER=you@example.com
EMAIL_SENDER_NAME=Deeply Fit

# Optional Razorpay subscriptions
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_PLAN_MONTHLY=
RAZORPAY_PLAN_QUARTERLY=
RAZORPAY_PLAN_HALF_YEAR=
RAZORPAY_PLAN_YEARLY=
RAZORPAY_WEBHOOK_SECRET=
```

Start the API:

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8080
```

The backend creates missing tables on startup. API documentation is available at [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs), and the health check is at [http://127.0.0.1:8080/health](http://127.0.0.1:8080/health).

#### MySQL note

For local MySQL, create the database and use a URL such as:

```sql
CREATE DATABASE fittrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```dotenv
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/fittrack
```

Install `PyMySQL` in the backend environment when using this option. The legacy `backend/migrate.py` script contains MySQL-specific migration SQL and should only be run against MySQL.

### 2. Web app

Open another terminal:

```powershell
cd frontend
npm install
npm start
```

The development server runs at [http://localhost:3000](http://localhost:3000) and proxies relative API calls to `http://127.0.0.1:8080`.

To use a different API, create `frontend/.env.local`:

```dotenv
REACT_APP_API_URL=http://127.0.0.1:8080
REACT_APP_API_TIMEOUT_MS=10000
```

### 3. Mobile app

```powershell
cd mobile
npm install
npm start
```

For a physical phone, create `mobile/.env` with the backend's LAN address:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:8080
EXPO_PUBLIC_API_TIMEOUT_MS=10000
EXPO_PUBLIC_USE_TEST_ADS=true
```

Replace `192.168.1.10` with the development computer's LAN IP. Razorpay is a native module, so subscription testing requires a development build rather than Expo Go:

```powershell
npm run android
```

See [mobile/README.md](mobile/README.md) for mobile build details.

### Windows quick setup

`setup.bat` installs the backend and web dependencies. Database configuration and the mobile install remain manual:

```powershell
.\setup.bat
```

## API overview

FastAPI's `/docs` page is the authoritative, interactive endpoint reference. The main route groups are:

| Prefix | Purpose |
| --- | --- |
| `/auth` | Accounts, sessions, and password reset |
| `/users` | Onboarding, profile, allergens, achievements, and premium state |
| `/food` | Food logs, summaries, search, barcodes, suggestions, and scanning |
| `/activity` | Daily step synchronization and history |
| `/water`, `/weight` | Hydration, weight, and BMI history |
| `/workouts` | Workout logging, library, history, streaks, and calendar |
| `/templates/meals`, `/meal-plans` | Reusable meals and weekly plans |
| `/ai` | AI coach chat |
| `/community` | Challenges, posts, likes, and comments |
| `/payments` | Razorpay subscription lifecycle and webhooks |

Most routes require a bearer token returned by `/auth/register` or `/auth/login`.

## Tests and checks

Backend tests:

```powershell
cd backend
python -m unittest discover -s tests -v
```

Web tests and production build:

```powershell
cd frontend
$env:CI='true'; npm test -- --watchAll=false
npm run build
```

Mobile dependency check:

```powershell
cd mobile
npm run doctor
```

## Deployment notes

- The web app includes Vercel rewrites in `frontend/vercel.json`.
- Set `REACT_APP_API_URL` for a hosted web build.
- Set `CORS_ORIGINS` to the exact deployed web origins.
- Production startup requires an explicit `SECRET_KEY`.
- Keep database, Gemini, Brevo, Razorpay, and admin credentials out of version control.
- Configure `EXPO_PUBLIC_API_URL` through the appropriate EAS build profile for mobile releases.

## Additional documentation

- [API_REFERENCE.md](API_REFERENCE.md) - allergen and workout-streak data examples
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - feature integration notes
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - historical implementation summary
