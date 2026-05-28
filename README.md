# VedaAI — AI-Powered Exam Generation Platform

**VedaAI** is a full-stack teacher portal that lets educators generate structured exam papers using AI. Teachers configure question types, upload study material (PDF/image), and receive a fully formatted, section-wise question paper with answers — all generated in the background and delivered in real-time.

🔗 **Live:** [veda-ai.ashuttosh.me](https://veda-ai.ashuttosh.me/)

---

## Features

- **AI Exam Generation** — Generates section-wise question papers (MCQ, short answer, long answer, etc.) with difficulty tags and answer keys using Groq (OpenAI-compatible LLM)
- **Upload Study Material** — Accepts PDF or images; extracts text via `pdf-ts` and Tesseract.js OCR to use as question context
- **Background Job Queue** — Generation runs asynchronously via BullMQ + Redis so the teacher isn't blocked
- **Real-time Status Updates** — Socket.IO pushes live progress (PENDING → PROCESSING → COMPLETED/FAILED) to the frontend
- **PDF Export** — Download the generated paper as a formatted PDF via Puppeteer
- **Cloud Storage** — Generated PDFs uploaded to Cloudinary
- **Auth** — JWT-based authentication with protected routes
- **Dashboard** — View all assignments, regenerate failed ones, delete, and manage your library

---

## Tech Stack

### Frontend (`apps/frontend`)
| | |
|---|---|
| Framework | Next.js 16 + React 19 |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Real-time | Socket.IO Client |
| HTTP | Axios |
| UI | Lucide React, React Hot Toast |

### Backend (`apps/backend`)
| | |
|---|---|
| Runtime | Bun + Express 5 |
| Database | MongoDB (Mongoose) |
| Queue | BullMQ + Redis (ioredis) |
| AI | Groq API (OpenAI-compatible) |
| OCR | Tesseract.js |
| PDF Parse | pdf-ts |
| PDF Generate | Puppeteer |
| Storage | Cloudinary |
| Auth | JWT + bcrypt |
| Real-time | Socket.IO |

### Monorepo
| | |
|---|---|
| Tooling | Turborepo + Bun workspaces |
| Shared Packages | `@repo/ui`, `@repo/eslint-config`, `@repo/typescript-config` |
| CI/CD | GitHub Actions (separate workflows for frontend & backend) |
| Containers | Dockerfiles for both apps |

---

## Project Structure

```
VedaAi_Assignment/
├── apps/
│   ├── frontend/                  # Next.js teacher portal
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   │   ├── assignments/   # List & view assignments
│   │   │   │   ├── create/        # Create new exam
│   │   │   │   ├── library/       # Saved papers
│   │   │   │   ├── groups/        # Class groups
│   │   │   │   ├── toolkit/       # Tools
│   │   │   │   └── settings/      # User settings
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── components/
│   │   │   ├── layout/            # Sidebar, header, mobile nav
│   │   │   └── shared/            # Reusable UI components
│   │   ├── services/              # API call wrappers
│   │   ├── store/                 # Zustand stores (auth, assignment, notifications)
│   │   ├── hooks/                 # useSocket
│   │   └── types/
│   │
│   └── backend/                   # Bun + Express API
│       ├── controllers/           # auth, assignment logic
│       ├── models/                # Mongoose schemas
│       ├── routes/                # /api/auth, /api/assignments
│       ├── middlewares/           # JWT auth, socket auth, multer upload
│       ├── services/              # llm.service.ts (Groq + OCR)
│       ├── queues/                # BullMQ queue definitions
│       ├── workers/               # generation.worker, pdf.worker
│       ├── sockets/               # Socket.IO setup & update events
│       └── config/                # MongoDB, Redis, Cloudinary
│
├── packages/
│   ├── ui/                        # Shared React component library
│   ├── eslint-config/
│   └── typescript-config/
│
├── dockerfiles/                   # Dockerfile.backend, Dockerfile.frontend
├── .github/workflows/             # CI for frontend & backend
├── turbo.json
└── package.json
```

---

## How It Works

```
Teacher fills form → POST /api/assignments/create
        ↓
Assignment saved in MongoDB (status: PENDING)
        ↓
Job pushed to BullMQ "assignment-generation" queue
        ↓
Worker picks up job → calls Groq LLM (with optional OCR'd material)
        ↓
Socket.IO emits real-time status to frontend room
        ↓
Generated paper saved to DB (status: COMPLETED)
        ↓
Optional: PDF worker generates & uploads PDF to Cloudinary
```

---

## Local Setup

**Prerequisites:** [Bun](https://bun.sh/) ≥ 1.3, Node ≥ 18, MongoDB, Redis

```bash
git clone https://github.com/Aa5hut0sh/VedaAi_Assignment.git
cd VedaAi_Assignment
bun install
```

**Backend** — create `apps/backend/.env`:
```env
PORT=3001
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=your_groq_api_key
REDIS_URL=your_redis_url
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

**Frontend** — create `apps/frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```bash
# Run everything
bun run dev

# Or individually
bun exec turbo dev --filter=frontend
bun exec turbo dev --filter=backend
```

**Build:**
```bash
bun run build
```

**Docker:**
```bash
docker build -f dockerfiles/dockerfile.backend -t vedaai-backend .
docker build -f dockerfiles/dockerfile.frontend -t vedaai-frontend .
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register teacher |
| POST | `/api/auth/login` | Login |
| POST | `/api/assignments/create` | Create & queue exam generation |
| GET | `/api/assignments/all` | Get teacher's assignments |
| GET | `/api/assignments/:id` | Get single assignment |
| POST | `/api/assignments/:id/regenerate` | Retry failed generation |
| GET | `/api/assignments/:id/download` | Download as PDF |
| DELETE | `/api/assignments/:id` | Delete assignment |

---

Made by [Ashutosh](https://github.com/Aa5hut0sh)