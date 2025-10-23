
# Bakhmaro AI Microservice

🤖 **Standalone AI service for the Bakhmaro booking platform**

## Overview

This is a fully independent AI microservice that handles all AI-related functionality for the Bakhmaro platform, including:

- 💬 AI Chat (`/api/ai/chat`)
- 🌊 Streaming responses (`/api/ai/stream`)
- 🏥 Health monitoring (`/api/ai/health`, `/api/ai/status`)
- 🧠 Memory management
- 🔍 Code analysis and RAG
- 📊 Performance monitoring

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Groq API key and other settings
```

3. **Start the service:**
```bash
npm start
# or for development:
npm run dev
```

The AI service will be available at: `http://0.0.0.0:5001`

## API Endpoints

- `GET /health` - Service health check
- `GET /api/ai/health` - AI system health
- `GET /api/ai/status` - Groq API status
- `POST /api/ai/chat` - Main chat endpoint
- `POST /api/ai/stream` - Streaming chat
- `GET /api/ai/resources` - Resource monitoring

## Environment Variables

The `.env.example` file documents every supported option. Highlights for local setup are grouped below:

### Port & runtime toggles

```bash
AI_PORT=5001                 # Express entrypoint
AI_SERVICE_PORT=5001         # Mirrors AI_PORT for legacy clients
DISABLE_FILE_WATCHERS=false  # Skip filesystem monitors when true
AI_OFFLINE_MODE=false        # Force Groq/OpenAI traffic off when true
DEBUG_MODE=true              # Enable verbose diagnostics locally
```

### Codex + Slack

```bash
CODEX_SLACK_ENABLED=true     # Enable auto-improvement worker
CODEX_TIMEOUT_MS=35000       # Max Codex call duration
CODEX_MAX_TOKENS=1024        # Token ceiling for completions
CODEX_MODEL=gpt-5-codex      # Default model identifier
SLACK_SIGNING_SECRET=whsec_x # Required for slash commands
CODEX_SLACK_CHANNEL=#dev-ai  # Where Codex status posts land
```

### Backup & OpenAI fallback

```bash
FORCE_OPENAI_BACKUP=false        # Always use OpenAI fallback service
OPENAI_FALLBACK_KEY=sk-backup    # Backup API key
OPENAI_FALLBACK_MODEL=gpt-4o-mini
OPENAI_FALLBACK_MAX_TOKENS=800
OPENAI_FALLBACK_TEMPERATURE=0.7
```

### Groq routing

```bash
GROQ_API_KEY=your_key_here       # Primary Groq credential
GROQ_SMALL_MODEL=llama-3.1-8b-instant
GROQ_LARGE_MODEL=llama-3.3-70b-versatile
GROQ_LARGE_MODEL_THRESHOLD=220   # Character cutoff for large model
GROQ_FORCE_MODEL=                # Override to pin a single model
GROQ_FALLBACK_MODE=false         # Trigger safe-mode heuristics
```

### Firebase & credentials

```bash
FIREBASE_CONFIG={...}                                   # Client app config JSON
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json # Service account path
```

### Memory controls

```bash
AI_MEMORY_ENABLED=true                           # Toggle persistent memory
MEMORY_STORAGE_PATH=./memory_data                # Primary storage directory
MEMORY_FACTS_PATH=./memory_facts                 # Fast-lookup knowledge base
USER_MEMORY_ENCRYPTION_KEY=fallback-user-memory-key # Encrypt per-user payloads
```

### Debug instrumentation

```bash
GURULO_DEBUG_MODE=false      # Enables transparent-thought prompts
VERBOSE_PERFORMANCE_LOGS=false # Increase for deep profiling
```

## Architecture

```
ai-service/
├── server.js                 # Main Express server
├── controllers/
│   └── ai_controller.js      # AI request handling
├── services/
│   ├── groq_service.js       # Groq API integration
│   ├── memory_controller.js  # Memory management
│   ├── prompt_manager.js     # Prompt optimization
│   └── ...                   # Other AI services
├── utils/
│   └── enhanced_georgian_validator.js
├── routes/
│   └── memory_*.js           # Memory routes
└── memory_data/              # User memory storage
```

## Testing

```bash
npm test
# or run specific tests:
node test_ai_comprehensive.js
```

## Integration

The main backend proxies AI requests to this microservice:
- Main Backend: `http://0.0.0.0:5002`
- AI Microservice: `http://0.0.0.0:5001`
- Frontend: `http://0.0.0.0:3000`

## Production Deployment

On Replit, this service can be deployed independently or as part of the full stack using the provided workflows.
