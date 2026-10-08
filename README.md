# LinkVault 🚀

LinkVault is a modern, full-stack smart bookmarking and link organization system. It allows users to store, categorize, health-check, and manage their web links efficiently through a beautiful frontend and a robust set of backend services.

---

## 📁 Repository Structure

The project is divided into three main components:

### 1. `frontend/`
The user interface layer built with pure HTML, CSS, and vanilla JavaScript. 
- **`app/templates/index.html`**: The main dashboard.
- **`app/static/css & js/`**: Global styles following the LinkVault Design System (Navy `#1E3A8A`, sleek interactive components) and frontend logic integrating with the backend REST APIs.
- **`app/static/js/app.js`**: Core client-side architecture handling global state (`appState`), centralized `fetchAPI` layer, dynamic DOM rendering, and interactive modal controllers (including Duplicate Interception, WhatsApp Import Staging, Quick Inbox, and Health Check Triggers).

### 2. `backend/`
The **Core API Server** built with Python, Flask, and SQLAlchemy ORM.
- **Database**: Powered by **Supabase (PostgreSQL)**.
- **Responsibilities**: 
  - Manage Links (CRUD operations, favoriting, tagging, auto-detecting link types).
  - Manage Categories (CRUD operations).
  - Provide dashboard statistics.
- **Run**: `python run.py` (Runs on port `5000` by default).

### 3. `smart-link-organizer/`
A complementary **Microservice API** built with Flask.
- **Database**: SQLite (`linkvault.db`).
- **Responsibilities**:
  - `Import`: Bulk link importing (e.g. WhatsApp chat exports).
  - `Health Check`: Checking the status of saved links (e.g., broken, timeout).
  - `Inbox`: Managing uncategorized or pending links.
- **Run**: `python run.py` (Runs on port `5000` by default — *Note: ensure it doesn't conflict with the main backend port*).

---

## 🚀 Setup & Execution

### Prerequisites
- Python 3.10+
- A Supabase Project (for the `backend`)

### 1. Project Setup
Create a single virtual environment for the whole project at the root (`LinkVault/`) directory:
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate # Mac/Linux

pip install uv  # Optional but much faster!
uv pip install -r requirements.txt
```

### 2. Backend API Core
Navigate to the `backend/` directory:
```bash
cd backend
```

**Configure Environment:**
Create a `.env` file based on `.env.example`:
```env
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=your-random-secret-key
DATABASE_URL=postgresql://postgres.[your-project]:[password]@aws-0-region.pooler.supabase.com:6543/postgres
PORT=5000
CORS_ORIGINS=*
```

**Run Backend:**
```bash
python run.py
```

### 3. Smart Link Organizer Service
Open a new terminal, activate the same root virtual environment, and navigate to the `smart-link-organizer/` directory:
```bash
.venv\Scripts\activate  # Windows
cd smart-link-organizer
python run.py
```

### 4. Frontend UI
Simply open `frontend/app/templates/index.html` in your favorite web browser (or serve it via a simple HTTP server like Live Server in VSCode or `python -m http.server`).

---

## 📡 REST API Quick Reference

### Core Backend (`/api/`)
- `GET /api/health` — Check server status
- `GET /api/categories` — Fetch all categories
- `POST /api/categories` — Create category
- `GET /api/links` — Fetch links (supports filtering by `category_id`, `is_favorite`, `sort`)
- `POST /api/links` — Create link
- `PUT /api/links/<id>` — Update link
- `POST /api/links/check-duplicate` — Check for normalized URL duplication
- `GET /api/links/stats` — Dashboard metrics

### Smart Organizer & Integrations (`/api/`)
- `POST /api/links/<id>/health` — Check single link health
- `POST /api/links/health-check-all` — Validate all link health statuses in background
- `POST /api/import/whatsapp` — Stage WhatsApp chat exports
- `POST /api/import/confirm` — Commit staged imports
- `POST /api/inbox` — Dump raw URLs into inbox
- `POST /api/inbox/organize` — Batch assign categories to inbox URLs

---

## 🤝 Team Integration & Roles
- **Backend & Database (Vijay)**: Managing the Supabase integration and Core REST APIs (`backend/`).
- **Frontend Design (Harini)**: HTML5 Semantic DOM, CSS3 styling, UI layout, and responsive mobile-first design.
- **Frontend JS Integration (Krishnapriya)**: Hooking up vanilla JS with API endpoints, state sync, dynamic DOM rendering, and modal controllers (`frontend/static/js/app.js`).
- **Smart Features & Security (Jaiharini)**: Implementing URL health detection, metadata scraping, short URLs, search, and WhatsApp imports (`smart-link-organizer/`).
