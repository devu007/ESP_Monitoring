# ESP Predictive Maintenance Platform

A production-grade platform for monitoring Electrical Submersible Pump (ESP) performance and predicting failures using historical time-series data.

## Architecture

```
Next.js Frontend (port 3000)
        |
Node.js/Express Backend (port 4000)
        |
PostgreSQL Database (port 5432)

Node.js Backend --> Python FastAPI ML Service (port 8000)
```

## Prerequisites

- Node.js >= 18
- Python >= 3.10
- PostgreSQL 16 (or Docker)
- npm

## Quick Start

### 1. Start PostgreSQL

Using Docker (recommended):

```bash
docker-compose up -d
```

Or connect to an existing PostgreSQL instance and update the `DATABASE_URL` in `backend/.env`.

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Run database migration
npx prisma migrate dev --name init

# Start the development server
npm run dev
```

The backend API will be running at `http://localhost:4000`.

Test the health endpoint:
```bash
curl http://localhost:4000/api/health
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be running at `http://localhost:3000`.

### 4. ML Service Setup (Phase 2+)

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt

# Start the service
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

Copy `.env.example` to the appropriate locations:

- `backend/.env` - Backend configuration
- `frontend/.env.local` - Frontend configuration

## API Endpoints (Phase 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/fields | Create field |
| GET | /api/fields | List user's fields |
| GET | /api/fields/:id | Get field details |
| PUT | /api/fields/:id | Update field |
| DELETE | /api/fields/:id | Delete field |
| POST | /api/wells | Create well |
| GET | /api/wells | List user's wells |
| GET | /api/wells/:id | Get well details |
| PUT | /api/wells/:id | Update well |
| DELETE | /api/wells/:id | Delete well |
| GET | /api/wells/dashboard/summary | Dashboard summary |
| POST | /api/wells/:wellId/esp | Create ESP config |
| PUT | /api/wells/:wellId/esp | Update ESP config |
| GET | /api/wells/:wellId/esp | Get ESP config |

## Project Structure

```
ESP_Monitoring/
├── frontend/          # Next.js + TypeScript + Tailwind
├── backend/           # Node.js + Express + Prisma
├── ml-service/        # Python + FastAPI (Phase 2+)
├── docker-compose.yml # PostgreSQL
└── README.md
```

## Development Phases

- **Phase 1** (Current): Foundation - Auth, Fields, Wells, ESP Config
- **Phase 2**: Data Ingestion - CSV upload, validation, sensor readings
- **Phase 3**: ML Service - Derived metrics, health score, rule engine, anomaly detection
- **Phase 4**: Dashboard - Charts, visualizations, predictions display
- **Phase 5**: Polish - Tests, logging, Docker, documentation
