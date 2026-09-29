# Rainfall Intelligence Platform (SIH26080)
### Regime-Aware Rainfall Forecast Intelligence & Post-Processing Platform
**Smart India Hackathon Problem Statement: SIH26080**  
*Full Suite: Live Meteorological NWP + ISRO Satellite Integration + ML Regime Bias-Correction + Groq AI Assistant*  
*Repository: [https://github.com/saianand167/weather.git](https://github.com/saianand167/weather.git)*

---

## 1. Project Overview & Problem Statement

Standard Numerical Weather Prediction (NWP) models (e.g., ECMWF IFS, GFS, ICON) suffer from systematic, localized forecast errors across India's complex terrain and seasonal regimes:
- **Active Monsoon:** Heavy synoptic moisture convergence along the monsoon trough.
- **Break Monsoon:** Precipitation shifting northward to Himalayan foothills while peninsular India faces dry spells.
- **Monsoon Lows / Depressions:** Severe, mesoscale vortex convective downpours.
- **Orographic Rainfall:** Topographical windward amplification and rain shadows across Western Ghats and Northeast India.
- **Coastal Rainfall:** Maritime boundary layer diurnal breeze squalls.
- **Western Disturbances:** Non-monsoonal mid-latitude frontal waves across Northern/Northwestern India.

**The Rainfall Intelligence Platform** integrates real-time live NWP data, ISRO MOSDAC satellite Earth observations (INSAT-3DR, OceanSat-3), machine learning regime classification & post-processing bias correction, and a Groq-powered meteorological reasoning assistant.

---

## 2. Key Architecture & Features

### Part 1: Live Meteorological Data Layer
- **100% Live NWP Forecasts:** Automated queries to Open-Meteo (ECMWF/GFS/ICON) with transparent error handling.
- **ISRO MOSDAC Satellite Ingestion:** Interface for ISRO Earth Observation satellites (INSAT-3DR Imager/Sounder, OceanSat-3 EOS-06 Sea Surface Temperature, SCATSAT-1 scatterometer wind vectors).
- **Verified Administrative Registry:** 164+ Indian districts across all States and UTs with coordinates and elevation.
- **Interactive Geospatial Dashboard:** Leaflet-powered maps, real-time gauges, and multi-day meteorological charts.

### Part 2: AI/ML Regime Classification & Bias-Correction
- **Synoptic Weather Regime Classification:** Random Forest and synoptic physics classifier categorizing 6 meteorological regimes with confidence scores.
- **Regime-Specific ML Bias Correction:** Mathematical calibration reducing systematic NWP underprediction and overprediction.
- **Heavy Rainfall Exceedance Probability:** Quantitative risk index with threshold alert triggers (Moderate, High, Very High).
- **Verification Scorecard & Error Analysis:** Comprehensive meteorological metrics (RMSE, MAE, Bias, CSI, ETS, POD, FAR, FSS).
- **Historical Event Replay:** Canonical historical weather extremes (e.g., Mumbai Floods, Cyclone Biparjoy, Chennai Floods, Wayanad Landslides).

### Part 3: Meteorological AI Assistant
- **Groq Llama-3.3-70B AI Reasoning:** High-speed LLM providing contextual meteorological insights, safety warnings, and synoptic explanations.

---

## 3. Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Leaflet, Recharts, Lucide Icons.
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy ORM, Pydantic v2, httpx, Scikit-Learn, NumPy, Groq SDK.
- **Database:** PostgreSQL (Neon / Render) + SQLite local fallback.
- **Deployment:** Render (FastAPI Backend + Static Site), Vercel (Edge React Frontend + Serverless Python).

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Application Environment
ENVIRONMENT=production
APP_NAME="Rainfall Intelligence"
APP_SUBTITLE="Regime-Aware Rainfall Forecast Intelligence Platform"
SIH_PROBLEM_CODE=SIH26080

# Database Configuration (PostgreSQL Neon or SQLite)
DATABASE_URL=postgresql://neondb_owner:npg_vSt3uDP4XrAE@ep-calm-sky-a5x9j74q-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# ISRO MOSDAC Satellite Credentials
MOSDAC_USERNAME=saianand1
MOSDAC_PASSWORD=Sai@1431

# AI Assistant (Groq Llama-3.3-70B)
GROQ_API_KEY=your_groq_api_key_here
LLM_API_KEY=your_groq_api_key_here
LLM_MODEL=llama-3.3-70b-versatile
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_PROVIDER=groq

# CORS
CORS_ORIGINS=*
```

---

## 5. Local Setup & Execution

### Backend:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Interactive API docs available at `http://127.0.0.1:8000/docs`.

### Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### Run Automated Test Suite:
```bash
python -m pytest tests/
```

---

## 6. Cloud Deployment Instructions

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step guides on deploying to Render, Vercel, and Docker.
