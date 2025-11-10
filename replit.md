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

### Phase 2.2: UI Run Controls - Execute Tab in Developer Console ✅
Implemented visual code execution interface in Developer Console:
- **Components** (`ai-frontend/src/features/devconsole-v2/components/`):
  - `CodeExecutor.tsx` - full-featured code editor with execution controls
    - Code editor textarea with line count display
    - Execute button with loading states (Ctrl+Enter shortcut)
    - SSE streaming integration with `/api/ai/execute`
    - Real-time output/error display with copy/download actions
    - Security info box (128MB, 30s, blocked FS access)
    - Georgian/English language support
  - `ExecutionOutput.tsx` - real-time streaming output visualization
    - Auto-scroll to latest output
    - Separate rendering for stdout/stderr streams
    - Loading, success, error state indicators
    - Empty state with icon
- **SSE Parsing** (Fixed by Architect):
  - ✅ Proper event type tracking (stdout, stderr, complete, error)
  - ✅ ExecutionOutput renders during execution (not just after)
  - ✅ Loading spinner in header during execution
  - ✅ Fallback for legacy ad-hoc format
- **Integration**: Execute tab added to DevConsoleV2Container with Code icon
- **Status**: ✅ Production-ready (Architect approved)

### Phase 2.1: Workspace Executor - Secure Code Execution ✅
Implemented isolated-vm sandbox for secure JavaScript code execution:
- **Package**: `isolated-vm` - true V8 isolate-based sandboxing (replaces deprecated vm2 with 8+ critical CVEs)
- **Service** (`ai-service/services/workspace_executor.js`):
  - `SandboxPolicy` class - resource limits (128MB memory, 30s timeout), blocked globals validation
  - `ExecutionRunner` class - isolated-vm execution engine with event-driven stdout/stderr capture
  - Code validation: dangerous pattern detection (require, eval, Function, process, fs, network)
  - Security: true OS-level isolation, memory limit enforcement, clean isolate disposal
- **API Endpoints** (`ai-service/routes/execute.js`):
  - `POST /api/ai/execute` - Execute code with SSE streaming support
  - `GET /api/ai/execute/stats` - Execution service statistics
  - `GET /api/ai/execute/health` - Health check
- **SSE Streaming**: Event types - stdout, stderr, complete, error (with executionId filtering to prevent cross-execution leakage)
- **Security Hardening**:
  - ✅ Fixed critical SSE cross-execution leakage bug (executionId filtering)
  - ✅ Fixed validation error handling (immediate error events prevent client hangs)
  - ✅ Fixed non-streaming responses (mirrors runner success flag)
- **Integration**: Route mounted in server.js, service authentication required
- **Status**: ✅ Production-ready (Architect approved)

### Phase 1: Git Native Integration - Performance Monitoring ✅
Implemented PostgreSQL-backed Git metrics history storage:
- **Migration**: `001_create_git_metrics_history.sql` creates `git_metrics_history` table with operation type, duration, status, metadata, and timestamp tracking
- **Methods** (`ai-service/services/github_integration_service.js`): 
  - `storeMetricsHistory(operation, duration, status, metadata)` - persists Git operation metrics to PostgreSQL
  - `getRollingAverage(operation, limit)` - calculates rolling averages from last N **successful** operations (error-aware aggregation)
  - `checkPerformanceTrend()` - **NEW**: compares recent 5 ops vs baseline (ops 6-15), issues warning if >30% degradation or improvement
  - `calculateLatencyReduction()` - async method using PostgreSQL rolling averages (baseline: first 10 operations)
  - `getMetrics()` - enhanced to return in-memory metrics, rolling averages, **and trend analysis** (degradation/improvement alerts)
- **Integration**: All Git operations (commit, push, pull) now store metrics history on success and error
- **API Endpoint**: `GET /api/github/metrics` - returns full performance metrics with trend analysis
- **Frontend Dashboard**: `GitPerformanceMetrics.tsx` component in GitHubManagementHub
  - Real-time metrics visualization (commits, pushes, pulls)
  - Trend alerts with visual warnings (red for degradation, green for improvement)
  - Auto-refresh every 30 seconds
  - Rolling averages vs session averages comparison

### Phase 3: Vector Memory & Semantic Search
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

**4. Vector Memory API** (`ai-service/routes/vector_memory.js`) - ✅ Production-ready:
- **POST /api/ai/vector-memory/embeddings** - Store text with auto-embedding generation (max 10K chars)
- **POST /api/ai/vector-memory/search** - Semantic search with query text or raw embedding (max 100 results, 0.7 similarity threshold)
- **GET /api/ai/vector-memory/stats** - Vector memory statistics (total embeddings, sources, users)
- **GET /api/ai/vector-memory/:id** - Retrieve specific memory by ID
- **DELETE /api/ai/vector-memory/:id** - Delete specific memory by ID
- Security: requireAssistantAuth middleware on all endpoints
- Validation: Input length limits, type checking, ID validation
- Error handling: HTTP codes (400, 404, 500) with Georgian/English dual-language messages
- Service integration: Singleton instances (VectorMemoryService, EmbeddingsService) with proper success/error handling
- Route ordering: `/stats` before `/:id` to prevent Express route collision
- **Status**: ✅ Architect approved (production-ready)

**5. Vector Memory Frontend UI** (`ai-frontend/src/features/devconsole-v2/components/VectorMemory/`) - ✅ Production-ready:
- **useVectorMemory Hook** (`ai-frontend/src/hooks/useVectorMemory.ts`):
  - Custom hook for Vector Memory API client
  - Methods: `fetchStats`, `storeEmbedding`, `searchVector`, `getMemory`, `deleteMemory`
  - State management: stats, searchResults, loading, error
  - Auto-fetch stats on mount with error handling
- **VectorMemoryManager** - Main container component:
  - Integrates all panels (StatsOverview, MemoryTable, SearchWorkbench)
  - Memory detail modal with full entry data visualization
  - Error banner with dismiss functionality
  - Georgian/English dual-language support
- **StatsOverview Panel** - Visual statistics dashboard:
  - Color-coded gradient cards: total embeddings (blue), sources (purple), users (green), timeline (orange)
  - Real-time refresh button and loading states
  - Date formatting for oldest/newest entries
- **MemoryTable Panel** - Tabular memory display:
  - CRUD operations: view (Eye icon), delete (Trash icon with confirmation)
  - Similarity percentage badges for search results
  - Truncated text preview with full view modal
  - Source/user/created date columns with icons
- **SearchWorkbench Panel** - Semantic search interface:
  - Query input with validation (required, max length)
  - Advanced filters toggle: limit slider (1-100), threshold slider (0-100%), source filter, user filter
  - Clear button and search/loading states
  - Ctrl+Enter keyboard shortcut support
- **DevConsoleV2 Integration**:
  - Memory tab added with Brain icon (Lucide Brain component)
  - Responsive grid layout (2 columns on large screens, 1 on mobile)
  - Consistent styling with existing DevConsole tabs
- **Status**: ✅ Architect approved (production-ready)

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