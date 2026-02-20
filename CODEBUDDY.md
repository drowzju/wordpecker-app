# CODEBUDDY.md

This file provides guidance to CodeBuddy Code when working with code in this repository.

## Project Overview

WordPecker is a language-learning app that combines personalized vocabulary lists with Duolingo-style interactive exercises. It's a monorepo with separate backend (Express.js + TypeScript) and frontend (React + TypeScript) applications.

**Key Features:**
- Smart vocabulary discovery with LLM-generated words by topic and difficulty
- Context-aware word definitions using user-specified contexts
- Interactive learning sessions with 5 question types (multiple choice, fill-in-blank, matching, true/false, sentence completion)
- Word detail pages with examples, similar words, and image generation
- Audio pronunciation via ElevenLabs API
- Multi-language support (learn any language using any language)
- Template library with pre-curated vocabulary lists
- Light reading passages generated from vocabulary lists

## Architecture

### Backend (`backend/`)
- **Framework:** Express.js with TypeScript
- **Database:** MongoDB with Mongoose ODM
- **AI Integration:** OpenAI API (with Qwen provider support via DashScope)
- **Audio:** ElevenLabs API for pronunciation
- **Architecture:** Agent-based LLM system where specialized agents handle different tasks

**Directory Structure:**
- `src/agents/` - Specialized LLM agents (definition, exercise, quiz, vocabulary, reading, image generation, etc.)
- `src/api/` - REST API routes and controllers organized by resource (lists, words, learn, quiz, templates, preferences, audio, vocabulary)
- `src/services/` - Business logic services (audioService, dictionaryService, wordService, AI services)
- `src/config/` - Configuration files (environment, MongoDB, OpenAI, language settings)
- `src/middleware/` - Express middleware (error handling, rate limiting)
- `src/scripts/` - Utility scripts for seeding data (templates, dictionary)
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions

**Key Models (MongoDB/Mongoose):**
- Lists (word collections with context)
- Words (vocabulary items)
- Templates (pre-curated vocabulary lists)
- Preferences (user settings)
- Learn exercises and Quiz data
- Dictionary (offline word definitions)

### Frontend (`frontend/`)
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **UI Library:** Chakra UI with custom theme
- **Animations:** Framer Motion
- **Routing:** React Router v7
- **State Management:** TanStack Query (React Query) for server state
- **Local Storage:** User identification (no authentication required - single user app)

**Directory Structure:**
- `src/pages/` - Page components (Lists, ListDetail, Learn, Quiz, WordDetail, Settings, GetNewWords, WordLearningSession, ReadingPage, TemplateLibrary)
- `src/components/` - Reusable UI components (Header, Footer, Layout, modals, question renderers)
- `src/services/` - API client functions
- `src/types/` - TypeScript interfaces
- `src/theme/` - Chakra UI theme customization
- `src/utils/` - Utility functions
- `src/config/` - Configuration (theme settings)

### Agent-Based LLM Architecture

The backend uses a specialized agent system where each agent handles a specific domain:

**Core Learning Agents:**
- `definition-agent` - Generates context-aware word definitions
- `exercise-agent` - Creates practice exercises (5 question types)
- `quiz-agent` - Generates quiz questions
- `vocabulary-agent` - Discovers new vocabulary by topic and difficulty
- `validation-agent` - Validates user answers
- `reading-agent` - Generates reading passages using vocabulary
- `examples-agent` - Creates example sentences for words
- `similar-words-agent` - Finds synonyms and related words

**Image Agents:**
- `image-generation-agent` - Generates images via DALL-E
- `image-analysis-agent` - Analyzes images for context
- `contextual-image-agent` - Creates context-specific images

**Other Agents:**
- `language-validation-agent` - Validates language configurations

Each agent:
- Has its own directory with `index.ts`, `schemas.ts`, and `prompt.md`
- Uses Zod schemas for type-safe input/output validation
- Reads system prompts from markdown files
- Exports a single function (e.g., `getDefinition`, `getExercises`)
- Communicates with OpenAI API via `generativeAIService`

## Common Development Commands

### Root Level
```bash
# Install all dependencies (backend + frontend)
npm install --prefix backend && npm install --prefix frontend

# Run both backend and frontend concurrently
npm run dev
```

### Backend Commands
```bash
cd backend

# Development (with hot reload via nodemon)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Lint TypeScript files
npm run lint

# Run tests
npm test

# Seed database with template vocabulary lists
npm run seed:templates

# Seed database with dictionary data
npm run seed:dictionary
```

### Frontend Commands
```bash
cd frontend

# Development server (Vite with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Docker Commands

**Full Stack (MongoDB + Backend + Frontend):**
```bash
# Start all services with hot reload
docker-compose up --build

# Run in background
docker-compose up -d

# Stop all services
docker-compose down

# Stop and clear database volumes
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
```

**MongoDB Only:**
```bash
# Start only MongoDB in Docker
docker-compose -f docker-compose.mongo.yml up -d

# Then run backend/frontend locally with:
# MONGODB_URL=mongodb://admin:password@localhost:27017/wordpecker?authSource=admin
```

**Docker Startup Script:**
```bash
./scripts/docker-dev.sh
```

## Environment Configuration

### Backend `.env`
Required variables:
```bash
PORT=3000
NODE_ENV=development
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
MONGODB_URL=mongodb://localhost:27017/wordpecker

# Optional
ELEVENLABS_API_KEY=your_key_here  # For audio pronunciation
AI_PROVIDER=openai  # or 'qwen'
DASHSCOPE_API_KEY=your_key_here  # If using Qwen provider
```

### Frontend `.env`
```bash
VITE_API_URL=http://localhost:3000
```

### Docker `.env`
Copy `.env.docker` to `.env` and configure:
```bash
OPENAI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here  # Optional
```

## Database Setup

MongoDB is schemaless - collections are created automatically when the backend starts. No manual database setup required.

**Seeding Data:**
1. `npm run seed:templates` - Loads pre-curated vocabulary lists from `backend/src/assets/templates/`
2. `npm run seed:dictionary` - Loads offline dictionary definitions

**MongoDB Connections:**
- **Local:** `mongodb://localhost:27017/wordpecker`
- **Docker:** `mongodb://admin:password@localhost:27017/wordpecker?authSource=admin`
- **Atlas (Cloud):** `mongodb+srv://username:password@cluster.mongodb.net/wordpecker`

## Key Technical Details

### AI Provider Configuration
The app supports multiple LLM providers:
- **OpenAI (default):** Set `AI_PROVIDER=openai` and `OPENAI_API_KEY`
- **Qwen (via DashScope):** Set `AI_PROVIDER=qwen` and `DASHSCOPE_API_KEY`

Provider configuration happens in `backend/src/app.ts` before imports, setting `process.env.OPENAI_API_KEY` and `process.env.OPENAI_BASE_URL` dynamically.

### Agent Prompt Engineering
Each agent reads system prompts from its `prompt.md` file. These prompts:
- Define the agent's role and responsibilities
- Specify output format (usually JSON with specific schemas)
- Include examples and edge cases
- Are injected as system messages to the LLM

### Audio System
- Uses ElevenLabs API for text-to-speech
- Implements audio caching to reduce API costs
- Cleanup job runs periodically via `node-cron`
- Cache manager in `backend/src/services/cacheManager.ts`

### Dictionary Service
Offline dictionary fallback using Free Dictionary API data. When AI-generated definitions fail or for phonetic pronunciation, the app queries local dictionary data.

### User Identification
Single-user app with no authentication. User identity stored in browser localStorage. Backend generates user IDs on first visit.

### Rate Limiting
OpenAI API routes have rate limiting middleware in `backend/src/middleware/rateLimiter.ts`. Local mode bypasses rate limits.

## Testing

```bash
# Backend tests
cd backend
npm test

# No frontend tests currently configured
```

## Common Development Workflows

### Adding a New Agent
1. Create directory: `backend/src/agents/new-agent/`
2. Add files: `index.ts`, `schemas.ts`, `prompt.md`
3. Define Zod schema for input/output in `schemas.ts`
4. Write agent logic in `index.ts` using `generativeAIService`
5. Export agent function from `backend/src/agents/index.ts`
6. Create API route in `backend/src/api/` if needed
7. Wire route in `backend/src/app.ts`

### Adding a New Question Type
1. Update `ExerciseType` enum in types
2. Add question component in `frontend/src/components/questions/`
3. Export from `frontend/src/components/questions/index.ts`
4. Update `QuestionRenderer.tsx` to handle new type
5. Update `exercise-agent` prompt to generate new question format
6. Update settings page to allow toggling the question type

### Adding a New Page
1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add navigation link in `frontend/src/components/Header.tsx` if needed

## File Paths and Windows Compatibility

When using Bash commands on Windows (Git Bash), always use forward slashes (`/`) instead of backslashes (`\`) in file paths. Backslashes in JSON strings can cause path corruption.

Examples:
- ✅ Correct: `cd d:/code/mywordpecker`
- ❌ Wrong: `cd d:\code\mywordpecker`

## Port Configuration

Default ports:
- Frontend (Vite): `5173`
- Backend API: `3000`
- MongoDB: `27017`

Access points:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- MongoDB (Docker): mongodb://admin:password@localhost:27017

## Production Deployment

The app includes Docker support for development. For production:
1. Build backend: `cd backend && npm run build`
2. Build frontend: `cd frontend && npm run build`
3. Serve backend from `backend/dist/`
4. Serve frontend from `frontend/dist/`
5. Configure environment variables for production
6. Use MongoDB Atlas or managed MongoDB for database

## Additional Notes

- The app is designed as a single-user application with no authentication
- All AI-generated content is context-aware based on list descriptions
- Audio files are cached locally to reduce ElevenLabs API costs
- Images can be AI-generated (DALL-E) or stock photos (Pexels)
- The database automatically handles user preferences for language, difficulty, and exercise types
- Multi-language support allows learning any language using any base language
