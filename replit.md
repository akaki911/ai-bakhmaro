# Bakhmaro AI Operations Platform

## Overview
This project powers the internal Bakhmaro AI operations workspace. It focuses on Gurulo's developer tooling, observability dashboards, and safeguard automations that keep the multi-service platform resilient. The stack combines a modern frontend, a robust backend, and an advanced AI service with RAG capabilities for live codebase awareness, session management, and compliance-focused assistants. The platform prioritizes security, performance, and a seamless user experience, including full Georgian language support.

> ℹ️ **Note:** ისტორიულად პროექტი Replit-ზე იყო გამართული, თუმცა ახლა სრულად GitHub Actions/Firebase ინფრასტრუქტურაზეა გადაყვანილი.

## User Preferences
- Project uses Georgian language as primary interface
- Clean, modern UI design with Tailwind CSS
- Multi-service architecture with proper separation of concerns
- Production-grade AI capabilities with real codebase awareness

## System Architecture
The platform is built on a multi-service architecture:
-   **Frontend**: React + TypeScript + Vite (Port 5000), using Tailwind CSS for styling.
-   **Backend**: Node.js + Express (Port 5002) handling API requests and authentication.
-   **AI Service**: Node.js microservice (Port 5001) with advanced Retrieval-Augmented Generation (RAG) capabilities for codebase understanding, real-time file monitoring, and intelligent safety switches.
-   **Database**: PostgreSQL (Replit Database) with pgvector extension for semantic search and vector memory.
-   **UI/UX**: Focuses on a clean, modern design with full Georgian language support across all interfaces and error messages.
-   **Technical Implementations**:
    -   **Firebase Integration**: Unified configuration for data persistence (Firestore) and session management (@google-cloud/connect-firestore).
    -   **Proxy Routing**: Vite proxy configured for seamless communication between frontend and backend/AI services, resolving 404 errors.
    -   **Authentication**: Secure endpoint migration and authentication guards for all critical operations.
    -   **Port Management Security**: Industrial-grade port management with cascade failure prevention, advanced security features (SUPER_ADMIN authentication, rate limiting, health probes), and PID-targeted service restarts.
    -   **Autonomous Agent (PROJECT "AUTONOMY")**: Unified RAG system with multi-source context, conversational memory fix for Georgian vague follow-ups, secure terminal control system with command blocking, and an intelligent safety switch for risk-based confirmation.
    -   **Real-time Code Intelligence (PROJECT "PHOENIX")**: ProjectIntelligenceService for real-time file scanning, enhanced context building, and sensitive file exclusion.
    -   **Enhanced File System Monitor**: API endpoints for real-time monitoring, recent changes, project insights, security reports, and complexity analysis.
    -   **Developer Console**: Features include an enhanced file tree with advanced search, a multi-tab terminal system with secure shell execution, and a lightweight code preview system.
    -   **Security Hardening**: Comprehensive prevention of package installation bypasses, destructive command confirmation, and validation of terminal command execution.

## Recent Changes (2025-01-10)

### Phase 1: Git Native Integration - Performance Monitoring ✅
Implemented PostgreSQL-backed Git metrics history storage:
- **Migration**: `001_create_git_metrics_history.sql` creates `git_metrics_history` table with operation type, duration, status, metadata, and timestamp tracking
- **Methods**: 
  - `storeMetricsHistory(operation, duration, status, metadata)` - persists Git operation metrics to PostgreSQL
  - `getRollingAverage(operation, limit)` - calculates rolling averages from last N operations
  - `calculateLatencyReduction()` - async method using PostgreSQL rolling averages (baseline: first 10 operations)
  - `getMetrics()` - enhanced to return both in-memory metrics and database-backed rolling averages
- **Integration**: All Git operations (commit, push, pull) now store metrics history on success and error
- **File**: `ai-service/services/github_integration_service.js`

### Phase 3: Vector Memory & Semantic Search ✅
Implemented self-hosted vector database using PostgreSQL pgvector:

**1. Vector Memory Service** (`ai-service/services/vector_memory_service.js`):
- PostgreSQL pgvector integration with 1536-dimension embeddings (OpenAI ada-002 compatible)
- Methods:
  - `storeEmbedding(text, embedding, metadata, source, userId)` - stores text with vector embedding
  - `findSimilar(queryEmbedding, options)` - cosine similarity search with threshold filtering
  - `deleteEmbedding(id)`, `getEmbedding(id)`, `getStats()` - management methods
- Migration: `002_create_vector_memory.sql` creates `memory_embeddings` table with pgvector VECTOR(1536) type, indexes, and triggers

**2. Embeddings Service** (`ai-service/services/embeddings_service.js`):
- OpenAI embeddings API integration (text-embedding-ada-002 model)
- LRU cache (100 embeddings) for frequently used vectors
- Local fallback using hash-based embeddings when API unavailable
- Batch processing support: `generateBatchEmbeddings(texts)`

**3. Semantic Search Enhancement** (`ai-service/services/semantic_search_service.js`):
- Primary method: `searchVector(query, options)` - uses pgvector for real semantic search
- `storeInVectorMemory(text, metadata, source, userId)` - adds content to vector database
- Graceful fallback to legacy JSON knowledge base when vector memory unavailable
- Hybrid initialization: parallel loading of vector memory and JSON knowledge base

## External Dependencies
-   **PostgreSQL (Replit Database)**: Primary database for persistence (replacing Firebase Firestore), including pgvector extension for semantic search
-   **Groq API**: Utilized by the AI service for its functionality
-   **OpenAI API**: Used for embeddings generation (text-embedding-ada-002) in vector memory system
-   **Chokidar**: Integrated for real-time file system monitoring in the AI service
-   **React-Syntax-Highlighter**: Used for lightweight code preview

## Database Migrations
**Important**: Run migrations in sequence before deployment:
```bash
cd ai-service
psql $DATABASE_URL -f migrations/001_create_git_metrics_history.sql
psql $DATABASE_URL -f migrations/002_create_vector_memory.sql
```

Migration Status:
- ✅ `001_create_git_metrics_history.sql` - Git performance metrics persistence
- ✅ `002_create_vector_memory.sql` - pgvector extension and memory_embeddings table