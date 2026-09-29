# Deployment Guide — Rainfall Intelligence Platform (SIH26080)

This repository (`https://github.com/saianand167/weather.git`) is configured for one-click deployment across **Render.com**, **Vercel**, and **Docker**.

---

## Architecture Overview

| Component | Technology | Primary Host | Fallback / Alternative |
|---|---|---|---|
| **Backend API** | FastAPI + Python 3.11+ | **Render** (Web Service) | Vercel Serverless (`api/index.py`) |
| **Frontend UI** | React 19 + Vite + Tailwind | **Vercel** (Global Edge CDN) | Render (Static Site) |
| **Database** | PostgreSQL (Neon) / SQLite | **Neon Serverless PostgreSQL** | SQLite (Local Dev) |
| **Satellite Stream** | ISRO MOSDAC Integration | Ingestion Connector | Auto-Auth / Telemetry |
| **AI LLM** | Groq Llama-3.3-70B | Groq Cloud API | OpenAI / Compatible |

---

## 🚀 Option 1: Deploy Backend on Render + Frontend on Vercel (Recommended)

This gives you the highest performance: Render keeps the FastAPI Python process alive, while Vercel delivers the React frontend at global edge speeds.

### Step 1: Deploy Backend on Render

1. Go to [https://render.com](https://render.com) and log in with your GitHub account.
2. Click **New +** → **Web Service**.
3. Select your repository: `saianand167/weather`.
4. Configure the settings:
   - **Name**: `rainfall-intelligence-backend`
   - **Region**: Singapore or Frankfurt (close to India)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add the following keys:

| Key | Value | Description |
|---|---|---|
| `ENVIRONMENT` | `production` | Enables production mode |
| `CORS_ORIGINS` | `*` | Permits requests from Vercel & local |
| `DATABASE_URL` | `postgresql://neondb_owner:npg_vSt3uDP4XrAE@ep-calm-sky-a5x9j74q-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | Neon PostgreSQL connection string |
| `GROQ_API_KEY` | `your_groq_api_key_here` | Groq API Key for AI Assistant |
| `LLM_API_KEY` | `your_groq_api_key_here` | Groq / LLM key |
| `LLM_PROVIDER` | `groq` | Provider type |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Ultra-fast high-accuracy model |
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1` | Groq OpenAI-compatible endpoint |
| `MOSDAC_USERNAME` | `saianand1` | ISRO MOSDAC username |
| `MOSDAC_PASSWORD` | `Sai@1431` | ISRO MOSDAC password |

6. Click **Deploy Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://rainfall-intelligence-backend.onrender.com`).

---

### Step 2: Deploy Frontend on Vercel

1. Go to [https://vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** → **Project**.
3. Import the repository `saianand167/weather`.
4. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit → select `frontend` (or leave root as `.` since root `vercel.json` handles monorepo build).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - **`VITE_API_URL`**: `https://<your-render-backend-url>/api` (e.g. `https://rainfall-intelligence-backend.onrender.com/api`)
6. Click **Deploy**.
7. In ~30 seconds, your site will be live at `https://weather-saianand167.vercel.app` (or your assigned Vercel URL)!

---

## ⚡ Option 2: 1-Click Full Blueprint on Render (Both Backend & Frontend)

Render can deploy both backend and frontend automatically using the included `render.yaml`:

1. In Render Dashboard, click **New +** → **Blueprint**.
2. Select repository: `saianand167/weather`.
3. Render will detect `render.yaml` and create:
   - Web Service: `rainfall-intelligence-backend`
   - Static Site: `rainfall-intelligence-frontend`
4. Fill in the prompted secret environment variables (`GROQ_API_KEY`, `DATABASE_URL`, `MOSDAC_USERNAME`, `MOSDAC_PASSWORD`).
5. Click **Apply**.

---

## 🌐 Option 3: Full-Stack Monorepo on Vercel

The repository includes `api/index.py` and `vercel.json` configured for serverless Python + React:
1. In Vercel, import `saianand167/weather` with Root Directory set to `./`.
2. Add Environment Variables:
   - `DATABASE_URL`: your PostgreSQL string
   - `GROQ_API_KEY`: your Groq API key
   - `MOSDAC_USERNAME`: `saianand1`
   - `MOSDAC_PASSWORD`: `Sai@1431`
3. Click **Deploy**.

---

## 🐳 Option 4: Docker Container Deployment

```bash
# Build the Docker image
docker build -t rainfall-intelligence .

# Run container on port 8000
docker run -d -p 8000:8000 \
  -e DATABASE_URL="postgresql://neondb_owner:..." \
  -e GROQ_API_KEY="gsk_..." \
  -e MOSDAC_USERNAME="saianand1" \
  -e MOSDAC_PASSWORD="Sai@1431" \
  rainfall-intelligence
```

---

## Verifying Deployment Health

After deploying, verify the endpoints:
- **Root Info**: `https://<backend-url>/`
- **Swagger Docs**: `https://<backend-url>/docs`
- **Health Check**: `https://<backend-url>/api/health`
- **Live Data Sources & Satellite Stream**: `https://<backend-url>/api/data-sources/status`
- **Regime Classification**: `https://<backend-url>/api/ml/regime/current?district=Chennai&state=Tamil%20Nadu`
